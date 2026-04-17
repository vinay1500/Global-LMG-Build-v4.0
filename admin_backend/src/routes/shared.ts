import type { Request } from 'express';
import { forbidden } from '../lib/httpErrors.js';
import { requireAdminSession, type AdminActor } from '../modules/auth/service.js';

export const requireReadActor = async (request: Request) => requireAdminSession(request);

export const requireMutationActor = async (request: Request) =>
  requireAdminSession(request, { requireCsrf: true });

export const requirePermission = (actor: AdminActor, permissionCode: string) => {
  if (!actor.permissionCodes.includes(permissionCode)) {
    throw forbidden('insufficient_permission', `Missing required permission: ${permissionCode}`);
  }

  return actor;
};

export const requireReadPermission = async (request: Request, permissionCode: string) =>
  requirePermission(await requireReadActor(request), permissionCode);

export const requireMutationPermission = async (request: Request, permissionCode: string) =>
  requirePermission(await requireMutationActor(request), permissionCode);
