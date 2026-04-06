import { Router } from 'express';
import { requireCsrf } from '../lib/csrf.js';
import { asyncHandler } from '../lib/httpErrors.js';
import { adminTaskService } from '../modules/tasks/service.js';
import { requireAdminPermission, getRouteParam } from './shared.js';
export const tasksRouter = Router();
tasksRouter.get('/tasks', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'task.view', [
        'ops_admin',
        'case_manager',
        'billing_admin',
        'messaging_desk',
        'management_viewer',
    ]);
    response.json(await adminTaskService.listTasks());
}));
tasksRouter.post('/tasks', asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'task.manage', [
        'ops_admin',
        'case_manager',
        'billing_admin',
        'messaging_desk',
    ]);
    response
        .status(201)
        .json(await adminTaskService.createTask(actor.userId, actor.roleCodes[0] || actor.actorTypeCode, request.body));
}));
tasksRouter.get('/tasks/:taskId/comments', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'task.view', [
        'ops_admin',
        'case_manager',
        'billing_admin',
        'messaging_desk',
        'management_viewer',
    ]);
    response.json(await adminTaskService.listTaskComments(getRouteParam(request.params.taskId)));
}));
tasksRouter.patch('/tasks/:taskId/status', asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'task.manage', [
        'ops_admin',
        'case_manager',
        'billing_admin',
        'messaging_desk',
    ]);
    response.json(await adminTaskService.updateTaskStatus(actor.userId, actor.roleCodes[0] || actor.actorTypeCode, getRouteParam(request.params.taskId), request.body));
}));
tasksRouter.post('/tasks/:taskId/comments', asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'task.manage', [
        'ops_admin',
        'case_manager',
        'billing_admin',
        'messaging_desk',
    ]);
    response
        .status(201)
        .json(await adminTaskService.addTaskComment(actor.userId, actor.roleCodes[0] || actor.actorTypeCode, getRouteParam(request.params.taskId), request.body));
}));
