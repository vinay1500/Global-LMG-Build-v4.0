import { Router } from 'express';
import { requireCsrf } from '../lib/csrf.js';
import { asyncHandler } from '../lib/httpErrors.js';
import { adminEventService } from '../modules/events/service.js';
import { requireAdminPermission, getRouteParam } from './shared.js';
export const eventsRouter = Router();
eventsRouter.get('/events', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'event.view', [
        'ops_admin',
        'case_manager',
        'management_viewer',
    ]);
    response.json(await adminEventService.listEvents());
}));
eventsRouter.get('/events/:eventId', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'event.view', [
        'ops_admin',
        'case_manager',
        'management_viewer',
    ]);
    response.json(await adminEventService.getEvent(getRouteParam(request.params.eventId)));
}));
eventsRouter.post('/events', asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'event.manage', [
        'ops_admin',
        'case_manager',
    ]);
    response
        .status(201)
        .json(await adminEventService.createEvent(actor.userId, actor.roleCodes[0] || actor.actorTypeCode, request.body));
}));
eventsRouter.put('/events/:eventId', asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'event.manage', [
        'ops_admin',
        'case_manager',
    ]);
    response.json(await adminEventService.updateEvent(actor.userId, actor.roleCodes[0] || actor.actorTypeCode, getRouteParam(request.params.eventId), request.body));
}));
eventsRouter.post('/events/:eventId/cancel', asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'event.manage', [
        'ops_admin',
        'case_manager',
    ]);
    response.json(await adminEventService.cancelEvent(actor.userId, actor.roleCodes[0] || actor.actorTypeCode, getRouteParam(request.params.eventId), request.body));
}));
