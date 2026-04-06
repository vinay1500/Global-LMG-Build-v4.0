import { Router } from 'express';
import { z } from 'zod';
import { requireCsrf } from '../lib/csrf.js';
import { asyncHandler } from '../lib/httpErrors.js';
import { adminClientService } from '../modules/clients/service.js';
import { requireAdminPermission, getRouteParam } from './shared.js';
export const clientsRouter = Router();
const updatePortalAccessSchema = z.object({
    portalAccessEnabled: z.boolean(),
});
clientsRouter.get('/clients', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'client_account.view', [
        'ops_admin',
        'case_manager',
        'billing_admin',
        'messaging_desk',
        'management_viewer',
    ]);
    response.json(await adminClientService.listClients({
        limit: Number(request.query.limit || 20),
        offset: Number(request.query.offset || 0),
        search: typeof request.query.search === 'string' ? request.query.search : undefined,
    }));
}));
clientsRouter.get('/clients/:clientAccountId', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'client_account.view', [
        'ops_admin',
        'case_manager',
        'billing_admin',
        'messaging_desk',
        'management_viewer',
    ]);
    response.json(await adminClientService.getClient360(getRouteParam(request.params.clientAccountId)));
}));
clientsRouter.patch('/clients/:clientAccountId/portal-users/:userId/access', asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'client_account.manage', [
        'ops_admin',
        'case_manager',
    ]);
    response.json(await adminClientService.updatePortalUserAccess(actor.userId, getRouteParam(request.params.clientAccountId), getRouteParam(request.params.userId), updatePortalAccessSchema.parse(request.body).portalAccessEnabled));
}));
clientsRouter.post('/clients/:clientAccountId/portal-users/:userId/force-sign-out', asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'client_account.manage', [
        'ops_admin',
        'case_manager',
    ]);
    response.json(await adminClientService.forceSignOutPortalUser(actor.userId, getRouteParam(request.params.clientAccountId), getRouteParam(request.params.userId)));
}));
