import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { getWorkspace } from '../modules/settings/service.js';
import { requireReadActor, requirePermission } from './shared.js';

export const settingsRouter = Router();

settingsRouter.get(
  '/settings/workspace',
  asyncHandler(async (request, response) => {
    const actor = requirePermission(await requireReadActor(request), 'dashboard.view');
    response.json(await getWorkspace(actor));
  })
);
