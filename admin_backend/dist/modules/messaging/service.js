import { z } from 'zod';
import { createPublicId } from '../../lib/ids.js';
import { getMysqlPool } from '../../lib/mysql.js';
import { badRequest, notFound } from '../../lib/httpErrors.js';
import { executeResult, selectAll, selectOne, withTransaction } from '../../lib/mysqlUtils.js';
import { fromMysqlDateTime, nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { adminNotificationService } from '../notifications/service.js';
const sendReplySchema = z.object({
    attachmentDocumentIds: z.array(z.string().trim().min(2).max(64)).max(10).optional(),
    bodyText: z.string().trim().min(1).max(4000),
});
const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');
export const adminMessagingService = {
    sendReplySchema,
    async listThreads(options = {}) {
        return withTransaction(getMysqlPool(), async (connection) => {
            const limit = Math.min(Math.max(options.limit || 20, 1), 100);
            const offset = Math.max(options.offset || 0, 0);
            const values = [];
            let whereClause = 'WHERE ct.archived_at IS NULL';
            if (options.search?.trim()) {
                const like = `%${escapeLike(options.search.trim())}%`;
                whereClause +=
                    " AND (ct.subject LIKE ? ESCAPE '\\\\' OR ct.thread_number LIKE ? ESCAPE '\\\\' OR ca.display_name LIKE ? ESCAPE '\\\\' OR m.title LIKE ? ESCAPE '\\\\')";
                values.push(like, like, like, like);
            }
            const rows = await selectAll(connection, `SELECT
           ct.public_id,
           ct.thread_number,
           ct.subject,
           ct.status_code,
           ct.last_message_at,
           ca.display_name AS client_display_name,
           m.public_id AS matter_public_id,
           m.title AS matter_title,
           (
             SELECT msg.body_text
             FROM messages msg
             WHERE msg.thread_id = ct.id
               AND msg.deleted_at IS NULL
             ORDER BY msg.sent_at DESC
             LIMIT 1
           ) AS last_body_text
         FROM conversation_threads ct
         INNER JOIN client_accounts ca
           ON ca.id = ct.client_account_id
         LEFT JOIN matters m
           ON m.id = ct.matter_id
         ${whereClause}
         ORDER BY ct.last_message_at DESC, ct.updated_at DESC
         LIMIT ?
         OFFSET ?`, [...values, limit, offset]);
            return {
                items: rows.map((row) => ({
                    clientName: row.client_display_name,
                    id: row.public_id,
                    lastMessageAt: fromMysqlDateTime(row.last_message_at),
                    lastMessageText: row.last_body_text,
                    matterId: row.matter_public_id,
                    matterTitle: row.matter_title,
                    statusCode: row.status_code,
                    subject: row.subject,
                    threadNumber: row.thread_number,
                })),
                limit,
                offset,
            };
        });
    },
    async getThread(threadPublicId) {
        return withTransaction(getMysqlPool(), async (connection) => {
            const thread = await selectOne(connection, `SELECT
           ct.id,
           ct.client_account_id,
           ct.public_id,
           ct.thread_number,
           ct.subject,
           ct.status_code,
           ct.last_message_at,
           ca.display_name AS client_display_name,
           m.public_id AS matter_public_id,
           m.title AS matter_title,
           NULL AS last_body_text
         FROM conversation_threads ct
         INNER JOIN client_accounts ca
           ON ca.id = ct.client_account_id
         LEFT JOIN matters m
           ON m.id = ct.matter_id
         WHERE ct.public_id = ?
           AND ct.archived_at IS NULL
         LIMIT 1`, [threadPublicId]);
            if (!thread?.id) {
                throw notFound('thread_not_found', 'Thread not found.');
            }
            const messages = await selectAll(connection, `SELECT
           m.public_id,
           m.message_type_code,
           m.body_text,
           m.sent_at,
           m.edited_at,
           COALESCE(sender.display_name, m.sender_system_code) AS display_name,
           m.sender_system_code
         FROM messages m
         LEFT JOIN users sender
           ON sender.id = m.sender_user_id
         WHERE m.thread_id = ?
           AND m.deleted_at IS NULL
         ORDER BY m.sent_at ASC`, [Number(thread.id)]);
            const attachments = await selectAll(connection, `SELECT
           msg.public_id AS message_public_id,
           d.public_id AS document_public_id,
           dv.original_file_name
         FROM message_document_versions mdv
         INNER JOIN messages msg
           ON msg.id = mdv.message_id
         INNER JOIN document_versions dv
           ON dv.id = mdv.document_version_id
         INNER JOIN documents d
           ON d.id = dv.document_id
         WHERE msg.thread_id = ?`, [Number(thread.id)]);
            const availableAttachments = await selectAll(connection, `SELECT
           d.public_id AS document_public_id,
           d.title,
           d.category_code,
           d.visibility_scope_code,
           dv.original_file_name
         FROM documents d
         LEFT JOIN document_versions dv
           ON dv.document_id = d.id
          AND dv.is_current = 1
         WHERE d.owner_client_account_id = ?
           AND d.archived_at IS NULL
         ORDER BY d.updated_at DESC
         LIMIT 24`, [Number(thread.client_account_id)]);
            const attachmentMap = new Map();
            for (const attachment of attachments) {
                const current = attachmentMap.get(attachment.message_public_id) || [];
                current.push({
                    documentId: attachment.document_public_id,
                    originalFileName: attachment.original_file_name,
                });
                attachmentMap.set(attachment.message_public_id, current);
            }
            return {
                clientName: thread.client_display_name,
                id: thread.public_id,
                lastMessageAt: fromMysqlDateTime(thread.last_message_at),
                matterId: thread.matter_public_id,
                matterTitle: thread.matter_title,
                messages: messages.map((message) => ({
                    attachments: attachmentMap.get(message.public_id) || [],
                    bodyText: message.body_text,
                    editedAt: fromMysqlDateTime(message.edited_at),
                    id: message.public_id,
                    messageTypeCode: message.message_type_code,
                    senderName: message.display_name,
                    senderSystemCode: message.sender_system_code,
                    sentAt: fromMysqlDateTime(message.sent_at),
                })),
                availableAttachments: availableAttachments.map((attachment) => ({
                    categoryCode: attachment.category_code,
                    documentId: attachment.document_public_id,
                    originalFileName: attachment.original_file_name,
                    title: attachment.title,
                    visibilityScopeCode: attachment.visibility_scope_code,
                })),
                statusCode: thread.status_code,
                subject: thread.subject,
                threadNumber: thread.thread_number,
            };
        });
    },
    async sendReply(actorUserId, actorPublicId, actorRoleCode, threadPublicId, input) {
        const payload = sendReplySchema.parse(input);
        const timestamp = toMysqlDateTime(nowUtc());
        return withTransaction(getMysqlPool(), async (connection) => {
            const thread = await selectOne(connection, `SELECT id, client_account_id, matter_id
         FROM conversation_threads
         WHERE public_id = ?
           AND archived_at IS NULL
         LIMIT 1`, [threadPublicId]);
            if (!thread?.id) {
                throw notFound('thread_not_found', 'Thread not found.');
            }
            const participant = await selectOne(connection, `SELECT id
         FROM thread_participants
         WHERE thread_id = ?
           AND internal_user_id = ?
           AND is_active = 1
         LIMIT 1`, [Number(thread.id), actorUserId]);
            if (!participant?.id) {
                await connection.execute(`INSERT INTO thread_participants (
            thread_id, participant_role_code, internal_user_id, client_contact_user_id,
            counsel_partner_id, is_active, joined_at, left_at, last_read_message_id, last_read_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [Number(thread.id), 'internal_admin', actorUserId, null, null, 1, timestamp, null, null, null]);
            }
            const insert = await executeResult(connection, `INSERT INTO messages (
          public_id, thread_id, sender_user_id, sender_counsel_partner_id, sender_system_code,
          message_type_code, body_text, visible_to_client, reply_to_message_id, sent_at, edited_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                createPublicId(),
                Number(thread.id),
                actorUserId,
                null,
                null,
                payload.attachmentDocumentIds?.length ? 'attachment' : 'text',
                payload.bodyText,
                1,
                null,
                timestamp,
                null,
                null,
            ]);
            const messageId = Number(insert.insertId);
            for (const documentPublicId of payload.attachmentDocumentIds || []) {
                const documentVersion = await selectOne(connection, `SELECT dv.id
           FROM documents d
           INNER JOIN document_versions dv
             ON dv.document_id = d.id
            AND dv.is_current = 1
           WHERE d.public_id = ?
             AND d.owner_client_account_id = ?
             AND d.archived_at IS NULL
           LIMIT 1`, [documentPublicId, Number(thread.client_account_id)]);
                if (!documentVersion?.id) {
                    throw badRequest('message_attachment_invalid', 'One or more attachments could not be resolved.');
                }
                await connection.execute(`INSERT INTO message_document_versions (
            message_id, document_version_id, sort_order, created_at
          ) VALUES (?, ?, ?, ?)`, [messageId, Number(documentVersion.id), 0, timestamp]);
            }
            await connection.execute(`UPDATE conversation_threads
         SET last_message_at = ?, updated_at = ?, status_code = 'active', row_version = row_version + 1
         WHERE id = ?`, [timestamp, timestamp, Number(thread.id)]);
            await adminNotificationService.insertNotifications(connection, (await adminNotificationService.listClientRecipients(connection, Number(thread.client_account_id))).map((entry) => entry.userId), {
                bodyText: payload.bodyText,
                matterId: thread.matter_id ? Number(thread.matter_id) : null,
                notificationTypeCode: 'message_received',
                priorityCode: 'normal',
                threadId: Number(thread.id),
                title: 'New update from Global LMG',
            });
            await adminNotificationService.insertAuditEvent(connection, {
                actionCode: 'message_sent',
                actionLabel: 'Thread message sent',
                actorRoleCodeSnapshot: actorRoleCode,
                actorUserId,
                entityPk: Number(thread.id),
                entityTableName: 'conversation_threads',
                sourceModule: 'Admin Messaging',
                summaryNewValue: payload.bodyText,
            });
            return {
                messageId,
                senderUserId: actorPublicId,
                threadId: threadPublicId,
            };
        });
    },
};
