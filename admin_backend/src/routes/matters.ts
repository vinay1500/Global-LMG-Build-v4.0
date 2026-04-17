import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { getMatterWorkspace, listMatters } from '../modules/matters/service.js';
import { requireReadActor } from './shared.js';

export const mattersRouter = Router();

mattersRouter.get(
  '/matters',
  asyncHandler(async (request, response) => {
    await requireReadActor(request);
    response.json(
      await listMatters({
        limit: Number(request.query.limit || 100),
        search: typeof request.query.search === 'string' ? request.query.search : undefined,
      })
    );
  })
);

mattersRouter.get(
  '/matters/:matterId',
  asyncHandler(async (request, response) => {
    await requireReadActor(request);
    response.json(await getMatterWorkspace(String(request.params.matterId || '')));
  })
);
