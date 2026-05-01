import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/httpErrors.js';
import {
  getAdminAccount,
  updateAdminPreferences,
  updateAdminProfile,
} from '../modules/account/service.js';
import { changePassword, getSession, requireAdminSession, signIn, signOut } from '../modules/auth/service.js';

export const authRouter = Router();

const signInSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(8),
  rememberMe: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});

const profileUpdateSchema = z.object({
  city: z.string().trim().max(100).nullable().optional(),
  displayName: z.string().trim().min(2).max(160).optional(),
  jobTitle: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  state: z.string().trim().max(100).nullable().optional(),
});

const preferencesUpdateSchema = z.object({
  avatarColor: z.string().trim().max(32).optional(),
  dateFormat: z.string().trim().min(2).max(32).optional(),
  defaultLandingPath: z
    .enum([
      '/dashboard',
      '/clients',
      '/matters',
      '/requests',
      '/billing',
      '/messages',
      '/documents',
      '/meetings',
      '/reports',
      '/notifications',
    ])
    .optional(),
  densityCode: z.enum(['comfortable', 'compact']).optional(),
  inAppNotificationsEnabled: z.boolean().optional(),
  timezoneName: z.string().trim().min(1).max(64).optional(),
});

authRouter.get(
  '/auth/session',
  asyncHandler(async (request, response) => {
    response.json(await getSession(request, response));
  })
);

authRouter.get(
  '/auth/me',
  asyncHandler(async (request, response) => {
    const actor = await requireAdminSession(request);
    response.json(await getAdminAccount(actor));
  })
);

authRouter.patch(
  '/auth/me',
  asyncHandler(async (request, response) => {
    const actor = await requireAdminSession(request, { requireCsrf: true });
    response.json(await updateAdminProfile(actor, profileUpdateSchema.parse(request.body)));
  })
);

authRouter.patch(
  '/auth/preferences',
  asyncHandler(async (request, response) => {
    const actor = await requireAdminSession(request, { requireCsrf: true });
    response.json(await updateAdminPreferences(actor, preferencesUpdateSchema.parse(request.body)));
  })
);

authRouter.post(
  '/auth/sign-in',
  asyncHandler(async (request, response) => {
    const payload = signInSchema.parse(request.body);
    response.json(
      await signIn(
        payload.identifier,
        payload.password,
        Boolean(payload.rememberMe),
        request,
        response
      )
    );
  })
);

authRouter.post(
  '/auth/password',
  asyncHandler(async (request, response) => {
    const payload = changePasswordSchema.parse(request.body);
    response.json(await changePassword(request, payload.currentPassword, payload.newPassword));
  })
);

authRouter.post(
  '/auth/sign-out',
  asyncHandler(async (request, response) => {
    response.json(await signOut(request, response));
  })
);
