import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/httpErrors.js';
import { listDocuments, updateDocumentControls } from '../modules/documents/service.js';
import { requireMutationPermission, requireReadPermission } from './shared.js';

export const documentsRouter = Router();

const updateDocumentSchema = z.object({
  reviewState: z.enum(['reviewed', 'unreviewed']),
  visibility: z.enum(['client', 'internal']),
});

documentsRouter.get(
  '/documents',
  asyncHandler(async (request, response) => {
    await requireReadPermission(request, 'document.view');
    response.json(await listDocuments());
  })
);

documentsRouter.patch(
  '/documents/:documentId',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'document.manage');
    response.json(
      await updateDocumentControls(
        actor,
        String(request.params.documentId || ''),
        updateDocumentSchema.parse(request.body)
      )
    );
  })
);
