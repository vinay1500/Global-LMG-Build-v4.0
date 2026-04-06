import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { adminRequestService } from '../modules/requests/service.js';
import { getRouteParam, requireAdminPermission } from './shared.js';
export const requestsRouter = Router();
requestsRouter.get('/requests', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'client_account.view', [
        'ops_admin',
        'case_manager',
        'billing_admin',
        'messaging_desk',
        'management_viewer',
    ]);
    response.json(await adminRequestService.listRequests({
        limit: Number(request.query.limit || 20),
        offset: Number(request.query.offset || 0),
        search: typeof request.query.search === 'string' ? request.query.search : undefined,
        statusCode: typeof request.query.statusCode === 'string' ? request.query.statusCode : undefined,
    }));
}));
requestsRouter.get('/requests/:requestId', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'client_account.view', [
        'ops_admin',
        'case_manager',
        'billing_admin',
        'messaging_desk',
        'management_viewer',
    ]);
    response.json(await adminRequestService.getRequest(getRouteParam(request.params.requestId)));
}));
