import { nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { createPublicId } from '../../lib/ids.js';
import { selectAll, selectOne } from '../../lib/mysqlUtils.js';
const insertAuditEvent = async (connection, input) => {
    const occurredAt = toMysqlDateTime(nowUtc());
    await connection.execute(`INSERT INTO audit_events (
      public_id, actor_user_id, actor_role_code_snapshot, entity_table_name, entity_pk, action_code,
      action_label, source_module, request_correlation_id, ip_address, user_agent, summary_old_value,
      summary_new_value, occurred_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        createPublicId(),
        input.actorUserId,
        input.actorRoleCodeSnapshot,
        input.entityTableName,
        input.entityPk,
        input.actionCode,
        input.actionLabel,
        input.sourceModule,
        null,
        null,
        null,
        input.summaryOldValue || null,
        input.summaryNewValue || null,
        occurredAt,
    ]);
};
const insertNotifications = async (connection, recipientUserIds, input) => {
    if (recipientUserIds.length === 0) {
        return;
    }
    const createdAt = input.createdAt || toMysqlDateTime(nowUtc());
    for (const recipientUserId of recipientUserIds) {
        await connection.execute(`INSERT INTO notifications (
        public_id, recipient_user_id, notification_type_code, title, body_text, priority_code,
        matter_id, invoice_id, thread_id, event_id, document_id, is_read, read_at, dismissed_at,
        created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            createPublicId(),
            recipientUserId,
            input.notificationTypeCode,
            input.title,
            input.bodyText,
            input.priorityCode,
            input.matterId || null,
            input.invoiceId || null,
            input.threadId || null,
            input.eventId || null,
            input.documentId || null,
            0,
            null,
            null,
            createdAt,
            input.expiresAt || null,
        ]);
    }
};
const getClientContactRecipientUserIds = async (connection, clientAccountId) => {
    const rows = await selectAll(connection, `SELECT DISTINCT cac.user_id
     FROM client_account_contacts cac
     WHERE cac.client_account_id = ?
       AND cac.portal_access_enabled = 1
       AND cac.archived_at IS NULL`, [clientAccountId]);
    return rows.map((row) => Number(row.user_id));
};
const getOtherThreadParticipantUserIds = async (connection, threadId, senderUserId) => {
    const rows = await selectAll(connection, `SELECT DISTINCT COALESCE(tp.internal_user_id, tp.client_contact_user_id) AS user_id
     FROM thread_participants tp
     WHERE tp.thread_id = ?
       AND tp.is_active = 1
       AND COALESCE(tp.internal_user_id, tp.client_contact_user_id) IS NOT NULL
       AND COALESCE(tp.internal_user_id, tp.client_contact_user_id) <> ?`, [threadId, senderUserId]);
    return rows.map((row) => Number(row.user_id));
};
const getEventClientAccountId = async (connection, eventId) => {
    const row = await selectOne(connection, 'SELECT client_account_id FROM events WHERE id = ? LIMIT 1', [eventId]);
    return row?.client_account_id ? Number(row.client_account_id) : null;
};
export const domainEventService = {
    async publishRequestSubmitted(connection, input) {
        const recipients = await getClientContactRecipientUserIds(connection, input.clientAccountId);
        await insertNotifications(connection, recipients, {
            bodyText: 'Your request has been submitted and a case manager has been assigned.',
            matterId: input.matterId,
            notificationTypeCode: 'matter_update',
            priorityCode: 'normal',
            threadId: input.threadId,
            title: 'Request Submitted',
        });
        await insertAuditEvent(connection, {
            actionCode: 'request_submitted',
            actionLabel: 'New request submitted',
            actorRoleCodeSnapshot: 'client',
            actorUserId: input.actorUserId,
            entityPk: input.matterId,
            entityTableName: 'matters',
            sourceModule: 'Client Dashboard',
            summaryNewValue: `${input.title} (${input.matterNumber})`,
        });
    },
    async publishThreadMessage(connection, input) {
        const recipients = await getOtherThreadParticipantUserIds(connection, input.threadId, input.senderUserId);
        await insertNotifications(connection, recipients, {
            bodyText: input.entityLabel,
            notificationTypeCode: 'message_received',
            priorityCode: 'normal',
            threadId: input.threadId,
            title: input.notificationTitle,
        });
        await insertAuditEvent(connection, {
            actionCode: 'message_sent',
            actionLabel: 'Thread message sent',
            actorRoleCodeSnapshot: input.actorRoleCodeSnapshot,
            actorUserId: input.actorUserId,
            entityPk: input.threadId,
            entityTableName: 'conversation_threads',
            sourceModule: input.sourceModule,
            summaryNewValue: input.bodyText,
        });
    },
    async publishMatterStageChanged(connection, input) {
        const matter = await selectOne(connection, 'SELECT client_account_id FROM matters WHERE id = ? LIMIT 1', [input.matterId]);
        if (matter?.client_account_id && input.clientVisible) {
            const recipients = await getClientContactRecipientUserIds(connection, Number(matter.client_account_id));
            await insertNotifications(connection, recipients, {
                bodyText: input.changeNote || `Matter stage changed to ${input.stageCode}.`,
                matterId: input.matterId,
                notificationTypeCode: 'matter_update',
                priorityCode: 'normal',
                title: input.title,
            });
        }
        await insertAuditEvent(connection, {
            actionCode: 'matter_stage_changed',
            actionLabel: 'Matter stage changed',
            actorRoleCodeSnapshot: input.actorRoleCodeSnapshot,
            actorUserId: input.actorUserId,
            entityPk: input.matterId,
            entityTableName: 'matters',
            sourceModule: 'Admin Matters',
            summaryNewValue: input.stageCode,
            summaryOldValue: input.changeNote || null,
        });
    },
    async publishEventScheduled(connection, input) {
        const clientAccountId = await getEventClientAccountId(connection, input.eventId);
        if (clientAccountId && input.clientVisibleFlag) {
            const recipients = await getClientContactRecipientUserIds(connection, clientAccountId);
            await insertNotifications(connection, recipients, {
                bodyText: 'An upcoming consultation or milestone is scheduled on your dashboard.',
                eventId: input.eventId,
                matterId: input.matterId,
                notificationTypeCode: 'event_reminder',
                priorityCode: 'normal',
                title: input.title,
            });
        }
        await insertAuditEvent(connection, {
            actionCode: 'event_scheduled',
            actionLabel: 'Event scheduled',
            actorRoleCodeSnapshot: input.actorRoleCodeSnapshot,
            actorUserId: input.actorUserId,
            entityPk: input.eventId,
            entityTableName: 'events',
            sourceModule: 'Admin Events',
            summaryNewValue: input.title,
        });
    },
    async publishRefundRequested(connection, input) {
        const payment = await selectOne(connection, 'SELECT client_account_id FROM payment_transactions WHERE id = ? LIMIT 1', [input.paymentId]);
        if (payment?.client_account_id) {
            const recipients = await getClientContactRecipientUserIds(connection, Number(payment.client_account_id));
            await insertNotifications(connection, recipients, {
                bodyText: `A refund request for INR ${input.amount.toFixed(2)} has been initiated.`,
                invoiceId: input.invoiceId,
                notificationTypeCode: 'payment_reminder',
                priorityCode: 'normal',
                title: 'Refund requested',
            });
        }
        await insertAuditEvent(connection, {
            actionCode: 'refund_requested',
            actionLabel: 'Refund requested',
            actorRoleCodeSnapshot: input.actorRoleCodeSnapshot,
            actorUserId: input.actorUserId,
            entityPk: input.refundId,
            entityTableName: 'refunds',
            sourceModule: 'Admin Billing',
            summaryNewValue: input.amount.toFixed(2),
        });
    },
};
