import type { AdminActor } from '../auth/service.js';
import { fetchClientsForList, fetchEvents, fetchMatters } from '../shared.js';
import {
  createAuditEvent,
  createClientNotifications,
  resolveClientAccountByPublicId,
  resolveMatterByPublicId,
  touchMatterActivity,
} from '../writeSupport.js';
import { createPublicId } from '../../lib/authCrypto.js';
import { badRequest, notFound } from '../../lib/httpErrors.js';
import { executeStatement, queryRows, withTransaction, type QueryExecutor } from '../../lib/mysql.js';
import { env } from '../../config/env.js';
import type { RowDataPacket } from 'mysql2/promise';

type EventStateRow = RowDataPacket & {
  cancelledAt: string | null;
  clientAccountId: number;
  durationMinutes: number;
  eventTypeCode: string;
  externalMeetingId: string | null;
  id: number;
  joinUrl: string | null;
  locationText: string | null;
  matterId: number | null;
  modeCode: string;
  notes: string | null;
  publicId: string;
  scheduledEndAt: string;
  scheduledStartAt: string;
  statusCode: string;
  title: string;
  visibleToClient: number;
};

type ClientRecipientRow = RowDataPacket & { id: number };
type ExistingEventRow = RowDataPacket & { id: number; publicId: string };

const pad = (value: number) => String(value).padStart(2, '0');

const formatMysqlDateTime = (value: Date) =>
  `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(
    value.getHours()
  )}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;

const toMysqlDateTime = (date: string, time: string) => `${date} ${time}:00`;

const addMinutes = (date: string, time: string, minutes: number) => {
  const base = new Date(`${date}T${time}:00`);
  const end = new Date(base.getTime() + minutes * 60 * 1000);
  return formatMysqlDateTime(end);
};

const datePart = (value: string) => String(value).slice(0, 10);
const timePart = (value: string) => String(value).slice(11, 16);

const addMinutesToMysqlDateTime = (dateTime: string, minutes: number) => {
  const base = new Date(`${dateTime.replace(' ', 'T')}`);
  return formatMysqlDateTime(new Date(base.getTime() + minutes * 60 * 1000));
};

const subtractMinutesFromMysqlDateTime = (dateTime: string, minutes: number) => {
  const base = new Date(`${dateTime.replace(' ', 'T')}`);
  return formatMysqlDateTime(new Date(base.getTime() - minutes * 60 * 1000));
};

const isFutureMysqlDateTime = (dateTime: string) =>
  new Date(`${dateTime.replace(' ', 'T')}`).getTime() > Date.now();

const resolveEventByPublicId = async (eventPublicId: string, executor: QueryExecutor) => {
  const rows = await queryRows<EventStateRow>(
    `SELECT
       id,
       public_id AS publicId,
       client_account_id AS clientAccountId,
       matter_id AS matterId,
       title,
       event_type_code AS eventTypeCode,
       status_code AS statusCode,
       scheduled_start_at AS scheduledStartAt,
       scheduled_end_at AS scheduledEndAt,
       TIMESTAMPDIFF(MINUTE, scheduled_start_at, scheduled_end_at) AS durationMinutes,
       mode_code AS modeCode,
       location_text AS locationText,
       meeting_provider_code AS meetingProviderCode,
       external_meeting_id AS externalMeetingId,
       join_url AS joinUrl,
       client_visible_flag AS visibleToClient,
       notes,
       cancelled_at AS cancelledAt
     FROM events
     WHERE public_id = ?
     LIMIT 1
     FOR UPDATE`,
    [eventPublicId],
    executor
  );

  const event = rows[0];

  if (!event) {
    throw notFound('event_not_found', 'Event not found.');
  }

  return event;
};

const getClientRecipientUserIds = async (executor: QueryExecutor, clientAccountId: number) => {
  const rows = await queryRows<ClientRecipientRow>(
    `SELECT DISTINCT user_id AS id
     FROM client_account_contacts
     WHERE client_account_id = ?
       AND portal_access_enabled = 1
       AND archived_at IS NULL`,
    [clientAccountId],
    executor
  );

  return rows.map((row) => Number(row.id));
};

const cancelPendingReminders = async (
  executor: QueryExecutor,
  actor: AdminActor,
  eventId: number,
  reason: string
) => {
  const result = await executeStatement(
    `UPDATE event_reminders
     SET delivery_status_code = 'cancelled',
         failure_reason = ?,
         next_attempt_at = NULL,
         locked_at = NULL,
         locked_by = NULL,
         processed_at = UTC_TIMESTAMP(6)
     WHERE event_id = ?
       AND sent_at IS NULL
       AND delivery_status_code IN ('pending', 'failed', 'processing')`,
    [reason, eventId],
    executor
  );

  if (result.affectedRows > 0) {
    await createAuditEvent(
      {
        actionCode: 'event.reminder_cancelled',
        actionLabel: 'Event reminders cancelled',
        actorRoleCode: actor.roleCodes[0] || 'ops_admin',
        actorUserId: actor.userId,
        changes: [{ fieldName: 'pending_reminders', newValue: 'cancelled' }],
        entityPk: eventId,
        entityTableName: 'events',
        sourceModule: 'meetings_workspace',
        summaryNewValue: reason,
      },
      executor
    );
  }
};

const scheduleEventReminders = async (
  executor: QueryExecutor,
  actor: AdminActor,
  input: {
    clientAccountId: number;
    eventId: number;
    scheduledStartAt: string;
    visibleToClient: boolean;
  }
) => {
  await cancelPendingReminders(executor, actor, input.eventId, 'Event reminder schedule refreshed.');

  if (!input.visibleToClient) {
    return;
  }

  const recipientUserIds = await getClientRecipientUserIds(executor, input.clientAccountId);
  const reminderOffsets = [24 * 60, 60];
  let scheduledCount = 0;

  for (const recipientUserId of recipientUserIds) {
    for (const offsetMinutes of reminderOffsets) {
      const scheduledAt = subtractMinutesFromMysqlDateTime(input.scheduledStartAt, offsetMinutes);

      if (!isFutureMysqlDateTime(scheduledAt)) {
        continue;
      }

      await executeStatement(
        `INSERT INTO event_reminders (
           event_id,
           recipient_user_id,
           channel_code,
           scheduled_at,
           sent_at,
           delivery_status_code,
           failure_reason
         ) VALUES (?, ?, 'in_app', ?, NULL, 'pending', NULL)`,
        [input.eventId, recipientUserId, scheduledAt],
        executor
      );
      scheduledCount += 1;
    }
  }

  if (scheduledCount > 0) {
    await createAuditEvent(
      {
        actionCode: 'event.reminder_scheduled',
        actionLabel: 'Event reminders scheduled',
        actorRoleCode: actor.roleCodes[0] || 'ops_admin',
        actorUserId: actor.userId,
        changes: [{ fieldName: 'reminder_count', newValue: scheduledCount }],
        entityPk: input.eventId,
        entityTableName: 'events',
        sourceModule: 'meetings_workspace',
        summaryNewValue: `${scheduledCount} pending reminder(s)`,
      },
      executor
    );
  }
};

const recordCalendarSyncState = async (
  executor: QueryExecutor,
  actor: AdminActor,
  eventId: number,
  lifecycleAction: 'create' | 'update' | 'cancel'
) => {
  if (env.CALENDAR_SYNC_MODE !== 'google') {
    await executeStatement(
      `UPDATE events
       SET meeting_provider_code = CASE
             WHEN meeting_provider_code IN ('google-calendar-failed', 'google-calendar') THEN 'manual'
             ELSE meeting_provider_code
           END
       WHERE id = ?`,
      [eventId],
      executor
    );
    return 'local' as const;
  }

  await createAuditEvent(
    {
      actionCode: 'event.calendar_sync_requested',
      actionLabel: 'Calendar sync requested',
      actorRoleCode: actor.roleCodes[0] || 'ops_admin',
      actorUserId: actor.userId,
      changes: [{ fieldName: 'calendar_action', newValue: lifecycleAction }],
      entityPk: eventId,
      entityTableName: 'events',
      sourceModule: 'meetings_workspace',
      summaryNewValue: `Google Calendar sync requested for event ${lifecycleAction}.`,
    },
    executor
  );

  await executeStatement(
    `UPDATE events
     SET meeting_provider_code = 'google-calendar-failed'
     WHERE id = ?`,
    [eventId],
    executor
  );

  await createAuditEvent(
    {
      actionCode: 'event.calendar_sync_failed',
      actionLabel: 'Calendar sync failed',
      actorRoleCode: actor.roleCodes[0] || 'ops_admin',
      actorUserId: actor.userId,
      changes: [{ fieldName: 'calendar_sync_status', newValue: 'failed' }],
      entityPk: eventId,
      entityTableName: 'events',
      sourceModule: 'meetings_workspace',
      summaryNewValue:
        'Google Calendar integration is configured but no calendar sync client is implemented in this build. Event remains local/manual.',
    },
    executor
  );

  return 'failed' as const;
};

export const getWorkspace = async () => {
  const [clientsResponse, events, matters] = await Promise.all([
    fetchClientsForList({ limit: 100, offset: 0 }),
    fetchEvents({ includeCancelled: true }),
    fetchMatters({ limit: 100 }),
  ]);

  return {
    clients: clientsResponse,
    events,
    matters,
  };
};

export const createEvent = async (
  actor: AdminActor,
  payload: {
    clientAccountId?: string;
    date: string;
    durationMinutes?: number;
    matterId?: string;
    meetLink?: string;
    mode: string;
    notes?: string;
    time: string;
    title: string;
    type: string;
    visibleToClient?: boolean;
  }
) => {
  return withTransaction(async (connection) => {
    const matter = payload.matterId
      ? await resolveMatterByPublicId(payload.matterId, connection)
      : null;
    const clientAccount =
      payload.clientAccountId && !matter
        ? await resolveClientAccountByPublicId(payload.clientAccountId, connection)
        : matter
          ? { id: matter.clientAccountId }
          : null;

    if (!clientAccount) {
      throw new Error('Client account is required to create an event.');
    }

    const scheduledStartAt = toMysqlDateTime(payload.date, payload.time);
    const scheduledEndAt = addMinutes(
      payload.date,
      payload.time,
      Math.max(payload.durationMinutes || 60, 15)
    );
    const visibleToClient = payload.visibleToClient !== false;
    const existingRows = await queryRows<ExistingEventRow>(
      `SELECT id, public_id AS publicId
       FROM events
       WHERE client_account_id = ?
         AND matter_id <=> ?
         AND title = ?
         AND scheduled_start_at = ?
         AND cancelled_at IS NULL
       LIMIT 1
       FOR UPDATE`,
      [clientAccount.id, matter?.id || null, payload.title, scheduledStartAt],
      connection
    );

    if (existingRows[0]) {
      return { eventId: existingRows[0].publicId, status: 'created' as const };
    }

    const result = await executeStatement(
      `INSERT INTO events (
         public_id,
         client_account_id,
         matter_id,
         title,
         event_type_code,
         status_code,
         scheduled_start_at,
         scheduled_end_at,
         timezone_name,
         mode_code,
         location_text,
         meeting_provider_code,
         external_meeting_id,
         join_url,
         host_url,
         client_visible_flag,
         notes,
         created_by_user_id,
         cancelled_by_user_id,
         created_at,
         updated_at
       ) VALUES (
         ?, ?, ?, ?, ?, 'upcoming', ?, ?, 'Asia/Kolkata', ?, ?, ?, NULL, ?, NULL, ?, ?, ?, NULL,
         UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
       )`,
      [
        createPublicId(),
        clientAccount.id,
        matter?.id || null,
        payload.title,
        payload.type,
        scheduledStartAt,
        scheduledEndAt,
        payload.mode,
        payload.mode === 'video' ? 'Video Conference' : null,
        'manual',
        payload.meetLink || null,
        visibleToClient ? 1 : 0,
        payload.notes || null,
        actor.userId,
      ],
      connection
    );
    const eventId = Number(result.insertId);

    await recordCalendarSyncState(connection, actor, eventId, 'create');
    await scheduleEventReminders(connection, actor, {
      clientAccountId: clientAccount.id,
      eventId,
      scheduledStartAt,
      visibleToClient,
    });

    if (matter) {
      await touchMatterActivity(matter.id, connection);
    }

    await createAuditEvent(
      {
        actionCode: 'event.created',
        actionLabel: 'Event created',
        actorRoleCode: actor.roleCodes[0] || 'ops_admin',
        actorUserId: actor.userId,
        changes: [
          { fieldName: 'title', newValue: payload.title },
          { fieldName: 'type', newValue: payload.type },
          { fieldName: 'scheduled_start_at', newValue: scheduledStartAt },
        ],
        entityPk: eventId,
        entityTableName: 'events',
        sourceModule: 'meetings_workspace',
        summaryNewValue: `${payload.title} on ${payload.date} ${payload.time}`,
      },
      connection
    );

    if (visibleToClient) {
      await createClientNotifications(
        {
          bodyText: `A new event has been scheduled for ${payload.date} at ${payload.time}.`,
          clientAccountId: clientAccount.id,
          eventId,
          matterId: matter?.id || null,
          notificationTypeCode: 'event_reminder',
          priorityCode: 'normal',
          title: payload.title,
        },
        connection
      );
    }

    const eventPublicRow = await queryRows<ExistingEventRow>(
      'SELECT public_id AS publicId, id FROM events WHERE id = ? LIMIT 1',
      [eventId],
      connection
    );

    return { eventId: eventPublicRow[0]?.publicId || '', status: 'created' as const };
  });
};

export const updateEvent = async (
  actor: AdminActor,
  eventPublicId: string,
  payload: {
    clientAccountId?: string;
    date?: string;
    durationMinutes?: number;
    matterId?: string | null;
    meetLink?: string | null;
    mode?: string;
    notes?: string | null;
    time?: string;
    title?: string;
    type?: string;
    visibleToClient?: boolean;
  }
) => {
  return withTransaction(async (connection) => {
    const event = await resolveEventByPublicId(eventPublicId, connection);

    if (event.cancelledAt || event.statusCode === 'cancelled') {
      throw badRequest('event_cancelled', 'Cancelled events cannot be updated.');
    }

    const matter =
      payload.matterId === undefined
        ? null
        : payload.matterId
          ? await resolveMatterByPublicId(payload.matterId, connection)
          : null;
    const clientAccount =
      matter
        ? { id: matter.clientAccountId }
        : payload.clientAccountId
          ? await resolveClientAccountByPublicId(payload.clientAccountId, connection)
          : { id: event.clientAccountId };
    const nextMatterId =
      payload.matterId === undefined ? event.matterId : matter ? matter.id : null;
    const nextDate = payload.date || datePart(event.scheduledStartAt);
    const nextTime = payload.time || timePart(event.scheduledStartAt);
    const nextStartAt = toMysqlDateTime(nextDate, nextTime);
    const nextDuration = Math.max(payload.durationMinutes || event.durationMinutes || 60, 15);
    const nextEndAt = addMinutesToMysqlDateTime(nextStartAt, nextDuration);
    const nextMode = payload.mode || event.modeCode;
    const shouldClearJoinUrl = nextMode !== 'video';
    const hasMeetLinkPatch = Object.prototype.hasOwnProperty.call(payload, 'meetLink');
    const nextJoinUrl = shouldClearJoinUrl
      ? null
      : hasMeetLinkPatch
        ? payload.meetLink || null
        : event.joinUrl;
    const nextVisibleToClient =
      payload.visibleToClient === undefined
        ? Boolean(event.visibleToClient)
        : payload.visibleToClient;

    await executeStatement(
      `UPDATE events
       SET client_account_id = ?,
           matter_id = ?,
           title = ?,
           event_type_code = ?,
           scheduled_start_at = ?,
           scheduled_end_at = ?,
           mode_code = ?,
           location_text = ?,
           meeting_provider_code = 'manual',
           external_meeting_id = NULL,
           join_url = ?,
           host_url = NULL,
           client_visible_flag = ?,
           notes = ?,
           status_code = CASE WHEN status_code = 'rescheduled' THEN 'rescheduled' ELSE status_code END,
           updated_at = UTC_TIMESTAMP(6),
           row_version = row_version + 1
       WHERE id = ?`,
      [
        clientAccount.id,
        nextMatterId,
        payload.title || event.title,
        payload.type || event.eventTypeCode,
        nextStartAt,
        nextEndAt,
        nextMode,
        nextMode === 'video' ? 'Video Conference' : null,
        nextJoinUrl,
        nextVisibleToClient ? 1 : 0,
        payload.notes === undefined ? event.notes : payload.notes || null,
        event.id,
      ],
      connection
    );

    await recordCalendarSyncState(connection, actor, event.id, 'update');
    await scheduleEventReminders(connection, actor, {
      clientAccountId: clientAccount.id,
      eventId: event.id,
      scheduledStartAt: nextStartAt,
      visibleToClient: nextVisibleToClient,
    });

    if (nextMatterId) {
      await touchMatterActivity(nextMatterId, connection);
    }

    await createAuditEvent(
      {
        actionCode: 'event.updated',
        actionLabel: 'Event updated',
        actorRoleCode: actor.roleCodes[0] || 'ops_admin',
        actorUserId: actor.userId,
        changes: [
          { fieldName: 'title', oldValue: event.title, newValue: payload.title || event.title },
          {
            fieldName: 'scheduled_start_at',
            oldValue: event.scheduledStartAt,
            newValue: nextStartAt,
          },
          {
            fieldName: 'client_visible_flag',
            oldValue: Boolean(event.visibleToClient),
            newValue: nextVisibleToClient,
          },
        ],
        entityPk: event.id,
        entityTableName: 'events',
        sourceModule: 'meetings_workspace',
        summaryNewValue: `${payload.title || event.title} on ${nextDate} ${nextTime}`,
        summaryOldValue: `${event.title} on ${datePart(event.scheduledStartAt)} ${timePart(event.scheduledStartAt)}`,
      },
      connection
    );

    if (nextVisibleToClient) {
      await createClientNotifications(
        {
          bodyText: `Event updated for ${nextDate} at ${nextTime}.`,
          clientAccountId: clientAccount.id,
          eventId: event.id,
          matterId: nextMatterId,
          notificationTypeCode: 'event_reminder',
          priorityCode: 'normal',
          title: payload.title || event.title,
        },
        connection
      );
    }

    return { eventId: event.publicId, status: 'updated' as const };
  });
};

export const cancelEvent = async (
  actor: AdminActor,
  eventPublicId: string,
  payload: { reason?: string }
) => {
  return withTransaction(async (connection) => {
    const event = await resolveEventByPublicId(eventPublicId, connection);

    if (event.cancelledAt || event.statusCode === 'cancelled') {
      return { eventId: event.publicId, status: 'cancelled' as const };
    }

    await executeStatement(
      `UPDATE events
       SET status_code = 'cancelled',
           cancelled_by_user_id = ?,
           cancelled_at = UTC_TIMESTAMP(6),
           updated_at = UTC_TIMESTAMP(6),
           row_version = row_version + 1
       WHERE id = ?`,
      [actor.userId, event.id],
      connection
    );

    await cancelPendingReminders(connection, actor, event.id, 'Event cancelled.');
    await recordCalendarSyncState(connection, actor, event.id, 'cancel');

    if (event.matterId) {
      await touchMatterActivity(event.matterId, connection);
    }

    await createAuditEvent(
      {
        actionCode: 'event.cancelled',
        actionLabel: 'Event cancelled',
        actorRoleCode: actor.roleCodes[0] || 'ops_admin',
        actorUserId: actor.userId,
        changes: [
          { fieldName: 'status_code', oldValue: event.statusCode, newValue: 'cancelled' },
          { fieldName: 'reason', newValue: payload.reason || null },
        ],
        entityPk: event.id,
        entityTableName: 'events',
        sourceModule: 'meetings_workspace',
        summaryNewValue: payload.reason || 'Event cancelled',
        summaryOldValue: event.statusCode,
      },
      connection
    );

    if (event.visibleToClient) {
      await createClientNotifications(
        {
          bodyText: payload.reason
            ? `The scheduled event was cancelled. Reason: ${payload.reason}`
            : 'The scheduled event was cancelled.',
          clientAccountId: event.clientAccountId,
          eventId: event.id,
          matterId: event.matterId,
          notificationTypeCode: 'event_reminder',
          priorityCode: 'normal',
          title: `${event.title} cancelled`,
        },
        connection
      );
    }

    return { eventId: event.publicId, status: 'cancelled' as const };
  });
};
