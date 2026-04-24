import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { getWorkspace } from '../modules/reports/service.js';
import { requireReadPermission } from './shared.js';

export const reportsRouter = Router();

reportsRouter.get(
  '/reports/workspace',
  asyncHandler(async (request, response) => {
    await requireReadPermission(request, 'dashboard.view');
    response.json(await getWorkspace());
  })
);
