import type { AdminActor } from '../auth/service.js';
import { createPublicId } from '../../lib/authCrypto.js';
import { badRequest, notFound } from '../../lib/httpErrors.js';
import { executeStatement, queryRows, withTransaction } from '../../lib/mysql.js';
import type { RowDataPacket } from 'mysql2/promise';
import {
  fetchClientsByIds,
  fetchEvents,
  fetchInvoices,
  fetchMatters,
  fetchMessagesByThreadIds,
  fetchThreads,
} from '../shared.js';
import {
  createAuditEvent,
  createClientNotifications,
  resolveThreadByPublicId,
  touchMatterActivity,
  touchThreadActivity,
} from '../writeSupport.js';

type ThreadStateRow = RowDataPacket & {
  archivedAt: string | null;
  closedAt: string | null;
  id: number;
  statusCode: string;
};

export const getWorkspace = async (actor: AdminActor) => {
  const threads = await fetchThreads({ viewerUserId: actor.userId });

  if (threads.length === 0) {
    return {
      clients: [],
      events: [],
      invoices: [],
      matters: [],
      messages: [],
      threads: [],
    };
  }

  const clientIds = Array.from(new Set(threads.map((thread) => thread.clientId).filter(Boolean)));
  const matterIds = Array.from(new Set(threads.map((thread) => thread.matterId).filter(Boolean)));
  const [clients, matters, invoices, events, messages] = await Promise.all([
    fetchClientsByIds(clientIds),
    matterIds.length > 0 ? fetchMatters({ limit: 100, matterIds }) : Promise.resolve([]),
    fetchInvoices({ clientAccountIds: clientIds }),
    fetchEvents({ clientAccountIds: clientIds }),
    fetchMessagesByThreadIds(threads.map((thread) => thread.id)),
  ]);

  return {
    clients,
    events,
    invoices,
    matters,
    messages,
    threads,
  };
};

export const replyToThread = async (
  actor: AdminActor,
  payload: {
    content: string;
    threadId: string;
    visibleToClient?: boolean;
  }
) => {
  return withTransaction(async (connection) => {
    const thread = await resolveThreadByPublicId(payload.threadId, connection);
    const stateRows = await queryRows<ThreadStateRow>(
      `SELECT
         id,
         status_code AS statusCode,
         closed_at AS closedAt,
         archived_at AS archivedAt
       FROM conversation_threads
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [thread.id],
      connection
    );
    const state = stateRows[0];

    if (!state || state.archivedAt) {
      throw notFound('thread_not_found', 'Message thread not found.');
    }

    if (state.closedAt || state.statusCode === 'resolved') {
      throw badRequest('thread_closed', 'Closed threads cannot receive replies.');
    }

    const messageResult = await executeStatement(
      `INSERT INTO messages (
         public_id,
         thread_id,
         sender_user_id,
         sender_counsel_partner_id,
         sender_system_code,
         message_type_code,
         body_text,
         visible_to_client,
         reply_to_message_id,
         sent_at,
         edited_at,
         deleted_at
       ) VALUES (?, ?, ?, NULL, NULL, 'text', ?, ?, NULL, UTC_TIMESTAMP(6), NULL, NULL)`,
      [
        createPublicId(),
        thread.id,
        actor.userId,
        payload.content,
        payload.visibleToClient === false ? 0 : 1,
      ],
      connection
    );

    await executeStatement(
      `INSERT IGNORE INTO message_reads (message_id, user_id, read_at)
       VALUES (?, ?, UTC_TIMESTAMP(6))`,
      [messageResult.insertId, actor.userId],
      connection
    );

    await executeStatement(
      `UPDATE conversation_threads
       SET status_code = 'active',
           assigned_owner_user_id = COALESCE(assigned_owner_user_id, ?),
           last_message_at = UTC_TIMESTAMP(6),
           updated_at = UTC_TIMESTAMP(6)
       WHERE id = ?`,
      [actor.userId, thread.id],
      connection
    );

    await touchThreadActivity(thread.id, connection);

    if (thread.matterId) {
      await touchMatterActivity(thread.matterId, connection);
    }

    await createAuditEvent(
      {
        actionCode: 'message.sent',
        actionLabel: 'Admin message sent',
        actorRoleCode: actor.roleCodes[0] || 'messaging_desk',
        actorUserId: actor.userId,
        changes: [{ fieldName: 'body_text', newValue: payload.content }],
        entityPk: thread.id,
        entityTableName: 'conversation_threads',
        sourceModule: 'messages_workspace',
        summaryNewValue: payload.content.slice(0, 180),
      },
      connection
    );

    if (payload.visibleToClient !== false) {
      await createClientNotifications(
        {
          bodyText: payload.content.slice(0, 240),
          clientAccountId: thread.clientAccountId,
          matterId: thread.matterId,
          notificationTypeCode: 'message_received',
          priorityCode: 'normal',
          threadId: thread.id,
          title: 'New message from Global LMG',
        },
        connection
      );
    }

    return {
      messageId: messageResult.insertId,
      status: 'created' as const,
    };
  });
};

export const markThreadRead = async (actor: AdminActor, threadPublicId: string) => {
  return withTransaction(async (connection) => {
    const thread = await resolveThreadByPublicId(threadPublicId, connection);

    await executeStatement(
      `INSERT IGNORE INTO message_reads (message_id, user_id, read_at)
       SELECT msg.id, ?, UTC_TIMESTAMP(6)
       FROM messages msg
       WHERE msg.thread_id = ?
         AND msg.deleted_at IS NULL
         AND (msg.sender_user_id IS NULL OR msg.sender_user_id <> ?)`,
      [actor.userId, thread.id, actor.userId],
      connection
    );

    return { status: 'read' as const };
  });
};

export const archiveThread = async (actor: AdminActor, threadPublicId: string) => {
  return withTransaction(async (connection) => {
    const rows = await queryRows<ThreadStateRow>(
      `SELECT
         id,
         status_code AS statusCode,
         closed_at AS closedAt,
         archived_at AS archivedAt
       FROM conversation_threads
       WHERE public_id = ?
       LIMIT 1
       FOR UPDATE`,
      [threadPublicId],
      connection
    );
    const thread = rows[0];

    if (!thread) {
      throw notFound('thread_not_found', 'Message thread not found.');
    }

    if (thread.archivedAt) {
      return { status: 'archived' as const };
    }

    await executeStatement(
      `UPDATE conversation_threads
       SET status_code = 'resolved',
           closed_at = COALESCE(closed_at, UTC_TIMESTAMP(6)),
           archived_at = UTC_TIMESTAMP(6),
           updated_at = UTC_TIMESTAMP(6)
       WHERE id = ?`,
      [thread.id],
      connection
    );

    await createAuditEvent(
      {
        actionCode: 'thread.archived',
        actionLabel: 'Message thread archived',
        actorRoleCode: actor.roleCodes[0] || 'messaging_desk',
        actorUserId: actor.userId,
        changes: [
          {
            fieldName: 'status_code',
            newValue: 'resolved',
            oldValue: thread.statusCode,
          },
          {
            fieldName: 'archived_at',
            newValue: 'archived',
            oldValue: thread.archivedAt,
          },
        ],
        entityPk: thread.id,
        entityTableName: 'conversation_threads',
        sourceModule: 'messages_workspace',
        summaryNewValue: 'Archived',
        summaryOldValue: thread.statusCode,
      },
      connection
    );

    return { status: 'archived' as const };
  });
};
