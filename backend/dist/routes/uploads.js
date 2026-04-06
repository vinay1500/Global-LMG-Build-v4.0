import express, { Router } from 'express';
import { z } from 'zod';
import { requireAuthenticatedUser } from '../lib/authSession.js';
import { requireCsrf } from '../lib/csrf.js';
import { asyncHandler, forbidden } from '../lib/httpErrors.js';
import { env } from '../config/env.js';
import { documentStorageService } from '../modules/storage/service.js';
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
const sanitizeDownloadFilename = (value) => value.replace(/["\r\n]+/g, '_').trim() || 'download.bin';
const getUploadIdParam = (request) => Array.isArray(request.params.uploadId) ? request.params.uploadId[0] || '' : request.params.uploadId;
uploadsRouter.post('/uploads/intents', asyncHandler(async (request, response) => {
    requireCsrf(request);
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    const payload = uploadIntentSchema.parse(request.body);
    const result = await documentStorageService.createUploadIntent(authenticatedUser.id, payload);
    response.status(201).json(result);
}));
uploadsRouter.put('/uploads/:uploadId/content', express.raw({
    limit: env.DOCUMENT_UPLOAD_MAX_BYTES,
    type: 'application/octet-stream',
}), asyncHandler(async (request, response) => {
    requireCsrf(request);
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    if (!Buffer.isBuffer(request.body)) {
        throw forbidden('invalid_upload_body', 'Upload content must be sent as application/octet-stream.');
    }
    const upload = await documentStorageService.storeUploadContent(authenticatedUser.id, getUploadIdParam(request), request.body);
    response.json({
        status: 'stored',
        upload,
    });
}));
uploadsRouter.get('/uploads/:uploadId/download', asyncHandler(async (request, response) => {
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    const result = await documentStorageService.getDownloadFile(authenticatedUser.id, getUploadIdParam(request));
    await new Promise((resolve, reject) => {
        response.sendFile(result.absolutePath, {
            headers: {
                'Content-Disposition': `attachment; filename="${sanitizeDownloadFilename(result.upload.originalName)}"`,
                'Content-Type': result.upload.mimeType,
            },
        }, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}));
