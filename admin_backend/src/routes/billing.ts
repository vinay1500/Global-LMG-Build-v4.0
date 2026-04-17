import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { getWorkspace } from '../modules/billing/service.js';
import { requireReadActor } from './shared.js';

export const billingRouter = Router();

billingRouter.get(
  '/billing/workspace',
  asyncHandler(async (request, response) => {
    await requireReadActor(request);
    response.json(await getWorkspace());
  })
);
