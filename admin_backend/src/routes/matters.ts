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
  quotedTotalAmount: z.number().nonnegative().optional(),
  selectedServices: z.array(z.string().trim().min(2).max(64)).max(20).optional(),
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
