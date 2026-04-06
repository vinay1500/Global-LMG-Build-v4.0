import { Router } from 'express';
import { requireCsrf } from '../lib/csrf.js';
import { asyncHandler, badRequest } from '../lib/httpErrors.js';
import { adminDocumentService } from '../modules/documents/service.js';
import { requireAdminPermission, getRouteParam, getUserAgent } from './shared.js';
export const documentsRouter = Router();
const sanitizeDownloadFilename = (value) => value.replace(/["\r\n]+/g, '_').trim() || 'download.bin';
const isSafeInlinePreviewMimeType = (mimeType) => ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain'].includes(mimeType.toLowerCase());
documentsRouter.get('/documents', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'document.view', [
        'ops_admin',
        'case_manager',
        'messaging_desk',
        'management_viewer',
    ]);
    response.json(await adminDocumentService.listDocuments({
        limit: Number(request.query.limit || 20),
        offset: Number(request.query.offset || 0),
        search: typeof request.query.search === 'string' ? request.query.search : undefined,
    }));
}));
documentsRouter.get('/documents/:documentId', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'document.view', [
        'ops_admin',
        'case_manager',
        'messaging_desk',
        'management_viewer',
    ]);
    response.json(await adminDocumentService.getDocument(getRouteParam(request.params.documentId)));
}));
documentsRouter.get('/documents/:documentId/preview', asyncHandler(async (request, response) => {
    const actor = await requireAdminPermission(request, response, 'document.view', [
        'ops_admin',
        'case_manager',
        'messaging_desk',
        'management_viewer',
    ]);
    const result = await adminDocumentService.previewDocument(actor.publicId, getRouteParam(request.params.documentId), {
        ipAddress: request.ip,
        userAgent: getUserAgent(request),
    });
    if (!isSafeInlinePreviewMimeType(result.mimeType)) {
        throw badRequest('document_preview_unsupported', 'This file type does not support safe inline preview. Download it instead.');
    }
    await new Promise((resolve, reject) => {
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.sendFile(result.absolutePath, {
            headers: {
                'Content-Disposition': `inline; filename="${sanitizeDownloadFilename(result.originalName)}"`,
                'Content-Type': result.mimeType,
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
documentsRouter.get('/documents/:documentId/download', asyncHandler(async (request, response) => {
    const actor = await requireAdminPermission(request, response, 'document.download', [
        'ops_admin',
        'case_manager',
        'messaging_desk',
    ]);
    const result = await adminDocumentService.downloadDocument(actor.publicId, getRouteParam(request.params.documentId), {
        ipAddress: request.ip,
        userAgent: getUserAgent(request),
    });
    await new Promise((resolve, reject) => {
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.sendFile(result.absolutePath, {
            headers: {
                'Content-Disposition': `attachment; filename="${sanitizeDownloadFilename(result.originalName)}"`,
                'Content-Type': result.mimeType,
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
documentsRouter.patch('/documents/:documentId/visibility', asyncHandler(async (request, response) => {
    await requireCsrf(request);
    await requireAdminPermission(request, response, 'document.manage', ['ops_admin', 'case_manager']);
    response.json(await adminDocumentService.updateVisibility(getRouteParam(request.params.documentId), request.body));
}));
