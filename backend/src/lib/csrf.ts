import type { Request } from 'express';
import { env } from '../config/env.js';
import { verifySignedCsrfToken } from './authCrypto.js';
import { forbidden } from './httpErrors.js';
import { parseCookies } from './httpCookies.js';
import { recordSecurityEventSafely } from './securityEvents.js';

export const requireCsrf = (request: Request) => {
  const cookies = parseCookies(request.headers.cookie);
  const cookieToken = cookies[env.CSRF_COOKIE_NAME];
  const headerToken = request.header('x-csrf-token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    recordSecurityEventSafely({
      eventTypeCode: 'client.csrf_mismatch',
      success: false,
    });
    throw forbidden('csrf_mismatch', 'CSRF validation failed.');
  }

  if (!verifySignedCsrfToken(cookieToken, env.AUTH_SESSION_SECRET)) {
    recordSecurityEventSafely({
      eventTypeCode: 'client.csrf_mismatch',
      success: false,
    });
    throw forbidden('csrf_invalid', 'CSRF validation failed.');
  }
};
