import { fromMysqlDateTime, nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { createPublicId } from '../../lib/ids.js';
import { selectAll } from '../../lib/mysqlUtils.js';
const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');
export const adminNotificationService = {
    async listClientRecipients(connection, clientAccountId) {
        const rows = await selectAll(connection, `SELECT DISTINCT
         u.id AS user_id,
         u.public_id,
         u.email
       FROM client_account_contacts cac
       INNER JOIN users u
         ON u.id = cac.user_id
       WHERE cac.client_account_id = ?
         AND cac.archived_at IS NULL
         AND cac.portal_access_enabled = 1
         AND u.archived_at IS NULL`, [clientAccountId]);
        return rows.map((row) => ({
            email: row.email,
            publicId: row.public_id,
            userId: Number(row.user_id),
        }));
    },
    async listInternalRecipients(connection, userIds) {
        if (userIds.length === 0) {
            return [];
        }
        const rows = await selectAll(connection, `SELECT id AS user_id, public_id, email
       FROM users
       WHERE id IN (${userIds.map(() => '?').join(', ')})
         AND archived_at IS NULL`, userIds);
        return rows.map((row) => ({
            email: row.email,
            publicId: row.public_id,
            userId: Number(row.user_id),
        }));
    },
    async insertAuditEvent(connection, input) {
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
            toMysqlDateTime(nowUtc()),
        ]);
    },
    async insertNotifications(connection, recipientUserIds, input) {
        if (recipientUserIds.length === 0) {
            return;
        }
        const createdAt = toMysqlDateTime(nowUtc());
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
                input.expiresAt ? toMysqlDateTime(input.expiresAt) : null,
            ]);
        }
    },
    async listNotificationHistory(connection, options = {}) {
        const limit = Math.min(Math.max(options.limit || 40, 1), 200);
        const offset = Math.max(options.offset || 0, 0);
        const values = [];
        const clauses = ['1 = 1'];
        const clientScopeExpression = `COALESCE(
      matter_client.public_id,
      invoice_client.public_id,
      thread_client.public_id,
      event_client.public_id,
      document_client.public_id,
      recipient_client.public_id
    )`;
        if (options.clientAccountId?.trim()) {
            clauses.push(`${clientScopeExpression} = ?`);
            values.push(options.clientAccountId.trim());
        }
        if (typeof options.isRead === 'boolean') {
            clauses.push('n.is_read = ?');
            values.push(options.isRead ? 1 : 0);
        }
        if (typeof options.dismissed === 'boolean') {
            clauses.push(options.dismissed ? 'n.dismissed_at IS NOT NULL' : 'n.dismissed_at IS NULL');
        }
        if (options.notificationTypeCode?.trim()) {
            clauses.push('n.notification_type_code = ?');
            values.push(options.notificationTypeCode.trim());
        }
        if (options.recipientUserId?.trim()) {
            clauses.push('recipient.public_id = ?');
            values.push(options.recipientUserId.trim());
        }
        if (options.search?.trim()) {
            const like = `%${escapeLike(options.search.trim())}%`;
            clauses.push(`(n.title LIKE ? ESCAPE '\\\\' OR n.body_text LIKE ? ESCAPE '\\\\' OR recipient.display_name LIKE ? ESCAPE '\\\\' OR COALESCE(${clientScopeExpression}, '') LIKE ? ESCAPE '\\\\')`);
            values.push(like, like, like, like);
        }
        const rows = await selectAll(connection, `SELECT
         n.public_id,
         n.notification_type_code,
         n.title,
         n.body_text,
         n.priority_code,
         n.is_read,
         n.read_at,
         n.dismissed_at,
         n.created_at,
         recipient.public_id AS recipient_public_id,
         recipient.display_name AS recipient_name,
         recipient.email AS recipient_email,
         COALESCE(
           matter_client.public_id,
           invoice_client.public_id,
           thread_client.public_id,
           event_client.public_id,
           document_client.public_id,
           recipient_client.public_id
         ) AS client_public_id,
         COALESCE(
           matter_client.display_name,
           invoice_client.display_name,
           thread_client.display_name,
           event_client.display_name,
           document_client.display_name,
           recipient_client.display_name
         ) AS client_display_name,
         matter.public_id AS matter_public_id,
         invoice.public_id AS invoice_public_id,
         thread.public_id AS thread_public_id,
         event.public_id AS event_public_id,
         document.public_id AS document_public_id
       FROM notifications n
       INNER JOIN users recipient
         ON recipient.id = n.recipient_user_id
       LEFT JOIN matters matter
         ON matter.id = n.matter_id
       LEFT JOIN client_accounts matter_client
         ON matter_client.id = matter.client_account_id
       LEFT JOIN invoices invoice
         ON invoice.id = n.invoice_id
       LEFT JOIN client_accounts invoice_client
         ON invoice_client.id = invoice.client_account_id
       LEFT JOIN conversation_threads thread
         ON thread.id = n.thread_id
       LEFT JOIN client_accounts thread_client
         ON thread_client.id = thread.client_account_id
       LEFT JOIN events event
         ON event.id = n.event_id
       LEFT JOIN client_accounts event_client
         ON event_client.id = event.client_account_id
       LEFT JOIN documents document
         ON document.id = n.document_id
       LEFT JOIN client_accounts document_client
         ON document_client.id = document.owner_client_account_id
       LEFT JOIN client_account_contacts recipient_contact
         ON recipient_contact.user_id = recipient.id
        AND recipient_contact.portal_access_enabled = 1
        AND recipient_contact.archived_at IS NULL
       LEFT JOIN client_accounts recipient_client
         ON recipient_client.id = recipient_contact.client_account_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY n.created_at DESC
       LIMIT ?
       OFFSET ?`, [...values, limit, offset]);
        return {
            items: rows.map((row) => ({
                bodyText: row.body_text,
                clientAccountId: row.client_public_id,
                clientName: row.client_display_name,
                createdAt: fromMysqlDateTime(row.created_at),
                dismissedAt: fromMysqlDateTime(row.dismissed_at),
                documentId: row.document_public_id,
                eventId: row.event_public_id,
                id: row.public_id,
                invoiceId: row.invoice_public_id,
                isRead: Boolean(row.is_read),
                matterId: row.matter_public_id,
                notificationTypeCode: row.notification_type_code,
                priorityCode: row.priority_code,
                readAt: fromMysqlDateTime(row.read_at),
                recipient: {
                    email: row.recipient_email,
                    id: row.recipient_public_id,
                    name: row.recipient_name,
                },
                threadId: row.thread_public_id,
                title: row.title,
            })),
            limit,
            offset,
        };
    },
};
