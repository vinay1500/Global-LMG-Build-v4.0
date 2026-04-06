import { Router } from 'express';
import { z } from 'zod';
import { requireCsrf } from '../lib/csrf.js';
import { asyncHandler } from '../lib/httpErrors.js';
import { domainService } from '../modules/domain/service.js';
import { adminMatterService } from '../modules/matters/service.js';
import { requireAdminPermission, getRouteParam } from './shared.js';

export const mattersRouter = Router();

const updateMatterStageSchema = z.object({
  changeNote: z.string().trim().max(2000).optional(),
  operationalStatusCode: z.string().trim().min(2).max(64).optional(),
  stageCode: z.string().trim().min(2).max(64),
  visibleToClient: z.boolean().optional(),
});

mattersRouter.get(
  '/matters',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'matter.view', [
      'ops_admin',
      'case_manager',
      'management_viewer',
    ]);

    response.json(
      await adminMatterService.listMatters({
        limit: Number(request.query.limit || 20),
        offset: Number(request.query.offset || 0),
        search: typeof request.query.search === 'string' ? request.query.search : undefined,
        stageCode: typeof request.query.stageCode === 'string' ? request.query.stageCode : undefined,
        statusCode:
          typeof request.query.statusCode === 'string' ? request.query.statusCode : undefined,
      })
    );
  })
);

mattersRouter.get(
  '/matters/:matterId',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'matter.view', [
      'ops_admin',
      'case_manager',
      'management_viewer',
    ]);
    response.json(await adminMatterService.getMatterWorkspace(getRouteParam(request.params.matterId)));
  })
);

mattersRouter.patch(
  '/matters/:matterId/stage',
  asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'matter.update', [
      'ops_admin',
      'case_manager',
    ]);
    const payload = updateMatterStageSchema.parse(request.body);
    response.json(
      await domainService.updateMatterStage(
        actor.publicId,
        actor.roleCodes[0] || actor.actorTypeCode,
        getRouteParam(request.params.matterId),
        payload
      )
    );
  })
);

mattersRouter.post(
  '/matters/:matterId/updates',
  asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'matter.update', [
      'ops_admin',
      'case_manager',
    ]);
    response
      .status(201)
      .json(
        await adminMatterService.createMatterUpdate(
          actor.userId,
          actor.roleCodes[0] || actor.actorTypeCode,
          getRouteParam(request.params.matterId),
          request.body
        )
      );
  })
);

mattersRouter.post(
  '/matters/:matterId/internal-notes',
  asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'matter.update', [
      'ops_admin',
      'case_manager',
    ]);
    response
      .status(201)
      .json(
        await adminMatterService.addInternalNote(
          actor.userId,
          actor.roleCodes[0] || actor.actorTypeCode,
          getRouteParam(request.params.matterId),
          request.body
        )
      );
  })
);
