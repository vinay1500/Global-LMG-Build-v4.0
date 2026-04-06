import type { Request, Response } from 'express';
import { forbidden } from './httpErrors.js';
import { requireAuthenticatedUser } from './authSession.js';
import { accessService } from '../modules/access/service.js';

export const requireActor = async (request: Request, response: Response) => {
  const authenticatedUser = await requireAuthenticatedUser(request, response);
  return accessService.getActorByPublicId(authenticatedUser.id);
};

export const assertRole = (roleCodes: string[], allowedRoleCodes: string[]) => {
  if (!allowedRoleCodes.some((roleCode) => roleCodes.includes(roleCode))) {
    throw forbidden('insufficient_role', 'You do not have access to this resource.');
  }
};

export const assertPermission = (
  permissionCodes: string[],
  requiredPermissionCode: string
) => {
  if (!permissionCodes.includes(requiredPermissionCode)) {
    throw forbidden('insufficient_permission', 'You do not have permission for this action.');
  }
};
