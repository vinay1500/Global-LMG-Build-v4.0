import type { AdminActor } from '../auth/service.js';
import { createPublicId } from '../../lib/authCrypto.js';
import { executeStatement, withTransaction } from '../../lib/mysql.js';
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

export const getWorkspace = async () => {
  const threads = await fetchThreads({});

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
        actionCode: 'message.reply',
        actionLabel: 'Admin replied to thread',
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
          title: 'New message from your legal team',
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
