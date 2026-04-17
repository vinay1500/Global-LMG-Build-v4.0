import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { getWorkspace } from '../modules/rbac/service.js';
import { requireReadPermission } from './shared.js';

export const rbacRouter = Router();

rbacRouter.get(
  '/rbac/workspace',
  asyncHandler(async (request, response) => {
    await requireReadPermission(request, 'rbac.manage');
    response.json(await getWorkspace());
  })
);
