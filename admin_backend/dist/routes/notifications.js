import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { getMysqlPool } from '../lib/mysql.js';
import { withConnection } from '../lib/mysqlUtils.js';
import { adminNotificationService } from '../modules/notifications/service.js';
import { requireAdminPermission } from './shared.js';
export const notificationsRouter = Router();
notificationsRouter.get('/notifications', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'client_account.view', [
        'ops_admin',
        'case_manager',
        'billing_admin',
        'messaging_desk',
        'management_viewer',
    ]);
    response.json(await withConnection(getMysqlPool(), (connection) => adminNotificationService.listNotificationHistory(connection, {
        clientAccountId: typeof request.query.clientAccountId === 'string'
            ? request.query.clientAccountId
            : undefined,
        dismissed: typeof request.query.dismissed === 'string'
            ? request.query.dismissed === 'true'
            : undefined,
        isRead: typeof request.query.isRead === 'string'
            ? request.query.isRead === 'true'
            : undefined,
        limit: Number(request.query.limit || 40),
        notificationTypeCode: typeof request.query.notificationTypeCode === 'string'
            ? request.query.notificationTypeCode
            : undefined,
        offset: Number(request.query.offset || 0),
        recipientUserId: typeof request.query.recipientUserId === 'string'
            ? request.query.recipientUserId
            : undefined,
        search: typeof request.query.search === 'string' ? request.query.search : undefined,
    })));
}));
