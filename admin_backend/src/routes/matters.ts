import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/httpErrors.js';
import {
  addMatterNote,
  createMatterAssignment,
  getMatterWorkspace,
  listMatters,
  updateMatterDetails,
  updateMatterStage,
} from '../modules/matters/service.js';
import {
  archiveProposal,
  getMatterPackageProposals,
  overridePackageSelection,
  publishProposal,
  saveDraftProposal,
} from '../modules/packages/service.js';
import { requireMutationPermission, requireReadPermission } from './shared.js';

export const mattersRouter = Router();

const updateStageSchema = z.object({
  changeNote: z.string().trim().max(2000).optional(),
  operationalStatusCode: z.string().trim().min(2).max(64).optional(),
  stageCode: z.string().trim().min(2).max(64),
  visibleToClient: z.boolean().optional(),
});

const createMatterNoteSchema = z.object({
  bodyText: z.string().trim().min(2).max(4000),
  title: z.string().trim().min(2).max(200),
  visibleToClient: z.boolean().optional(),
});

const assignmentSchema = z.object({
  assignmentRoleCode: z.string().trim().min(2).max(64),
  counselPartnerId: z.string().trim().min(2).max(64).optional(),
  feeAgreedAmount: z.number().nonnegative().optional(),
  feeDueAmount: z.number().nonnegative().optional(),
  feePaidAmount: z.number().nonnegative().optional(),
  internalUserId: z.string().trim().min(2).max(64).optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional(),
});

const updateMatterDetailsSchema = z.object({
  issueSummary: z.string().trim().min(2).max(4000).optional(),
  operationalStatusCode: z.string().trim().min(2).max(64).optional(),
  priorityCode: z.string().trim().min(2).max(64).optional(),
  quotedTotalAmount: z.number().nonnegative().optional(),
  selectedServices: z.array(z.string().trim().min(2).max(64)).max(20).optional(),
});

const packageDraftSchema = z.object({
  proposalVersion: z.number().int().positive().optional(),
  packages: z
    .array(
      z.object({
        description: z.string().trim().max(2000).optional(),
        displayOrder: z.number().int().min(0).optional(),
        featurePoints: z.array(z.string().trim().min(1).max(255)).max(25).optional(),
        id: z.string().trim().min(2).max(64).optional(),
        isRecommended: z.boolean().optional(),
        name: z.string().trim().min(2).max(160),
        price: z.number().nonnegative(),
        serviceCodes: z.array(z.string().trim().min(2).max(64)).max(20).optional(),
      })
    )
    .min(1)
    .max(8),
});

const packagePublishSchema = z.object({
  note: z.string().trim().max(2000).optional(),
  proposalVersion: z.number().int().positive(),
});

const packageOverrideSchema = z.object({
  matterPackageId: z.string().trim().min(2).max(64),
  reasonText: z.string().trim().min(5).max(2000),
});

mattersRouter.get(
  '/matters',
  asyncHandler(async (request, response) => {
    await requireReadPermission(request, 'matter.view');
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
    await requireReadPermission(request, 'matter.view');
    response.json(await getMatterWorkspace(String(request.params.matterId || '')));
  })
);

mattersRouter.get(
  '/matters/:matterId/package-proposals',
  asyncHandler(async (request, response) => {
    await requireReadPermission(request, 'matter.view');
    response.json(await getMatterPackageProposals(String(request.params.matterId || '')));
  })
);

mattersRouter.patch(
  '/matters/:matterId',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'matter.update');
    response.json(
      await updateMatterDetails(
        actor,
        String(request.params.matterId || ''),
        updateMatterDetailsSchema.parse(request.body)
      )
    );
  })
);

mattersRouter.patch(
  '/matters/:matterId/stage',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'matter.update');
    response.json(
      await updateMatterStage(
        actor,
        String(request.params.matterId || ''),
        updateStageSchema.parse(request.body)
      )
    );
  })
);

mattersRouter.put(
  '/matters/:matterId/package-proposals/draft',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'matter.update');
    response.json(
      await saveDraftProposal(
        actor,
        String(request.params.matterId || ''),
        packageDraftSchema.parse(request.body)
      )
    );
  })
);

mattersRouter.post(
  '/matters/:matterId/package-proposals/publish',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'matter.update');
    response.json(
      await publishProposal(
        actor,
        String(request.params.matterId || ''),
        packagePublishSchema.parse(request.body)
      )
    );
  })
);

mattersRouter.post(
  '/matters/:matterId/package-selection/override',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'matter.update');
    response.json(
      await overridePackageSelection(
        actor,
        String(request.params.matterId || ''),
        packageOverrideSchema.parse(request.body)
      )
    );
  })
);

mattersRouter.post(
  '/matters/:matterId/notes',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'matter.update');
    response.status(201).json(
      await addMatterNote(
        actor,
        String(request.params.matterId || ''),
        createMatterNoteSchema.parse(request.body)
      )
    );
  })
);

mattersRouter.post(
  '/matters/:matterId/assignments',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'matter.update');
    response.status(201).json(
      await createMatterAssignment(
        actor,
        String(request.params.matterId || ''),
        assignmentSchema.parse(request.body)
      )
    );
  })
);

mattersRouter.post(
  '/matters/:matterId/package-proposals/:proposalVersion/archive',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'matter.update');
    response.json(
      await archiveProposal(
        actor,
        String(request.params.matterId || ''),
        z.coerce.number().int().positive().parse(request.params.proposalVersion)
      )
    );
  })
);
