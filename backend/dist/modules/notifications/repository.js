import { fromMysqlDateTime, nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { notFound } from '../../lib/httpErrors.js';
import { selectAll, selectOne, withConnection, withTransaction } from '../../lib/mysqlUtils.js';
import { ensurePlatformReady } from '../platform/bootstrap.js';
const resolveMeta = (row) => {
    if (row.matter_number) {
        return row.matter_number;
    }
    if (row.matter_title) {
        return row.matter_title;
    }
    if (row.invoice_due_date) {
        const iso = fromMysqlDateTime(row.invoice_due_date);
        return iso ? `Due ${iso.slice(0, 10)}` : row.invoice_number || '';
    }
    return row.event_title || row.document_title || row.invoice_number || '';
};
const resolveAction = (row) => {
    if (row.thread_public_id) {
        return {
            actionLabel: 'Open Messages',
            actionTarget: 'messages',
            threadId: row.thread_public_id,
        };
    }
    if (row.invoice_public_id) {
        return {
            actionLabel: 'Open Billing',
            actionTarget: 'billing',
            threadId: null,
        };
    }
    if (row.document_public_id) {
        return {
            actionLabel: 'Open Documents',
            actionTarget: 'documents',
            threadId: null,
        };
    }
    return {
        actionLabel: 'View Cases',
        actionTarget: 'cases',
        threadId: null,
    };
};
const toPortalNotification = (row) => {
    const action = resolveAction(row);
    return {
        ...action,
        createdAt: fromMysqlDateTime(row.created_at) || nowUtc(),
        description: row.body_text,
        id: row.notification_public_id,
        isRead: Boolean(row.is_read),
        meta: resolveMeta(row),
        priorityCode: row.priority_code,
        title: row.title,
        typeCode: row.notification_type_code,
        typeLabel: row.type_label,
    };
};
export class NotificationsRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async initialize() {
        await ensurePlatformReady();
    }
    async resolvePortalUserContext(connection, userPublicId) {
        const row = await selectOne(connection, `SELECT u.id AS user_id
       FROM users u
       INNER JOIN client_account_contacts cac
         ON cac.user_id = u.id
         AND cac.portal_access_enabled = 1
         AND cac.archived_at IS NULL
       WHERE u.public_id = ?
         AND u.archived_at IS NULL
       LIMIT 1`, [userPublicId]);
        if (!row) {
            throw notFound('portal_user_not_found', 'Portal user could not be resolved.');
        }
        return row;
    }
    async listForUser(userPublicId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            const context = await this.resolvePortalUserContext(connection, userPublicId);
            const rows = await selectAll(connection, `SELECT
           n.public_id AS notification_public_id,
           n.notification_type_code,
           nt.label AS type_label,
           n.title,
           n.body_text,
           n.priority_code,
           n.is_read,
           n.created_at,
           ct.public_id AS thread_public_id,
           m.matter_number,
           m.title AS matter_title,
           i.public_id AS invoice_public_id,
           i.invoice_number,
           i.due_date AS invoice_due_date,
           e.public_id AS event_public_id,
           e.title AS event_title,
           d.public_id AS document_public_id,
           d.title AS document_title
         FROM notifications n
         INNER JOIN notification_types nt
           ON nt.code = n.notification_type_code
         LEFT JOIN conversation_threads ct
           ON ct.id = n.thread_id
         LEFT JOIN matters m
           ON m.id = n.matter_id
         LEFT JOIN invoices i
           ON i.id = n.invoice_id
         LEFT JOIN events e
           ON e.id = n.event_id
         LEFT JOIN documents d
           ON d.id = n.document_id
         WHERE n.recipient_user_id = ?
           AND n.dismissed_at IS NULL
           AND (n.expires_at IS NULL OR n.expires_at > ?)
         ORDER BY n.created_at DESC, n.id DESC`, [context.user_id, toMysqlDateTime(nowUtc())]);
            return rows.map(toPortalNotification);
        });
    }
    async markRead(userPublicId, notificationPublicId) {
        await this.initialize();
        await withTransaction(this.pool, async (connection) => {
            const context = await this.resolvePortalUserContext(connection, userPublicId);
            const existing = await selectOne(connection, `SELECT id
         FROM notifications
         WHERE public_id = ?
           AND recipient_user_id = ?
           AND dismissed_at IS NULL
         LIMIT 1`, [notificationPublicId, context.user_id]);
            if (!existing?.id) {
                throw notFound('notification_not_found', 'Notification could not be resolved.');
            }
            const timestamp = toMysqlDateTime(nowUtc());
            await connection.execute(`UPDATE notifications
         SET is_read = 1,
             read_at = COALESCE(read_at, ?)
         WHERE id = ?`, [timestamp, Number(existing.id)]);
        });
    }
    async dismiss(userPublicId, notificationPublicId) {
        await this.initialize();
        await withTransaction(this.pool, async (connection) => {
            const context = await this.resolvePortalUserContext(connection, userPublicId);
            const existing = await selectOne(connection, `SELECT id
         FROM notifications
         WHERE public_id = ?
           AND recipient_user_id = ?
           AND dismissed_at IS NULL
         LIMIT 1`, [notificationPublicId, context.user_id]);
            if (!existing?.id) {
                throw notFound('notification_not_found', 'Notification could not be resolved.');
            }
            const timestamp = toMysqlDateTime(nowUtc());
            await connection.execute(`UPDATE notifications
         SET is_read = 1,
             read_at = COALESCE(read_at, ?),
             dismissed_at = ?
         WHERE id = ?`, [timestamp, timestamp, Number(existing.id)]);
        });
    }
}
