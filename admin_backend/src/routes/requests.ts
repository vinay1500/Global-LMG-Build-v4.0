import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { getWorkspace } from '../modules/requests/service.js';
import { requireReadPermission } from './shared.js';

export const requestsRouter = Router();

requestsRouter.get(
  '/requests/workspace',
  asyncHandler(async (request, response) => {
    await requireReadPermission(request, 'matter.view');
    response.json(await getWorkspace());
  })
);
