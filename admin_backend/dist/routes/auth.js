import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireCsrf } from '../lib/csrf.js';
import { asyncHandler, unauthorized } from '../lib/httpErrors.js';
import { createRateLimitMiddleware } from '../lib/rateLimit.js';
import { authService } from '../modules/auth/authService.js';
import { accessService } from '../modules/access/service.js';
import { clearAdminSessionCookies, getCsrfTokenFromRequest, getSessionTokenFromRequest, getUserAgent, refreshCsrfCookie, setCsrfCookie, setAdminSessionCookies, } from './shared.js';
export const authRouter = Router();
const signInRateLimit = createRateLimitMiddleware({
    keyPrefix: 'admin_sign_in',
    maxRequests: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
});
const signInSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(8),
    rememberMe: z.boolean().optional(),
});
const changePasswordSchema = z.object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(12),
});
authRouter.get('/auth/session', asyncHandler(async (request, response) => {
    const rawSessionToken = getSessionTokenFromRequest(request);
    const resolution = await authService.getSession(rawSessionToken);
    if (resolution.clearSessionCookie) {
        clearAdminSessionCookies(response);
    }
    if (!resolution.user) {
        const csrfToken = refreshCsrfCookie(response);
        response.json({
            authenticated: false,
            csrfToken,
            user: null,
        });
        return;
    }
    const actor = await accessService.getActorByPublicId(resolution.user.id);
    const existingCsrfToken = getCsrfTokenFromRequest(request);
    const csrfToken = rawSessionToken &&
        existingCsrfToken &&
        (await authService.validateCsrf(rawSessionToken, existingCsrfToken))
        ? existingCsrfToken
        : await authService.rotateCsrf(rawSessionToken || '');
    setCsrfCookie(response, csrfToken);
    response.json({
        authenticated: true,
        csrfToken,
        user: {
            displayName: actor.displayName,
            email: actor.email,
            id: actor.publicId,
            mustRotatePassword: resolution.user.mustRotatePassword,
            permissionCodes: actor.permissionCodes,
            roleCodes: actor.roleCodes,
        },
    });
}));
authRouter.post('/auth/sign-in', signInRateLimit, asyncHandler(async (request, response) => {
    const payload = signInSchema.parse(request.body);
    const result = await authService.signIn(payload, {
        ipAddress: request.ip,
        userAgent: getUserAgent(request),
    });
    const actor = await accessService.getActorByPublicId(result.user.id);
    setAdminSessionCookies(response, {
        csrfToken: result.csrfToken,
        rememberMe: Boolean(payload.rememberMe),
        sessionToken: result.sessionToken,
    });
    response.json({
        authenticated: true,
        csrfToken: result.csrfToken,
        user: {
            displayName: actor.displayName,
            email: actor.email,
            id: actor.publicId,
            mustRotatePassword: result.user.mustRotatePassword,
            permissionCodes: actor.permissionCodes,
            roleCodes: actor.roleCodes,
        },
    });
}));
authRouter.post('/auth/sign-out', asyncHandler(async (request, response) => {
    await requireCsrf(request);
    await authService.signOut(getSessionTokenFromRequest(request));
    clearAdminSessionCookies(response);
    response.json({
        status: 'signed_out',
    });
}));
authRouter.post('/auth/change-password', asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const rawSessionToken = getSessionTokenFromRequest(request);
    const session = await authService.getSession(rawSessionToken);
    if (!session.user) {
        throw unauthorized('auth_required', 'Authentication is required.');
    }
    const actor = await accessService.getActorByPublicId(session.user.id);
    const payload = changePasswordSchema.parse(request.body);
    await authService.changePassword(actor.publicId, payload, {
        ipAddress: request.ip,
        rawSessionToken,
        userAgent: getUserAgent(request),
    });
    const csrfToken = await authService.rotateCsrf(rawSessionToken || '');
    setCsrfCookie(response, csrfToken);
    response.json({
        csrfToken,
        status: 'password_changed',
    });
}));
