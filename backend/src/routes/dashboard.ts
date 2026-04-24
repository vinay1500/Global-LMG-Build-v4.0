import { type Response, Router } from 'express';
import { z } from 'zod';
import { requireAuthenticatedUser } from '../lib/authSession.js';
import { requireCsrf } from '../lib/csrf.js';
import { asyncHandler } from '../lib/httpErrors.js';
import { dashboardService } from '../modules/dashboard/service.js';
import type { PlatformUser } from '../modules/dashboard/types.js';

export const dashboardRouter = Router();

const requestDocumentSchema = z.object({
  name: z.string().trim().min(1).max(240),
  size: z.coerce.number().int().nonnegative(),
  type: z.string().trim().min(1).max(120),
});

const dashboardRequestSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  mobile: z.string().trim().min(8).max(40),
  whatsappSame: z.boolean(),
  services: z.array(z.string().trim().min(1)).min(1),
  legalDomain: z.string().trim().min(2).max(80),
  caseDetails: z.string().trim().min(10).max(5000),
  documentUploadIds: z.array(z.string().trim().min(1).max(96)).max(12).default([]),
  documents: z.array(requestDocumentSchema).max(12),
  consultationMode: z.enum(['video', 'phone', 'in-person']),
  preferredDate: z.string().trim().min(1),
  preferredTime: z.string().trim().min(1),
  urgency: z.enum(['standard', 'within-6hrs', 'within-2hrs']),
  pastLegalAction: z.boolean(),
});

const dashboardMessageSchema = z.object({
  attachmentUploadIds: z.array(z.string().trim().min(1).max(96)).max(8).default([]),
  threadId: z.string().trim().min(1),
  content: z.string().trim().max(5000).default(''),
}).refine(
  (value) => value.content.length > 0 || value.attachmentUploadIds.length > 0,
  {
    message: 'A message must include text or at least one attachment.',
    path: ['content'],
  }
);

const dashboardPackageSelectionSchema = z.object({
  matterPackageId: z.string().trim().min(1).max(64),
  proposalVersion: z.coerce.number().int().positive(),
});

const toDashboardUser = (user: Awaited<ReturnType<typeof requireAuthenticatedUser>>) =>
  ({
    avatar: user.avatar,
    email: user.email,
    id: user.id,
    joinedAt: user.joinedAt,
    lastActiveAt: user.lastActiveAt,
    lifecycle: user.lifecycle as PlatformUser['lifecycle'],
    name: user.name,
    owner: user.owner,
    phone: user.phone,
    region: user.region,
  }) satisfies PlatformUser;

const respondWithSnapshot = (response: Response, snapshot: Awaited<ReturnType<typeof dashboardService.getSnapshot>>) => {
  response.json(snapshot);
};

dashboardRouter.get(
  '/dashboard',
  asyncHandler(async (request, response) => {
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    const snapshot = await dashboardService.getSnapshot(toDashboardUser(authenticatedUser));
    respondWithSnapshot(response, snapshot);
  })
);

dashboardRouter.post(
  '/dashboard/requests',
  asyncHandler(async (request, response) => {
    requireCsrf(request);
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    const payload = dashboardRequestSchema.parse(request.body);
    const snapshot = await dashboardService.submitRequest(
      toDashboardUser(authenticatedUser),
      payload
    );
    respondWithSnapshot(response, snapshot);
  })
);

dashboardRouter.post(
  '/dashboard/messages',
  asyncHandler(async (request, response) => {
    requireCsrf(request);
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    const payload = dashboardMessageSchema.parse(request.body);
    const snapshot = await dashboardService.sendMessage(
      toDashboardUser(authenticatedUser),
      payload.threadId,
      payload.content,
      payload.attachmentUploadIds
    );
    respondWithSnapshot(response, snapshot);
  })
);

dashboardRouter.post(
  '/dashboard/matters/:matterId/package-selection',
  asyncHandler(async (request, response) => {
    requireCsrf(request);
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    const matterId = z.string().trim().min(1).max(64).parse(request.params.matterId);
    const payload = dashboardPackageSelectionSchema.parse(request.body);
    response.json(
      await dashboardService.selectMatterPackage(
        toDashboardUser(authenticatedUser),
        matterId,
        payload.matterPackageId,
        payload.proposalVersion
      )
    );
  })
);
