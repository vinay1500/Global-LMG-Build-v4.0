import { getMysqlPool } from '../../lib/mysql.js';
import { executeResult, selectAll, selectOne, withConnection, withTransaction } from '../../lib/mysqlUtils.js';
import { notFound } from '../../lib/httpErrors.js';
import { nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
const escapeCsvValue = (value) => {
    const stringValue = value == null ? '' : String(value);
    if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};
export const adminReportService = {
    async getOverview() {
        return withConnection(getMysqlPool(), async (connection) => {
            const [clientCount, matterCount, threadCount, documentCount, upcomingEvents, openTasks, overdueInvoices, pendingRefunds,] = await Promise.all([
                selectOne(connection, 'SELECT COUNT(*) AS count_value FROM client_accounts WHERE archived_at IS NULL'),
                selectOne(connection, 'SELECT COUNT(*) AS count_value FROM matters WHERE archived_at IS NULL'),
                selectOne(connection, 'SELECT COUNT(*) AS count_value FROM conversation_threads WHERE archived_at IS NULL'),
                selectOne(connection, 'SELECT COUNT(*) AS count_value FROM documents WHERE archived_at IS NULL'),
                selectOne(connection, `SELECT COUNT(*) AS count_value
           FROM events
           WHERE status_code IN ('scheduled', 'confirmed', 'upcoming')
             AND scheduled_start_at >= UTC_TIMESTAMP()`),
                selectOne(connection, `SELECT COUNT(*) AS count_value
           FROM admin_tasks
           WHERE status_code NOT IN ('done', 'cancelled')`),
                selectOne(connection, `SELECT COUNT(*) AS count_value
           FROM invoices
           WHERE archived_at IS NULL
             AND amount_due > 0
             AND due_date < UTC_DATE()`),
                selectOne(connection, `SELECT COUNT(*) AS count_value
           FROM refunds
           WHERE refund_status_code IN ('requested', 'processing')`),
            ]);
            const [matterStages, invoiceStatuses, eventStatuses, onboardingStatuses] = await Promise.all([
                selectAll(connection, `SELECT current_stage_code AS group_code, COUNT(*) AS count_value
           FROM matters
           WHERE archived_at IS NULL
           GROUP BY current_stage_code
           ORDER BY count_value DESC`),
                selectAll(connection, `SELECT status_code AS group_code, COUNT(*) AS count_value
           FROM invoices
           WHERE archived_at IS NULL
           GROUP BY status_code
           ORDER BY count_value DESC`),
                selectAll(connection, `SELECT status_code AS group_code, COUNT(*) AS count_value
           FROM events
           GROUP BY status_code
           ORDER BY count_value DESC`),
                selectAll(connection, `SELECT onboarding_status_code AS group_code, COUNT(*) AS count_value
           FROM client_accounts
           WHERE archived_at IS NULL
           GROUP BY onboarding_status_code
           ORDER BY count_value DESC`),
            ]);
            return {
                counts: {
                    clients: Number(clientCount?.count_value || 0),
                    documents: Number(documentCount?.count_value || 0),
                    matters: Number(matterCount?.count_value || 0),
                    threads: Number(threadCount?.count_value || 0),
                    upcomingEvents: Number(upcomingEvents?.count_value || 0),
                    openTasks: Number(openTasks?.count_value || 0),
                    overdueInvoices: Number(overdueInvoices?.count_value || 0),
                    pendingRefunds: Number(pendingRefunds?.count_value || 0),
                },
                eventStatuses: eventStatuses.map((row) => ({
                    code: row.group_code,
                    count: Number(row.count_value || 0),
                })),
                invoiceStatuses: invoiceStatuses.map((row) => ({
                    code: row.group_code,
                    count: Number(row.count_value || 0),
                })),
                matterStages: matterStages.map((row) => ({
                    code: row.group_code,
                    count: Number(row.count_value || 0),
                })),
                onboardingStatuses: onboardingStatuses.map((row) => ({
                    code: row.group_code,
                    count: Number(row.count_value || 0),
                })),
            };
        });
    },
    async downloadOverviewCsv() {
        const overview = await this.getOverview();
        const rows = [
            'section,code,count',
            ...Object.entries(overview.counts).map(([code, count]) => ['counts', code, count].map(escapeCsvValue).join(',')),
            ...overview.matterStages.map((entry) => ['matterStages', entry.code, entry.count].map(escapeCsvValue).join(',')),
            ...overview.invoiceStatuses.map((entry) => ['invoiceStatuses', entry.code, entry.count].map(escapeCsvValue).join(',')),
            ...overview.eventStatuses.map((entry) => ['eventStatuses', entry.code, entry.count].map(escapeCsvValue).join(',')),
            ...overview.onboardingStatuses.map((entry) => ['onboardingStatuses', entry.code, entry.count].map(escapeCsvValue).join(',')),
        ];
        return rows.join('\n');
    },
    async getDrilldowns() {
        return withConnection(getMysqlPool(), async (connection) => {
            const [overdueInvoices, staleMatters, pendingReminders, failedJobs, waitingThreads] = await Promise.all([
                selectAll(connection, `SELECT
               i.public_id,
               i.invoice_number,
               i.due_date,
               i.amount_due,
               i.status_code,
               ca.display_name AS client_display_name
             FROM invoices i
             INNER JOIN client_accounts ca
               ON ca.id = i.client_account_id
             WHERE i.archived_at IS NULL
               AND i.amount_due > 0
               AND i.due_date < UTC_DATE()
             ORDER BY i.due_date ASC
             LIMIT 50`),
                selectAll(connection, `SELECT
               m.public_id,
               m.matter_number,
               m.title,
               m.current_stage_code,
               m.last_activity_at,
               ca.display_name AS client_display_name
             FROM matters m
             INNER JOIN client_accounts ca
               ON ca.id = m.client_account_id
             WHERE m.archived_at IS NULL
               AND m.closed_at IS NULL
               AND m.last_activity_at < (UTC_TIMESTAMP() - INTERVAL 14 DAY)
             ORDER BY m.last_activity_at ASC
             LIMIT 50`),
                selectAll(connection, `SELECT
               er.id AS reminder_id,
               er.scheduled_at,
               er.delivery_status_code,
               e.public_id AS event_public_id,
               e.title AS event_title,
               ca.display_name AS client_display_name
             FROM event_reminders er
             INNER JOIN events e
               ON e.id = er.event_id
             INNER JOIN client_accounts ca
               ON ca.id = e.client_account_id
             WHERE er.delivery_status_code IN ('scheduled', 'retry', 'processing', 'failed')
               AND er.sent_at IS NULL
             ORDER BY er.scheduled_at ASC
             LIMIT 50`),
                selectAll(connection, `SELECT
               public_id,
               type_code,
               status_code,
               attempt_count,
               available_at,
               last_error
             FROM admin_async_jobs
             WHERE status_code IN ('retry', 'failed', 'processing')
             ORDER BY updated_at DESC
             LIMIT 50`),
                selectAll(connection, `SELECT
               ct.public_id,
               ct.thread_number,
               ct.subject,
               ct.last_message_at,
               ca.display_name AS client_display_name
             FROM conversation_threads ct
             INNER JOIN client_accounts ca
               ON ca.id = ct.client_account_id
             INNER JOIN messages last_message
               ON last_message.id = (
                 SELECT msg.id
                 FROM messages msg
                 WHERE msg.thread_id = ct.id
                   AND msg.deleted_at IS NULL
                 ORDER BY msg.sent_at DESC
                 LIMIT 1
               )
             INNER JOIN client_account_contacts cac
               ON cac.user_id = last_message.sender_user_id
              AND cac.client_account_id = ct.client_account_id
              AND cac.archived_at IS NULL
             WHERE ct.archived_at IS NULL
             ORDER BY ct.last_message_at DESC
             LIMIT 50`),
            ]);
            return {
                failedJobs: failedJobs.map((entry) => ({
                    attemptCount: Number(entry.attempt_count),
                    availableAt: entry.available_at,
                    id: entry.public_id,
                    lastError: entry.last_error,
                    statusCode: entry.status_code,
                    typeCode: entry.type_code,
                })),
                overdueInvoices: overdueInvoices.map((entry) => ({
                    amountDue: Number(entry.amount_due || 0),
                    clientName: entry.client_display_name,
                    dueDate: entry.due_date,
                    id: entry.public_id,
                    invoiceNumber: entry.invoice_number,
                    statusCode: entry.status_code,
                })),
                pendingReminders: pendingReminders.map((entry) => ({
                    clientName: entry.client_display_name,
                    deliveryStatusCode: entry.delivery_status_code,
                    eventId: entry.event_public_id,
                    eventTitle: entry.event_title,
                    reminderId: Number(entry.reminder_id),
                    scheduledAt: entry.scheduled_at,
                })),
                staleMatters: staleMatters.map((entry) => ({
                    clientName: entry.client_display_name,
                    currentStageCode: entry.current_stage_code,
                    id: entry.public_id,
                    lastActivityAt: entry.last_activity_at,
                    matterNumber: entry.matter_number,
                    title: entry.title,
                })),
                waitingThreads: waitingThreads.map((entry) => ({
                    clientName: entry.client_display_name,
                    id: entry.public_id,
                    lastMessageAt: entry.last_message_at,
                    subject: entry.subject,
                    threadNumber: entry.thread_number,
                })),
            };
        });
    },
    async retryAsyncJob(jobPublicId) {
        return withTransaction(getMysqlPool(), async (connection) => {
            const timestamp = toMysqlDateTime(nowUtc());
            const result = await executeResult(connection, `UPDATE admin_async_jobs
         SET status_code = 'retry',
             available_at = ?,
             lease_token = NULL,
             lease_expires_at = NULL,
             claimed_at = NULL,
             last_error = NULL,
             updated_at = ?
         WHERE public_id = ?
           AND status_code IN ('failed', 'retry')`, [timestamp, timestamp, jobPublicId]);
            if (result.affectedRows === 0) {
                throw notFound('async_job_not_retryable', 'Async job could not be retried.');
            }
            return {
                jobId: jobPublicId,
                status: 'queued_for_retry',
            };
        });
    },
    async retryReminder(reminderId) {
        return withTransaction(getMysqlPool(), async (connection) => {
            const timestamp = toMysqlDateTime(nowUtc());
            const result = await executeResult(connection, `UPDATE event_reminders
         SET delivery_status_code = 'retry',
             scheduled_at = ?,
             failure_reason = NULL,
             lease_token = NULL,
             lease_expires_at = NULL,
             claimed_at = NULL
         WHERE id = ?
           AND sent_at IS NULL
           AND delivery_status_code IN ('failed', 'retry')`, [timestamp, reminderId]);
            if (result.affectedRows === 0) {
                throw notFound('event_reminder_not_retryable', 'Reminder could not be retried.');
            }
            return {
                reminderId,
                status: 'queued_for_retry',
            };
        });
    },
};
