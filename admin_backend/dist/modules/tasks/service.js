import { z } from 'zod';
import { createPublicId } from '../../lib/ids.js';
import { getMysqlPool } from '../../lib/mysql.js';
import { badRequest, notFound } from '../../lib/httpErrors.js';
import { executeResult, selectAll, selectOne, withTransaction } from '../../lib/mysqlUtils.js';
import { fromMysqlDateTime, nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { adminNotificationService } from '../notifications/service.js';
const taskInputSchema = z.object({
    assigneeUserIds: z.array(z.string().trim().min(2).max(64)).max(10).optional(),
    clientAccountId: z.string().trim().min(2).max(64).optional(),
    descriptionText: z.string().trim().max(4000).optional(),
    dueAt: z.string().trim().datetime().optional(),
    matterId: z.string().trim().min(2).max(64).optional(),
    priorityCode: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    taskTypeCode: z.string().trim().min(2).max(64),
    title: z.string().trim().min(2).max(255),
});
const taskStatusSchema = z.object({
    statusCode: z.enum(['todo', 'in-progress', 'blocked', 'done', 'cancelled']),
});
const taskCommentSchema = z.object({
    bodyText: z.string().trim().min(2).max(4000),
});
export const adminTaskService = {
    inputSchema: taskInputSchema,
    taskCommentSchema,
    taskStatusSchema,
    async listTasks() {
        return withTransaction(getMysqlPool(), async (connection) => {
            const rows = await selectAll(connection, `SELECT
           t.public_id,
           t.title,
           t.task_type_code,
           t.status_code,
           t.priority_code,
           t.due_at,
           m.public_id AS matter_public_id
         FROM admin_tasks t
         LEFT JOIN matters m
           ON m.id = t.matter_id
         WHERE t.archived_at IS NULL
         ORDER BY
           FIELD(t.priority_code, 'urgent', 'high', 'normal', 'low'),
           t.due_at IS NULL,
           t.due_at ASC,
           t.created_at DESC`);
            return rows.map((row) => ({
                dueAt: fromMysqlDateTime(row.due_at),
                id: row.public_id,
                matterId: row.matter_public_id,
                priorityCode: row.priority_code,
                statusCode: row.status_code,
                taskTypeCode: row.task_type_code,
                title: row.title,
            }));
        });
    },
    async createTask(actorUserId, actorRoleCode, input) {
        const payload = taskInputSchema.parse(input);
        const timestamp = toMysqlDateTime(nowUtc());
        return withTransaction(getMysqlPool(), async (connection) => {
            const clientAccountId = payload.clientAccountId
                ? await selectOne(connection, 'SELECT id FROM client_accounts WHERE public_id = ? LIMIT 1', [payload.clientAccountId])
                : null;
            const matterId = payload.matterId
                ? await selectOne(connection, 'SELECT id FROM matters WHERE public_id = ? LIMIT 1', [payload.matterId])
                : null;
            const insert = await executeResult(connection, `INSERT INTO admin_tasks (
          public_id, client_account_id, matter_id, title, description_text, task_type_code,
          priority_code, status_code, due_at, created_by_user_id, created_at, updated_at, archived_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                createPublicId(),
                clientAccountId?.id ? Number(clientAccountId.id) : null,
                matterId?.id ? Number(matterId.id) : null,
                payload.title,
                payload.descriptionText || null,
                payload.taskTypeCode,
                payload.priorityCode,
                'todo',
                payload.dueAt ? toMysqlDateTime(payload.dueAt) : null,
                actorUserId,
                timestamp,
                timestamp,
                null,
            ]);
            const taskId = Number(insert.insertId);
            for (const assigneeUserPublicId of payload.assigneeUserIds || []) {
                const assignee = await selectOne(connection, 'SELECT id FROM users WHERE public_id = ? LIMIT 1', [assigneeUserPublicId]);
                if (!assignee?.id) {
                    throw badRequest('task_assignee_invalid', 'One or more task assignees could not be resolved.');
                }
                await connection.execute(`INSERT INTO admin_task_assignees (
            task_id, user_id, assigned_by_user_id, assigned_at, status_code
          ) VALUES (?, ?, ?, ?, ?)`, [taskId, Number(assignee.id), actorUserId, timestamp, 'active']);
            }
            await adminNotificationService.insertAuditEvent(connection, {
                actionCode: 'admin_task_created',
                actionLabel: 'Admin task created',
                actorRoleCodeSnapshot: actorRoleCode,
                actorUserId,
                entityPk: taskId,
                entityTableName: 'admin_tasks',
                sourceModule: 'Admin Tasks',
                summaryNewValue: payload.title,
            });
            const row = await selectOne(connection, 'SELECT public_id FROM admin_tasks WHERE id = ? LIMIT 1', [taskId]);
            return {
                taskId: String(row?.public_id || ''),
            };
        });
    },
    async updateTaskStatus(actorUserId, actorRoleCode, taskPublicId, input) {
        const payload = taskStatusSchema.parse(input);
        const timestamp = toMysqlDateTime(nowUtc());
        return withTransaction(getMysqlPool(), async (connection) => {
            const task = await selectOne(connection, 'SELECT id FROM admin_tasks WHERE public_id = ? AND archived_at IS NULL LIMIT 1', [taskPublicId]);
            if (!task?.id) {
                throw notFound('admin_task_not_found', 'Task not found.');
            }
            await connection.execute(`UPDATE admin_tasks
         SET status_code = ?, updated_at = ?
         WHERE id = ?`, [payload.statusCode, timestamp, Number(task.id)]);
            await adminNotificationService.insertAuditEvent(connection, {
                actionCode: 'admin_task_status_changed',
                actionLabel: 'Admin task status changed',
                actorRoleCodeSnapshot: actorRoleCode,
                actorUserId,
                entityPk: Number(task.id),
                entityTableName: 'admin_tasks',
                sourceModule: 'Admin Tasks',
                summaryNewValue: payload.statusCode,
            });
            return {
                statusCode: payload.statusCode,
                taskId: taskPublicId,
            };
        });
    },
    async addTaskComment(actorUserId, actorRoleCode, taskPublicId, input) {
        const payload = taskCommentSchema.parse(input);
        const timestamp = toMysqlDateTime(nowUtc());
        return withTransaction(getMysqlPool(), async (connection) => {
            const task = await selectOne(connection, 'SELECT id FROM admin_tasks WHERE public_id = ? AND archived_at IS NULL LIMIT 1', [taskPublicId]);
            if (!task?.id) {
                throw notFound('admin_task_not_found', 'Task not found.');
            }
            const insert = await executeResult(connection, `INSERT INTO admin_task_comments (
          public_id, task_id, created_by_user_id, body_text, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`, [createPublicId(), Number(task.id), actorUserId, payload.bodyText, timestamp, timestamp]);
            await adminNotificationService.insertAuditEvent(connection, {
                actionCode: 'admin_task_comment_added',
                actionLabel: 'Admin task comment added',
                actorRoleCodeSnapshot: actorRoleCode,
                actorUserId,
                entityPk: Number(task.id),
                entityTableName: 'admin_tasks',
                sourceModule: 'Admin Tasks',
                summaryNewValue: payload.bodyText,
            });
            return {
                commentId: Number(insert.insertId),
            };
        });
    },
    async listTaskComments(taskPublicId) {
        return withTransaction(getMysqlPool(), async (connection) => {
            const task = await selectOne(connection, 'SELECT id FROM admin_tasks WHERE public_id = ? AND archived_at IS NULL LIMIT 1', [taskPublicId]);
            if (!task?.id) {
                throw notFound('admin_task_not_found', 'Task not found.');
            }
            const comments = await selectAll(connection, `SELECT
           c.public_id,
           c.body_text,
           c.created_at,
           u.display_name
         FROM admin_task_comments c
         INNER JOIN users u
           ON u.id = c.created_by_user_id
         WHERE c.task_id = ?
         ORDER BY c.created_at ASC`, [Number(task.id)]);
            return comments.map((comment) => ({
                bodyText: comment.body_text,
                createdAt: fromMysqlDateTime(comment.created_at),
                createdByName: comment.display_name,
                id: comment.public_id,
            }));
        });
    },
};
