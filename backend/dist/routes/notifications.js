import { Router } from 'express';
import { z } from 'zod';
import { requireAuthenticatedUser } from '../lib/authSession.js';
import { requireCsrf } from '../lib/csrf.js';
import { asyncHandler } from '../lib/httpErrors.js';
import { notificationsService } from '../modules/notifications/service.js';
export const notificationsRouter = Router();
const notificationParamsSchema = z.object({
    notificationId: z.string().trim().min(1).max(64),
});
notificationsRouter.get('/notifications', asyncHandler(async (request, response) => {
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    const notifications = await notificationsService.listForUser(authenticatedUser.id);
    response.json(notifications);
}));
notificationsRouter.post('/notifications/:notificationId/read', asyncHandler(async (request, response) => {
    requireCsrf(request);
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    const { notificationId } = notificationParamsSchema.parse(request.params);
    await notificationsService.markRead(authenticatedUser.id, notificationId);
    response.status(204).send();
}));
notificationsRouter.post('/notifications/:notificationId/dismiss', asyncHandler(async (request, response) => {
    requireCsrf(request);
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    const { notificationId } = notificationParamsSchema.parse(request.params);
    await notificationsService.dismiss(authenticatedUser.id, notificationId);
    response.status(204).send();
}));
