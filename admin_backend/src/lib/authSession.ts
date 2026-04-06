import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { unauthorized } from './httpErrors.js';
import { clearCookie, parseCookies } from './httpCookies.js';
import { authService } from '../modules/auth/authService.js';

const cookieSecurity = {
  path: '/',
  sameSite: 'lax' as const,
  secure: env.APP_ENV !== 'development',
};

export const requireAuthenticatedUser = async (request: Request, response: Response) => {
  const cookies = parseCookies(request.headers.cookie);
  const resolution = await authService.getSession(cookies[env.SESSION_COOKIE_NAME]);

  if (resolution.clearSessionCookie) {
    clearCookie(response, env.SESSION_COOKIE_NAME, cookieSecurity);
  }

  if (!resolution.user) {
    throw unauthorized('auth_required', 'Authentication is required.');
  }

  return resolution.user;
};
