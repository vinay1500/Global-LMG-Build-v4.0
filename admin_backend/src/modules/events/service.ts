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
import { executeStatement, withTransaction } from '../../lib/mysql.js';

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

export const getWorkspace = async () => {
  const [clientsResponse, events, matters] = await Promise.all([
    fetchClientsForList({ limit: 100, offset: 0 }),
    fetchEvents({}),
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
        payload.mode === 'video' ? 'google-meet' : 'manual',
        payload.meetLink || null,
        payload.visibleToClient ? 1 : 0,
        payload.notes || null,
        actor.userId,
      ],
      connection
    );

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
        entityPk: result.insertId,
        entityTableName: 'events',
        sourceModule: 'meetings_workspace',
        summaryNewValue: `${payload.title} on ${payload.date} ${payload.time}`,
      },
      connection
    );

    if (payload.visibleToClient) {
      await createClientNotifications(
        {
          bodyText: `A new event has been scheduled for ${payload.date} at ${payload.time}.`,
          clientAccountId: clientAccount.id,
          eventId: result.insertId,
          matterId: matter?.id || null,
          notificationTypeCode: 'event_reminder',
          priorityCode: 'normal',
          title: payload.title,
        },
        connection
      );
    }

    return { status: 'created' as const };
  });
};
