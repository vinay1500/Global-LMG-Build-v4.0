import { env } from '../../config/env.js';
import { createRandomToken, createSignedCsrfToken, hashPassword, hashOpaqueValue, verifyPassword, } from '../../lib/authCrypto.js';
import { conflict, forbidden, unauthorized } from '../../lib/httpErrors.js';
import { createPublicId } from '../../lib/ids.js';
import { getMysqlPool } from '../../lib/mysql.js';
import { nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { AdminAuthRepository } from './repository.js';
const INTERNAL_ROLE_CODES = new Set([
    'ops_admin',
    'case_manager',
    'billing_admin',
    'messaging_desk',
    'management_viewer',
]);
let repositoryPromise = null;
const getRepository = async () => {
    if (!repositoryPromise) {
        repositoryPromise = (async () => {
            const repository = new AdminAuthRepository(getMysqlPool());
            await repository.initialize();
            return repository;
        })().catch((error) => {
            repositoryPromise = null;
            throw error;
        });
    }
    return repositoryPromise;
};
const normalizeEmail = (value) => value.trim().toLowerCase();
const addHours = (hours) => new Date(Date.now() + hours * 60 * 60_000).toISOString();
const addDays = (days) => new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
const hashSessionToken = (rawSessionToken) => hashOpaqueValue(rawSessionToken, env.AUTH_SESSION_SECRET);
const hashCsrfToken = (rawCsrfToken) => hashOpaqueValue(rawCsrfToken, env.AUTH_SESSION_SECRET);
export const authService = {
    async signIn(input, options = {}) {
        const repository = await getRepository();
        const email = normalizeEmail(input.email);
        const occurredAt = toMysqlDateTime(nowUtc());
        const user = await repository.getUserCredentialByEmail(email);
        if (!user) {
            await repository.recordSecurityEvent({
                eventTypeCode: 'admin_sign_in',
                identifierValue: email,
                ipAddress: options.ipAddress,
                occurredAt,
                successFlag: false,
                userAgent: options.userAgent,
            });
            throw unauthorized('invalid_credentials', 'Email or password is incorrect.');
        }
        if (user.archived_at) {
            await repository.recordSecurityEvent({
                eventTypeCode: 'admin_sign_in',
                identifierValue: email,
                ipAddress: options.ipAddress,
                occurredAt,
                successFlag: false,
                userAgent: options.userAgent,
                userId: Number(user.id),
            });
            throw forbidden('admin_account_archived', 'This admin account is archived.');
        }
        if (!user.login_enabled) {
            await repository.recordSecurityEvent({
                eventTypeCode: 'admin_sign_in',
                identifierValue: email,
                ipAddress: options.ipAddress,
                occurredAt,
                successFlag: false,
                userAgent: options.userAgent,
                userId: Number(user.id),
            });
            throw forbidden('admin_login_disabled', 'This admin account is disabled.');
        }
        if (user.account_status_code !== 'active') {
            await repository.recordSecurityEvent({
                eventTypeCode: 'admin_sign_in',
                identifierValue: email,
                ipAddress: options.ipAddress,
                occurredAt,
                successFlag: false,
                userAgent: options.userAgent,
                userId: Number(user.id),
            });
            throw forbidden('admin_account_inactive', 'This admin account is not active.');
        }
        const passwordOk = await verifyPassword(input.password, user.password_hash);
        if (!passwordOk) {
            await repository.recordSecurityEvent({
                eventTypeCode: 'admin_sign_in',
                identifierValue: email,
                ipAddress: options.ipAddress,
                occurredAt,
                successFlag: false,
                userAgent: options.userAgent,
                userId: Number(user.id),
            });
            throw unauthorized('invalid_credentials', 'Email or password is incorrect.');
        }
        const roleCodes = await repository.getInternalRoleCodes(Number(user.id));
        if (!roleCodes.some((roleCode) => INTERNAL_ROLE_CODES.has(roleCode))) {
            await repository.recordSecurityEvent({
                eventTypeCode: 'admin_sign_in',
                identifierValue: email,
                ipAddress: options.ipAddress,
                occurredAt,
                successFlag: false,
                userAgent: options.userAgent,
                userId: Number(user.id),
            });
            throw forbidden('admin_role_required', 'This account is not assigned an internal admin role.');
        }
        const rememberMe = Boolean(input.rememberMe);
        const sessionToken = createRandomToken();
        const csrfToken = createSignedCsrfToken(env.AUTH_SESSION_SECRET);
        const timestamp = nowUtc();
        const expiresAt = rememberMe ? addDays(env.REMEMBER_ME_TTL_DAYS) : addHours(env.SESSION_TTL_HOURS);
        await repository.createSession({
            csrfSecretHash: hashOpaqueValue(csrfToken, env.AUTH_SESSION_SECRET),
            createdAt: toMysqlDateTime(timestamp),
            expiresAt: toMysqlDateTime(expiresAt),
            ipAddress: options.ipAddress,
            lastSeenAt: toMysqlDateTime(timestamp),
            rememberMe,
            sessionPublicId: createPublicId(),
            sessionTokenHash: hashOpaqueValue(sessionToken, env.AUTH_SESSION_SECRET),
            userAgent: options.userAgent,
            userId: Number(user.id),
        });
        await repository.updateUserLastLogin(Number(user.id), toMysqlDateTime(timestamp));
        await repository.recordSecurityEvent({
            eventTypeCode: 'admin_sign_in',
            identifierValue: email,
            ipAddress: options.ipAddress,
            occurredAt: toMysqlDateTime(timestamp),
            successFlag: true,
            userAgent: options.userAgent,
            userId: Number(user.id),
        });
        return {
            csrfToken,
            sessionToken,
            user: {
                email: user.email,
                id: user.public_id,
                lastActiveAt: timestamp,
                mustRotatePassword: Boolean(user.must_rotate_password),
                name: user.display_name,
            },
        };
    },
    async getSession(rawSessionToken) {
        if (!rawSessionToken) {
            return { user: null };
        }
        const repository = await getRepository();
        const session = await repository.resolveSession(hashSessionToken(rawSessionToken));
        if (!session) {
            return {
                clearSessionCookie: true,
                user: null,
            };
        }
        if (session.revoked_at ||
            session.archived_at ||
            !session.login_enabled ||
            session.account_status_code !== 'active' ||
            new Date(session.expires_at).getTime() <= Date.now()) {
            return {
                clearSessionCookie: true,
                user: null,
            };
        }
        const roleCodes = await repository.getInternalRoleCodes(Number(session.user_id));
        if (!roleCodes.some((roleCode) => INTERNAL_ROLE_CODES.has(roleCode))) {
            throw conflict('admin_session_role_missing', 'This session belongs to a user without an active admin role.');
        }
        const seenAt = toMysqlDateTime(nowUtc());
        await repository.touchSession(hashSessionToken(rawSessionToken), seenAt);
        return {
            user: {
                email: session.email,
                id: session.public_id,
                lastActiveAt: session.last_login_at || seenAt,
                mustRotatePassword: Boolean(session.must_rotate_password),
                name: session.display_name,
            },
        };
    },
    async validateCsrf(rawSessionToken, rawCsrfToken) {
        const repository = await getRepository();
        const session = await repository.resolveSession(hashSessionToken(rawSessionToken));
        if (!session) {
            return false;
        }
        if (session.revoked_at ||
            session.archived_at ||
            !session.login_enabled ||
            session.account_status_code !== 'active' ||
            new Date(session.expires_at).getTime() <= Date.now()) {
            return false;
        }
        return session.csrf_secret_hash === hashCsrfToken(rawCsrfToken);
    },
    async rotateCsrf(rawSessionToken) {
        const repository = await getRepository();
        const session = await repository.resolveSession(hashSessionToken(rawSessionToken));
        if (!session) {
            throw unauthorized('auth_required', 'Authentication is required.');
        }
        if (session.revoked_at ||
            session.archived_at ||
            !session.login_enabled ||
            session.account_status_code !== 'active' ||
            new Date(session.expires_at).getTime() <= Date.now()) {
            throw unauthorized('auth_required', 'Authentication is required.');
        }
        const csrfToken = createSignedCsrfToken(env.AUTH_SESSION_SECRET);
        await repository.updateSessionCsrf(hashSessionToken(rawSessionToken), hashCsrfToken(csrfToken), toMysqlDateTime(nowUtc()));
        return csrfToken;
    },
    async changePassword(userPublicId, input, options = {}) {
        const repository = await getRepository();
        const user = await repository.getUserCredentialByPublicId(userPublicId);
        if (!user) {
            throw unauthorized('auth_required', 'Authentication is required.');
        }
        if (user.archived_at || !user.login_enabled || user.account_status_code !== 'active') {
            throw forbidden('admin_account_inactive', 'This admin account is not active.');
        }
        const passwordOk = await verifyPassword(input.currentPassword, user.password_hash);
        if (!passwordOk) {
            await repository.recordSecurityEvent({
                eventTypeCode: 'admin_password_change',
                identifierValue: user.email,
                ipAddress: options.ipAddress,
                occurredAt: toMysqlDateTime(nowUtc()),
                successFlag: false,
                userAgent: options.userAgent,
                userId: Number(user.id),
            });
            throw unauthorized('invalid_credentials', 'Current password is incorrect.');
        }
        const passwordHash = await hashPassword(input.newPassword);
        const timestamp = toMysqlDateTime(nowUtc());
        await repository.updatePassword(Number(user.id), {
            mustRotatePassword: false,
            passwordChangedAt: timestamp,
            passwordHash,
        });
        await repository.revokeUserSessions(Number(user.id), {
            exceptSessionTokenHash: options.rawSessionToken
                ? hashSessionToken(options.rawSessionToken)
                : undefined,
        });
        await repository.recordSecurityEvent({
            eventTypeCode: 'admin_password_change',
            identifierValue: user.email,
            ipAddress: options.ipAddress,
            occurredAt: timestamp,
            successFlag: true,
            userAgent: options.userAgent,
            userId: Number(user.id),
        });
    },
    async signOut(rawSessionToken) {
        if (!rawSessionToken) {
            return;
        }
        const repository = await getRepository();
        await repository.revokeSession(hashSessionToken(rawSessionToken));
    },
};
