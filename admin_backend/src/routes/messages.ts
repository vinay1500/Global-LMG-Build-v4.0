import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { getWorkspace } from '../modules/messages/service.js';
import { requireReadActor } from './shared.js';

export const messagesRouter = Router();

messagesRouter.get(
  '/messages/workspace',
  asyncHandler(async (request, response) => {
    await requireReadActor(request);
    response.json(await getWorkspace());
  })
);
