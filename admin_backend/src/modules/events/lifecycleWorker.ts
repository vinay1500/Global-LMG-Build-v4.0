import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { fromMysqlDateTime, nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { getMysqlPool } from '../../lib/mysql.js';
import { executeResult, selectAll, selectOne, withConnection, withTransaction } from '../../lib/mysqlUtils.js';
import { adminNotificationService } from '../notifications/service.js';
import { transactionalEmailService } from '../notifications/emailService.js';
import { adminCalendarSyncService } from './calendarSync.js';

export interface EventLifecycleJobPayload {
  actionLabel: 'scheduled' | 'rescheduled' | 'cancelled';
  eventId: number;
  eventUpdatedAt: string;
  previousExternalMeetingId?: string | null;
}

interface EventLifecycleRow extends RowDataPacket {
  client_account_id: number;
  client_visible_flag: number;
  external_meeting_id: string | null;
  host_url: string | null;
  id: number;
  join_url: string | null;
  location_text: string | null;
  matter_id: number | null;
  mode_code: string;
  notes: string | null;
  public_id: string;
  scheduled_end_at: string;
  scheduled_start_at: string;
  status_code: string;
  timezone_name: string;
  title: string;
  updated_at: string;
}

interface EventInternalRecipientRow extends RowDataPacket {
  email: string;
  user_id: number;
}

const buildLifecycleEmail = (input: {
  actionLabel: 'scheduled' | 'rescheduled' | 'cancelled';
  joinUrl?: string | null;
  locationText?: string | null;
  modeCode: string;
  notes?: string | null;
  scheduledEndAt: string;
  scheduledStartAt: string;
  title: string;
}) => {
  const intro =
    input.actionLabel === 'scheduled'
      ? 'A meeting has been scheduled for your matter.'
      : input.actionLabel === 'rescheduled'
        ? 'A meeting on your matter has been rescheduled.'
        : 'A meeting on your matter has been cancelled.';

  const meetingLine =
    input.modeCode === 'video'
      ? input.joinUrl
        ? `Join link: ${input.joinUrl}`
        : 'Join link will be shared by the Global LMG team.'
      : input.modeCode === 'phone'
        ? `Phone instructions: ${input.locationText || input.notes || 'Global LMG will share the dial-in details.'}`
        : `Location: ${input.locationText || input.notes || 'Global LMG will confirm the in-person venue.'}`;

  return {
    subject: `Global LMG meeting ${input.actionLabel}: ${input.title}`,
    text: [
      intro,
      '',
      `Title: ${input.title}`,
      `Start: ${input.scheduledStartAt}`,
      `End: ${input.scheduledEndAt}`,
      `Mode: ${input.modeCode}`,
      meetingLine,
      input.notes ? `Notes: ${input.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  };
};

const listInternalRecipientsForEvent = async (connection: PoolConnection, eventId: number) => {
  const rows = await selectAll<EventInternalRecipientRow>(
    connection,
    `SELECT DISTINCT
       u.id AS user_id,
       u.email
     FROM event_participants ep
     INNER JOIN users u
       ON u.id = ep.internal_user_id
     WHERE ep.event_id = ?
       AND ep.internal_user_id IS NOT NULL
       AND u.archived_at IS NULL`,
    [eventId]
  );

  return rows.map((row) => ({
    email: row.email,
    userId: Number(row.user_id),
  }));
};

const loadEventContext = async (connection: PoolConnection, eventId: number) => {
  const event = await selectOne<EventLifecycleRow>(
    connection,
    `SELECT
       id,
       public_id,
       client_account_id,
       matter_id,
       title,
       status_code,
       scheduled_start_at,
       scheduled_end_at,
       updated_at,
        timezone_name,
       mode_code,
       location_text,
       join_url,
       host_url,
       external_meeting_id,
       client_visible_flag,
       notes
     FROM events
     WHERE id = ?
     LIMIT 1`,
    [eventId]
  );

  if (!event?.id) {
    return null;
  }

  const clientRecipients = event.client_visible_flag
    ? await adminNotificationService.listClientRecipients(connection, Number(event.client_account_id))
    : [];
  const internalRecipients = await listInternalRecipientsForEvent(connection, Number(event.id));

  return {
    clientRecipients,
    event,
    internalRecipients,
  };
};

const syncCalendarState = async (
  payload: EventLifecycleJobPayload,
  event: EventLifecycleRow,
  attendees: Array<{ email: string }>
) => {
  const existingExternalMeetingId = event.external_meeting_id || payload.previousExternalMeetingId || null;

  if (payload.actionLabel === 'cancelled' || event.mode_code !== 'video') {
    if (existingExternalMeetingId) {
      await adminCalendarSyncService.cancelMeeting(existingExternalMeetingId);
    }

    return {
      externalEventId: null,
      hostUrl: null,
      joinUrl: null,
      providerCode: 'none',
    };
  }

  if (existingExternalMeetingId) {
    return adminCalendarSyncService.updateMeeting(existingExternalMeetingId, {
      attendees,
      description: event.notes || undefined,
      endAt: fromMysqlDateTime(event.scheduled_end_at) || event.scheduled_end_at,
      locationText: event.location_text,
      startAt: fromMysqlDateTime(event.scheduled_start_at) || event.scheduled_start_at,
      timeZone: event.timezone_name,
      title: event.title,
    });
  }

  return adminCalendarSyncService.createMeeting({
    attendees,
    description: event.notes || undefined,
    endAt: fromMysqlDateTime(event.scheduled_end_at) || event.scheduled_end_at,
    locationText: event.location_text,
    startAt: fromMysqlDateTime(event.scheduled_start_at) || event.scheduled_start_at,
    timeZone: event.timezone_name,
    title: event.title,
  });
};

export const processEventLifecycleJob = async (payload: EventLifecycleJobPayload) => {
  const eventContext = await withConnection(getMysqlPool(), async (connection) =>
    loadEventContext(connection, payload.eventId)
  );

  if (!eventContext) {
    return;
  }

  const { clientRecipients, event, internalRecipients } = eventContext;
  const liveUpdatedAt = fromMysqlDateTime(event.updated_at) || event.updated_at;

  if (liveUpdatedAt !== payload.eventUpdatedAt) {
    return;
  }

  const audience = [...internalRecipients, ...clientRecipients];
  const calendarResult = await syncCalendarState(
    payload,
    event,
    audience.map((recipient) => ({ email: recipient.email }))
  );
  const scheduledStartAt = fromMysqlDateTime(event.scheduled_start_at) || event.scheduled_start_at;
  const scheduledEndAt = fromMysqlDateTime(event.scheduled_end_at) || event.scheduled_end_at;
  const joinUrl = calendarResult.joinUrl ?? event.join_url;

  await withTransaction(getMysqlPool(), async (connection) => {
    const timestamp = toMysqlDateTime(nowUtc());

    await executeResult(
      connection,
      `UPDATE events
       SET meeting_provider_code = ?,
           external_meeting_id = ?,
           join_url = ?,
           host_url = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        calendarResult.providerCode,
        calendarResult.externalEventId,
        calendarResult.joinUrl,
        calendarResult.hostUrl,
        timestamp,
        Number(event.id),
      ]
    );

    const notificationBody =
      payload.actionLabel === 'scheduled'
        ? 'A meeting has been scheduled on your matter dashboard.'
        : payload.actionLabel === 'rescheduled'
          ? 'A meeting on your matter has been updated.'
          : 'A scheduled meeting has been cancelled.';

    if (clientRecipients.length > 0) {
      await adminNotificationService.insertNotifications(
        connection,
        clientRecipients.map((recipient) => recipient.userId),
        {
          bodyText: notificationBody,
          eventId: Number(event.id),
          matterId: event.matter_id ? Number(event.matter_id) : null,
          notificationTypeCode: 'event_reminder',
          priorityCode: 'normal',
          title: event.title,
        }
      );
    }

    if (internalRecipients.length > 0) {
      await adminNotificationService.insertNotifications(
        connection,
        internalRecipients.map((recipient) => recipient.userId),
        {
          bodyText: `Admin event ${payload.actionLabel}: ${event.title}`,
          eventId: Number(event.id),
          matterId: event.matter_id ? Number(event.matter_id) : null,
          notificationTypeCode: 'event_reminder',
          priorityCode: 'normal',
          title: `Meeting ${payload.actionLabel}`,
        }
      );
    }
  });

  const email = buildLifecycleEmail({
    actionLabel: payload.actionLabel,
    joinUrl,
    locationText: event.location_text,
    modeCode: event.mode_code,
    notes: event.notes,
    scheduledEndAt,
    scheduledStartAt,
    title: event.title,
  });

  for (const recipient of audience) {
    await transactionalEmailService.send({
      subject: email.subject,
      text: email.text,
      to: recipient.email,
    });
  }
};
