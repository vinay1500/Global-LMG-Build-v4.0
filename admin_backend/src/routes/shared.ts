import type { Request, Response } from 'express';
import { appendCookie, clearCookie, parseCookies } from '../lib/httpCookies.js';
import { createSignedCsrfToken } from '../lib/authCrypto.js';
import { env } from '../config/env.js';
import { assertPermission, assertRole, requireActor } from '../lib/authorization.js';

const cookieSecurity = {
  path: '/',
  sameSite: 'lax' as const,
  secure: env.APP_ENV !== 'development',
};

export const getRouteParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || '' : value || '';

export const getUserAgent = (request: Request) => request.header('user-agent') || null;

export const setAdminSessionCookies = (
  response: Response,
  input: {
    csrfToken: string;
    rememberMe: boolean;
    sessionToken: string;
  }
) => {
  appendCookie(response, env.SESSION_COOKIE_NAME, input.sessionToken, {
    ...cookieSecurity,
    httpOnly: true,
    maxAge: input.rememberMe
      ? env.REMEMBER_ME_TTL_DAYS * 24 * 60 * 60
      : env.SESSION_TTL_HOURS * 60 * 60,
  });
  appendCookie(response, env.CSRF_COOKIE_NAME, input.csrfToken, {
    ...cookieSecurity,
    maxAge: input.rememberMe
      ? env.REMEMBER_ME_TTL_DAYS * 24 * 60 * 60
      : env.SESSION_TTL_HOURS * 60 * 60,
  });
};

export const refreshCsrfCookie = (response: Response) => {
  const csrfToken = createSignedCsrfToken(env.AUTH_SESSION_SECRET);
  appendCookie(response, env.CSRF_COOKIE_NAME, csrfToken, cookieSecurity);
  return csrfToken;
};

export const setCsrfCookie = (response: Response, csrfToken: string) => {
  appendCookie(response, env.CSRF_COOKIE_NAME, csrfToken, cookieSecurity);
};

export const clearAdminSessionCookies = (response: Response) => {
  clearCookie(response, env.SESSION_COOKIE_NAME, cookieSecurity);
  clearCookie(response, env.CSRF_COOKIE_NAME, cookieSecurity);
};

export const requireAdminPermission = async (
  request: Request,
  response: Response,
  permissionCode: string,
  allowedRoleCodes: string[]
) => {
  const actor = await requireActor(request, response);
  assertRole(actor.roleCodes, allowedRoleCodes);
  assertPermission(actor.permissionCodes, permissionCode);
  return actor;
};

export const getSessionTokenFromRequest = (request: Request) => {
  const cookies = parseCookies(request.headers.cookie);
  return cookies[env.SESSION_COOKIE_NAME];
};

export const getCsrfTokenFromRequest = (request: Request) => {
  const cookies = parseCookies(request.headers.cookie);
  return cookies[env.CSRF_COOKIE_NAME];
};
