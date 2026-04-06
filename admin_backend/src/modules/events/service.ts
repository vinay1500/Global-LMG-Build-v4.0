import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { createPublicId } from '../../lib/ids.js';
import { getMysqlPool } from '../../lib/mysql.js';
import { notFound } from '../../lib/httpErrors.js';
import { executeResult, selectAll, selectOne, withConnection, withTransaction } from '../../lib/mysqlUtils.js';
import { fromMysqlDateTime, nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { env } from '../../config/env.js';
import { domainService } from '../domain/service.js';
import { adminNotificationService } from '../notifications/service.js';
import { adminJobQueue } from '../scheduler/jobQueue.js';
import { runReminderTick } from '../scheduler/service.js';
import type { EventLifecycleJobPayload } from './lifecycleWorker.js';

const participantSchema = z.object({
  internalUserId: z.string().trim().min(2).max(64).optional(),
  participantRoleCode: z.string().trim().min(2).max(64).default('participant'),
});

const eventMutationSchema = z.object({
  clientAccountId: z.string().trim().min(2).max(64),
  clientVisibleFlag: z.boolean().default(true),
  locationText: z.string().trim().max(255).optional(),
  matterId: z.string().trim().min(2).max(64).optional(),
  modeCode: z.enum(['video', 'phone', 'in-person']),
  notes: z.string().trim().max(4000).optional(),
  participants: z.array(participantSchema).max(20).optional(),
  scheduledEndAt: z.string().trim().datetime(),
  scheduledStartAt: z.string().trim().datetime(),
  statusCode: z.enum(['upcoming', 'rescheduled', 'completed', 'cancelled']).default('upcoming'),
  timezoneName: z.string().trim().min(2).max(64).default('Asia/Kolkata'),
  title: z.string().trim().min(2).max(255),
  typeCode: z.string().trim().min(2).max(64),
});

const cancelEventSchema = z.object({
  reasonText: z.string().trim().min(2).max(2000).optional(),
});

interface EventListRow extends RowDataPacket {
  client_display_name: string;
  client_public_id: string;
  matter_public_id: string | null;
  matter_title: string | null;
  meeting_provider_code: string;
  mode_code: string;
  public_id: string;
  scheduled_end_at: string;
  scheduled_start_at: string;
  status_code: string;
  title: string;
}

interface ParticipantRecord {
  email: string;
  userId: number;
}

interface EventReminderRow extends RowDataPacket {
  channel_code: string;
  delivery_status_code: string;
  id: number;
  scheduled_at: string;
  sent_at: string | null;
}

interface ExistingEventRow extends RowDataPacket {
  client_account_id: number;
  external_meeting_id: string | null;
  id: number;
  matter_id: number | null;
  public_id: string;
}

const loadClientParticipants = async (connection: PoolConnection, clientAccountId: number) => {
  const recipients = await adminNotificationService.listClientRecipients(connection, clientAccountId);
  return recipients.map((recipient) => ({
    email: recipient.email,
    userId: recipient.userId,
  })) satisfies ParticipantRecord[];
};

const loadInternalParticipants = async (
  connection: PoolConnection,
  actorUserId: number,
  participants: Array<z.infer<typeof participantSchema>>
) => {
  const userIds = new Set<number>([actorUserId]);

  for (const participant of participants) {
    if (!participant.internalUserId) {
      continue;
    }

    const user = await selectOne<RowDataPacket>(
      connection,
      'SELECT id FROM users WHERE public_id = ? LIMIT 1',
      [participant.internalUserId]
    );

    if (user?.id) {
      userIds.add(Number(user.id));
    }
  }

  const resolved = await adminNotificationService.listInternalRecipients(connection, [...userIds]);
  return resolved.map((recipient) => ({
    email: recipient.email,
    userId: recipient.userId,
  })) satisfies ParticipantRecord[];
};

const resolveMatterForClient = async (
  connection: PoolConnection,
  clientAccountId: number,
  matterPublicId?: string
) => {
  if (!matterPublicId) {
    return null;
  }

  const matter = await selectOne<RowDataPacket>(
    connection,
    `SELECT id
     FROM matters
     WHERE public_id = ?
       AND client_account_id = ?
       AND archived_at IS NULL
     LIMIT 1`,
    [matterPublicId, clientAccountId]
  );

  if (!matter?.id) {
    throw notFound('matter_not_found', 'Matter was not found for the selected client account.');
  }

  return Number(matter.id);
};

const rebuildReminderRows = async (
  connection: PoolConnection,
  eventId: number,
  recipientUserIds: number[],
  scheduledStartAt: string,
  enabled: boolean
) => {
  await connection.execute(
    `DELETE FROM event_reminders
     WHERE event_id = ?
       AND sent_at IS NULL`,
    [eventId]
  );

  const uniqueRecipientUserIds = [...new Set(recipientUserIds)];

  if (!enabled || uniqueRecipientUserIds.length === 0) {
    return;
  }

  for (const recipientUserId of uniqueRecipientUserIds) {
    for (const offsetMinutes of env.MEETING_REMINDER_OFFSETS) {
      const reminderAt = new Date(new Date(scheduledStartAt).getTime() - offsetMinutes * 60_000);
      if (reminderAt.getTime() <= Date.now()) {
        continue;
      }

      await connection.execute(
        `INSERT INTO event_reminders (
          event_id,
          recipient_user_id,
          channel_code,
          scheduled_at,
          sent_at,
          delivery_status_code,
          failure_reason,
          attempt_count,
          lease_token,
          claimed_at,
          lease_expires_at,
          provider_reference
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eventId,
          recipientUserId,
          'email',
          toMysqlDateTime(reminderAt.toISOString()),
          null,
          'scheduled',
          null,
          0,
          null,
          null,
          null,
          null,
        ]
      );
    }
  }
};

const replaceEventParticipants = async (
  connection: PoolConnection,
  eventId: number,
  clientRecipients: ParticipantRecord[],
  adminRecipients: ParticipantRecord[],
  timestamp: string
) => {
  await connection.execute('DELETE FROM event_participants WHERE event_id = ?', [eventId]);

  for (const recipient of clientRecipients) {
    await connection.execute(
      `INSERT INTO event_participants (
        event_id, participant_role_code, internal_user_id, client_contact_user_id, counsel_partner_id,
        rsvp_status_code, attendance_status_code, joined_at, left_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [eventId, 'client', null, recipient.userId, null, 'pending', 'scheduled', null, null, timestamp]
    );
  }

  for (const recipient of adminRecipients) {
    await connection.execute(
      `INSERT INTO event_participants (
        event_id, participant_role_code, internal_user_id, client_contact_user_id, counsel_partner_id,
        rsvp_status_code, attendance_status_code, joined_at, left_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [eventId, 'internal_admin', recipient.userId, null, null, 'accepted', 'scheduled', null, null, timestamp]
    );
  }
};

const enqueueLifecycleJob = async (
  connection: PoolConnection,
  payload: EventLifecycleJobPayload,
  dedupeKey: string
) => {
  await adminJobQueue.enqueueInTransaction(connection, {
    dedupeKey,
    payload,
    typeCode: 'event_lifecycle',
  });
};

export const adminEventService = {
  cancelEventSchema,
  eventMutationSchema,

  async listEvents() {
    return withConnection(getMysqlPool(), async (connection) => {
      const rows = await selectAll<EventListRow>(
        connection,
        `SELECT
           e.public_id,
           e.title,
           e.status_code,
           e.scheduled_start_at,
           e.scheduled_end_at,
           e.mode_code,
           e.meeting_provider_code,
           ca.public_id AS client_public_id,
           ca.display_name AS client_display_name,
           m.public_id AS matter_public_id,
           m.title AS matter_title
         FROM events e
         INNER JOIN client_accounts ca
           ON ca.id = e.client_account_id
         LEFT JOIN matters m
           ON m.id = e.matter_id
         ORDER BY e.scheduled_start_at DESC`
      );

      return rows.map((row) => ({
        clientAccountId: row.client_public_id,
        clientName: row.client_display_name,
        id: row.public_id,
        matterId: row.matter_public_id,
        matterTitle: row.matter_title,
        meetingProviderCode: row.meeting_provider_code,
        modeCode: row.mode_code,
        scheduledEndAt: fromMysqlDateTime(row.scheduled_end_at),
        scheduledStartAt: fromMysqlDateTime(row.scheduled_start_at),
        statusCode: row.status_code,
        title: row.title,
      }));
    });
  },

  async getEvent(eventPublicId: string) {
    const detail = await domainService.getEventByPublicId(eventPublicId);

    return withConnection(getMysqlPool(), async (connection) => {
      const reminders = await selectAll<EventReminderRow>(
        connection,
        `SELECT
           id,
           channel_code,
           scheduled_at,
           sent_at,
           delivery_status_code
         FROM event_reminders
         WHERE event_id = (SELECT id FROM events WHERE public_id = ? LIMIT 1)
         ORDER BY scheduled_at ASC`,
        [eventPublicId]
      );

      return {
        ...detail,
        reminders: reminders.map((entry) => ({
          channelCode: entry.channel_code,
          deliveryStatusCode: entry.delivery_status_code,
          id: entry.id,
          scheduledAt: fromMysqlDateTime(entry.scheduled_at),
          sentAt: fromMysqlDateTime(entry.sent_at),
        })),
      };
    });
  },

  async createEvent(
    actorUserId: number,
    actorRoleCode: string,
    input: z.infer<typeof eventMutationSchema>
  ) {
    const payload = eventMutationSchema.parse(input);

    const result = await withTransaction(getMysqlPool(), async (connection) => {
      const clientAccount = await selectOne<RowDataPacket>(
        connection,
        'SELECT id FROM client_accounts WHERE public_id = ? LIMIT 1',
        [payload.clientAccountId]
      );

      if (!clientAccount?.id) {
        throw notFound('client_account_not_found', 'Client account not found.');
      }

      const clientAccountId = Number(clientAccount.id);
      const matterId = await resolveMatterForClient(connection, clientAccountId, payload.matterId);
      const clientRecipients = payload.clientVisibleFlag
        ? await loadClientParticipants(connection, clientAccountId)
        : [];
      const adminRecipients = await loadInternalParticipants(
        connection,
        actorUserId,
        payload.participants || []
      );
      const timestamp = toMysqlDateTime(nowUtc());

      const insert = await executeResult(
        connection,
        `INSERT INTO events (
          public_id, client_account_id, matter_id, title, event_type_code, status_code, scheduled_start_at,
          scheduled_end_at, timezone_name, mode_code, location_text, meeting_provider_code,
          external_meeting_id, join_url, host_url, client_visible_flag, notes, created_by_user_id,
          cancelled_by_user_id, created_at, updated_at, cancelled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createPublicId(),
          clientAccountId,
          matterId,
          payload.title,
          payload.typeCode,
          payload.statusCode,
          toMysqlDateTime(payload.scheduledStartAt),
          toMysqlDateTime(payload.scheduledEndAt),
          payload.timezoneName,
          payload.modeCode,
          payload.locationText || null,
          'none',
          null,
          null,
          null,
          payload.clientVisibleFlag ? 1 : 0,
          payload.notes || null,
          actorUserId,
          null,
          timestamp,
          timestamp,
          null,
        ]
      );

      const eventId = Number(insert.insertId);

      await replaceEventParticipants(connection, eventId, clientRecipients, adminRecipients, timestamp);
      await rebuildReminderRows(
        connection,
        eventId,
        [...clientRecipients, ...adminRecipients].map((recipient) => recipient.userId),
        payload.scheduledStartAt,
        ['upcoming', 'rescheduled'].includes(payload.statusCode)
      );

      await adminNotificationService.insertAuditEvent(connection, {
        actionCode: 'event_scheduled',
        actionLabel: 'Event scheduled',
        actorRoleCodeSnapshot: actorRoleCode,
        actorUserId,
        entityPk: eventId,
        entityTableName: 'events',
        sourceModule: 'Admin Events',
        summaryNewValue: payload.title,
      });

      const row = await selectOne<RowDataPacket>(
        connection,
        'SELECT public_id FROM events WHERE id = ? LIMIT 1',
        [eventId]
      );

      const eventPublicId = String(row?.public_id || '');
      await enqueueLifecycleJob(
        connection,
        {
          actionLabel: 'scheduled',
          eventId,
          eventUpdatedAt: fromMysqlDateTime(timestamp) || timestamp,
        },
        `event:${eventPublicId}:scheduled:${timestamp}`
      );

      return {
        eventId: eventPublicId,
      };
    });

    void runReminderTick().catch(() => undefined);
    return result;
  },

  async updateEvent(
    actorUserId: number,
    actorRoleCode: string,
    eventPublicId: string,
    input: z.infer<typeof eventMutationSchema>
  ) {
    const payload = eventMutationSchema.parse(input);

    const result = await withTransaction(getMysqlPool(), async (connection) => {
      const eventRow = await selectOne<ExistingEventRow>(
        connection,
        `SELECT id, client_account_id, matter_id, external_meeting_id, public_id
         FROM events
         WHERE public_id = ?
         LIMIT 1`,
        [eventPublicId]
      );

      if (!eventRow?.id) {
        throw notFound('event_not_found', 'Event not found.');
      }

      const clientAccount = await selectOne<RowDataPacket>(
        connection,
        'SELECT id FROM client_accounts WHERE public_id = ? LIMIT 1',
        [payload.clientAccountId]
      );

      if (!clientAccount?.id) {
        throw notFound('client_account_not_found', 'Client account not found.');
      }

      const clientAccountId = Number(clientAccount.id);
      const matterId = await resolveMatterForClient(connection, clientAccountId, payload.matterId);
      const clientRecipients = payload.clientVisibleFlag
        ? await loadClientParticipants(connection, clientAccountId)
        : [];
      const adminRecipients = await loadInternalParticipants(
        connection,
        actorUserId,
        payload.participants || []
      );
      const timestamp = toMysqlDateTime(nowUtc());

      await connection.execute(
        `UPDATE events
         SET client_account_id = ?,
             title = ?,
             matter_id = ?,
             event_type_code = ?,
             status_code = ?,
             scheduled_start_at = ?,
             scheduled_end_at = ?,
             timezone_name = ?,
             mode_code = ?,
             location_text = ?,
             meeting_provider_code = ?,
             external_meeting_id = NULL,
             join_url = NULL,
             host_url = NULL,
             client_visible_flag = ?,
             notes = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          clientAccountId,
          payload.title,
          matterId,
          payload.typeCode,
          payload.statusCode === 'cancelled' ? 'rescheduled' : payload.statusCode,
          toMysqlDateTime(payload.scheduledStartAt),
          toMysqlDateTime(payload.scheduledEndAt),
          payload.timezoneName,
          payload.modeCode,
          payload.locationText || null,
          'none',
          payload.clientVisibleFlag ? 1 : 0,
          payload.notes || null,
          timestamp,
          Number(eventRow.id),
        ]
      );

      await replaceEventParticipants(
        connection,
        Number(eventRow.id),
        clientRecipients,
        adminRecipients,
        timestamp
      );
      await rebuildReminderRows(
        connection,
        Number(eventRow.id),
        [...clientRecipients, ...adminRecipients].map((recipient) => recipient.userId),
        payload.scheduledStartAt,
        ['upcoming', 'rescheduled'].includes(payload.statusCode)
      );

      await adminNotificationService.insertAuditEvent(connection, {
        actionCode: 'event_updated',
        actionLabel: 'Event updated',
        actorRoleCodeSnapshot: actorRoleCode,
        actorUserId,
        entityPk: Number(eventRow.id),
        entityTableName: 'events',
        sourceModule: 'Admin Events',
        summaryNewValue: payload.title,
      });

      await enqueueLifecycleJob(
        connection,
        {
          actionLabel: 'rescheduled',
          eventId: Number(eventRow.id),
          eventUpdatedAt: fromMysqlDateTime(timestamp) || timestamp,
          previousExternalMeetingId: eventRow.external_meeting_id,
        },
        `event:${eventRow.public_id}:rescheduled:${timestamp}`
      );

      return {
        eventId: eventPublicId,
      };
    });

    void runReminderTick().catch(() => undefined);
    return result;
  },

  async cancelEvent(
    actorUserId: number,
    actorRoleCode: string,
    eventPublicId: string,
    input: z.infer<typeof cancelEventSchema>
  ) {
    const payload = cancelEventSchema.parse(input);

    const result = await withTransaction(getMysqlPool(), async (connection) => {
      const eventRow = await selectOne<RowDataPacket>(
        connection,
        `SELECT id, public_id, external_meeting_id
         FROM events
         WHERE public_id = ?
         LIMIT 1`,
        [eventPublicId]
      );

      if (!eventRow?.id) {
        throw notFound('event_not_found', 'Event not found.');
      }

      const timestamp = toMysqlDateTime(nowUtc());

      await connection.execute(
        `UPDATE events
         SET status_code = 'cancelled',
             cancelled_at = ?,
             cancelled_by_user_id = ?,
             updated_at = ?
         WHERE id = ?`,
        [timestamp, actorUserId, timestamp, Number(eventRow.id)]
      );

      await connection.execute(
        `UPDATE event_reminders
         SET sent_at = ?,
             delivery_status_code = 'cancelled',
             failure_reason = ?,
             lease_token = NULL,
             claimed_at = NULL,
             lease_expires_at = NULL
         WHERE event_id = ?
           AND sent_at IS NULL`,
        [timestamp, payload.reasonText || 'cancelled', Number(eventRow.id)]
      );

      await adminNotificationService.insertAuditEvent(connection, {
        actionCode: 'event_cancelled',
        actionLabel: 'Event cancelled',
        actorRoleCodeSnapshot: actorRoleCode,
        actorUserId,
        entityPk: Number(eventRow.id),
        entityTableName: 'events',
        sourceModule: 'Admin Events',
        summaryNewValue: payload.reasonText || 'cancelled',
      });

      await enqueueLifecycleJob(
        connection,
        {
          actionLabel: 'cancelled',
          eventId: Number(eventRow.id),
          eventUpdatedAt: fromMysqlDateTime(timestamp) || timestamp,
          previousExternalMeetingId: typeof eventRow.external_meeting_id === 'string'
            ? eventRow.external_meeting_id
            : null,
        },
        `event:${eventRow.public_id}:cancelled:${timestamp}`
      );

      return {
        eventId: eventPublicId,
        statusCode: 'cancelled',
      };
    });

    void runReminderTick().catch(() => undefined);
    return result;
  },
};
