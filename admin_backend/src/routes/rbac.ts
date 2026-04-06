import { Router } from 'express';
import { z } from 'zod';
import { requireCsrf } from '../lib/csrf.js';
import { asyncHandler } from '../lib/httpErrors.js';
import { domainService } from '../modules/domain/service.js';
import { requireAdminPermission, getRouteParam } from './shared.js';

export const rbacRouter = Router();

const replaceUserRolesSchema = z.object({
  roleCodes: z.array(z.string().trim().min(2).max(64)).min(1).max(20),
});

const createAdminUserSchema = z.object({
  displayName: z.string().trim().min(2).max(160),
  email: z.string().trim().email(),
  password: z.string().min(12).max(128),
  requirePasswordRotation: z.boolean().optional(),
  roleCodes: z.array(z.string().trim().min(2).max(64)).min(1).max(20),
});

const resetAdminPasswordSchema = z.object({
  newPassword: z.string().min(12).max(128),
  requirePasswordRotation: z.boolean().optional(),
});

const updateAdminUserAccessSchema = z.object({
  accountStatusCode: z.string().trim().min(2).max(64).optional(),
  archived: z.boolean().optional(),
  loginEnabled: z.boolean().optional(),
});

rbacRouter.get(
  '/rbac/roles',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'rbac.manage', ['ops_admin']);
    response.json(await domainService.listRoles());
  })
);

rbacRouter.get(
  '/rbac/permissions',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'rbac.manage', ['ops_admin']);
    response.json(await domainService.listPermissions());
  })
);

rbacRouter.get(
  '/rbac/users',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'rbac.manage', ['ops_admin']);
    response.json(await domainService.listUsersWithRoles());
  })
);

rbacRouter.put(
  '/rbac/users/:userId/roles',
  asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'rbac.manage', ['ops_admin']);
    const payload = replaceUserRolesSchema.parse(request.body);
    response.json(
      await domainService.replaceUserRoles(
        actor.publicId,
        getRouteParam(request.params.userId),
        payload
      )
    );
  })
);

rbacRouter.post(
  '/rbac/users',
  asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'rbac.manage', ['ops_admin']);
    response
      .status(201)
      .json(await domainService.createAdminUser(actor.publicId, createAdminUserSchema.parse(request.body)));
  })
);

rbacRouter.post(
  '/rbac/users/:userId/reset-password',
  asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'rbac.manage', ['ops_admin']);
    response.json(
      await domainService.resetAdminUserPassword(
        actor.publicId,
        getRouteParam(request.params.userId),
        resetAdminPasswordSchema.parse(request.body)
      )
    );
  })
);

rbacRouter.patch(
  '/rbac/users/:userId/access',
  asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'rbac.manage', ['ops_admin']);
    response.json(
      await domainService.updateAdminUserAccess(
        actor.publicId,
        getRouteParam(request.params.userId),
        updateAdminUserAccessSchema.parse(request.body)
      )
    );
  })
);
