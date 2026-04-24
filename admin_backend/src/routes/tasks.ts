import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { getWorkspace } from '../modules/tasks/service.js';
import { requireReadPermission } from './shared.js';

export const tasksRouter = Router();

tasksRouter.get(
  '/tasks/workspace',
  asyncHandler(async (request, response) => {
    await requireReadPermission(request, 'dashboard.view');
    response.json(await getWorkspace());
  })
);
