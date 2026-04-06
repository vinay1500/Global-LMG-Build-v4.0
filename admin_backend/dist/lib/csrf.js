import { env } from '../config/env.js';
import { verifySignedCsrfToken } from './authCrypto.js';
import { forbidden } from './httpErrors.js';
import { parseCookies } from './httpCookies.js';
import { authService } from '../modules/auth/authService.js';
export const requireCsrf = async (request) => {
    const cookies = parseCookies(request.headers.cookie);
    const cookieToken = cookies[env.CSRF_COOKIE_NAME];
    const sessionToken = cookies[env.SESSION_COOKIE_NAME];
    const headerToken = request.header('x-csrf-token');
    if (!cookieToken || !headerToken || !sessionToken || cookieToken !== headerToken) {
        throw forbidden('csrf_mismatch', 'CSRF validation failed.');
    }
    if (!verifySignedCsrfToken(cookieToken, env.AUTH_SESSION_SECRET)) {
        throw forbidden('csrf_invalid', 'CSRF validation failed.');
    }
    const valid = await authService.validateCsrf(sessionToken, cookieToken);
    if (!valid) {
        throw forbidden('csrf_invalid', 'CSRF validation failed.');
    }
};
