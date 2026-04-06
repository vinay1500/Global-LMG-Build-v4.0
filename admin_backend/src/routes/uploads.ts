import express, { Router } from 'express';
import { z } from 'zod';
import { requireCsrf } from '../lib/csrf.js';
import { asyncHandler, forbidden } from '../lib/httpErrors.js';
import { env } from '../config/env.js';
import { documentStorageService } from '../modules/storage/service.js';
import { requireAdminPermission, getRouteParam } from './shared.js';

export const uploadsRouter = Router();

const uploadIntentSchema = z.object({
  checksumSha256: z.string().trim().regex(/^[a-f0-9]{64}$/i),
  mimeType: z.string().trim().min(3).max(160),
  originalName: z.string().trim().min(1).max(255),
  relatedEntityId: z.string().trim().min(1).max(128).optional(),
  relatedEntityType: z.string().trim().min(1).max(64).optional(),
  sizeBytes: z.coerce.number().int().positive().max(env.DOCUMENT_UPLOAD_MAX_BYTES),
  sourceModule: z.string().trim().min(2).max(64),
});

uploadsRouter.post(
  '/uploads/intents',
  asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'document.manage', [
      'ops_admin',
      'case_manager',
      'messaging_desk',
    ]);
    const payload = uploadIntentSchema.parse(request.body);
    const result = await documentStorageService.createUploadIntent(actor.publicId, payload);
    response.status(201).json({
      ...result,
      uploadUrl: `/api/v1/admin/uploads/${result.uploadId}/content`,
    });
  })
);

uploadsRouter.put(
  '/uploads/:uploadId/content',
  express.raw({
    limit: env.DOCUMENT_UPLOAD_MAX_BYTES,
    type: 'application/octet-stream',
  }),
  asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'document.manage', [
      'ops_admin',
      'case_manager',
      'messaging_desk',
    ]);

    if (!Buffer.isBuffer(request.body)) {
      throw forbidden('invalid_upload_body', 'Upload content must be sent as application/octet-stream.');
    }

    const upload = await documentStorageService.storeUploadContent(
      actor.publicId,
      getRouteParam(request.params.uploadId),
      request.body
    );

    response.json({
      status: 'stored',
      upload,
    });
  })
);
