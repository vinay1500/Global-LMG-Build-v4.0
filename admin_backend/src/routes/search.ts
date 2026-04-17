import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { searchWorkspace } from '../modules/search/service.js';
import { requireReadPermission } from './shared.js';

export const searchRouter = Router();

searchRouter.get(
  '/search',
  asyncHandler(async (request, response) => {
    await requireReadPermission(request, 'dashboard.view');
    response.json(
      await searchWorkspace(typeof request.query.q === 'string' ? request.query.q : '')
    );
  })
);
