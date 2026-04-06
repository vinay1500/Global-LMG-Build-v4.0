import { getMysqlPool } from '../../lib/mysql.js';
import { selectAll, selectOne, withConnection } from '../../lib/mysqlUtils.js';
import { fromMysqlDateTime } from '../../lib/datetime.js';
const toNumber = (value) => Number(value || 0);
export const adminDashboardService = {
    async getSummary() {
        return withConnection(getMysqlPool(), async (connection) => {
            const [totalClients, activeMatters, overdueInvoices, unreadThreads, upcomingEvents, openTasks, monthCollections,] = await Promise.all([
                selectOne(connection, `SELECT COUNT(*) AS count_value
           FROM client_accounts
           WHERE archived_at IS NULL`),
                selectOne(connection, `SELECT COUNT(*) AS count_value
           FROM matters
           WHERE archived_at IS NULL
             AND operational_status_code NOT IN ('completed', 'archived')`),
                selectOne(connection, `SELECT COUNT(*) AS count_value
           FROM invoices
           WHERE archived_at IS NULL
             AND amount_due > 0
             AND due_date < UTC_DATE()`),
                selectOne(connection, `SELECT COUNT(*) AS count_value
           FROM conversation_threads ct
           INNER JOIN messages latest
             ON latest.thread_id = ct.id
            AND latest.deleted_at IS NULL
           LEFT JOIN client_account_contacts cac
             ON cac.user_id = latest.sender_user_id
            AND cac.client_account_id = ct.client_account_id
            AND cac.archived_at IS NULL
           WHERE latest.sent_at = (
             SELECT MAX(m2.sent_at)
             FROM messages m2
             WHERE m2.thread_id = ct.id
               AND m2.deleted_at IS NULL
           )
             AND cac.id IS NOT NULL`),
                selectOne(connection, `SELECT COUNT(*) AS count_value
           FROM events
           WHERE status_code IN ('upcoming', 'rescheduled')
             AND scheduled_start_at BETWEEN UTC_TIMESTAMP(6) AND DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 7 DAY)`),
                selectOne(connection, `SELECT COUNT(*) AS count_value
           FROM admin_tasks
           WHERE archived_at IS NULL
             AND status_code NOT IN ('done', 'cancelled')`),
                selectOne(connection, `SELECT COALESCE(SUM(net_amount), 0) AS amount_value
           FROM payment_transactions
           WHERE status_code IN ('captured', 'authorized')
             AND initiated_at >= DATE_FORMAT(UTC_DATE(), '%Y-%m-01')`),
            ]);
            const dueToday = await selectAll(connection, `SELECT
           t.public_id,
           t.title,
           t.task_type_code,
           t.status_code,
           t.due_at,
           m.public_id AS matter_public_id
         FROM admin_tasks t
         LEFT JOIN matters m
           ON m.id = t.matter_id
         WHERE t.archived_at IS NULL
           AND t.status_code NOT IN ('done', 'cancelled')
           AND t.due_at IS NOT NULL
           AND DATE(t.due_at) = UTC_DATE()
         ORDER BY t.priority_code DESC, t.due_at ASC
         LIMIT 12`);
            const recentActivity = await selectAll(connection, `SELECT
           ae.public_id,
           ae.action_code,
           ae.action_label,
           ae.source_module,
           ae.summary_new_value,
           ae.occurred_at,
           actor.display_name AS actor_name
         FROM audit_events ae
         LEFT JOIN users actor
           ON actor.id = ae.actor_user_id
         ORDER BY ae.occurred_at DESC
         LIMIT 12`);
            return {
                cards: {
                    activeMatters: Number(activeMatters?.count_value || 0),
                    monthCollections: toNumber(monthCollections?.amount_value),
                    openTasks: Number(openTasks?.count_value || 0),
                    overdueInvoices: Number(overdueInvoices?.count_value || 0),
                    totalClients: Number(totalClients?.count_value || 0),
                    unreadThreads: Number(unreadThreads?.count_value || 0),
                    upcomingEvents: Number(upcomingEvents?.count_value || 0),
                },
                dueToday: dueToday.map((item) => ({
                    dueAt: fromMysqlDateTime(item.due_at),
                    id: item.public_id,
                    matterId: item.matter_public_id,
                    statusCode: item.status_code,
                    taskTypeCode: item.task_type_code,
                    title: item.title,
                })),
                recentActivity: recentActivity.map((item) => ({
                    actionCode: item.action_code,
                    actionLabel: item.action_label,
                    actorName: item.actor_name,
                    id: item.public_id,
                    occurredAt: fromMysqlDateTime(item.occurred_at),
                    sourceModule: item.source_module,
                    summary: item.summary_new_value,
                })),
            };
        });
    },
};
