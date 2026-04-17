import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { getWorkspace } from '../modules/dashboard/service.js';
import { requireReadPermission } from './shared.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/dashboard',
  asyncHandler(async (request, response) => {
    await requireReadPermission(request, 'dashboard.view');
    response.json(await getWorkspace());
  })
);
