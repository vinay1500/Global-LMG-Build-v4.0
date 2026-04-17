import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { listDocuments } from '../modules/documents/service.js';
import { requireReadActor } from './shared.js';

export const documentsRouter = Router();

documentsRouter.get(
  '/documents',
  asyncHandler(async (request, response) => {
    await requireReadActor(request);
    response.json(await listDocuments());
  })
);
