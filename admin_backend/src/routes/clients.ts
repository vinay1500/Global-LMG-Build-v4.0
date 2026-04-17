import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { getClientWorkspace, listClients } from '../modules/clients/service.js';
import { requireReadActor } from './shared.js';

export const clientsRouter = Router();

clientsRouter.get(
  '/clients',
  asyncHandler(async (request, response) => {
    await requireReadActor(request);
    response.json(
      await listClients({
        limit: Number(request.query.limit || 100),
        offset: Number(request.query.offset || 0),
        search: typeof request.query.search === 'string' ? request.query.search : undefined,
      })
    );
  })
);

clientsRouter.get(
  '/clients/:clientAccountId',
  asyncHandler(async (request, response) => {
    await requireReadActor(request);
    response.json(await getClientWorkspace(String(request.params.clientAccountId || '')));
  })
);
