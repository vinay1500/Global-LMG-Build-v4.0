import type { Request, Response } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { env } from '../../config/env.js';
import {
  createPublicId,
  createRandomToken,
  hashOpaqueValue,
  hashPassword,
  verifyPassword,
} from '../../lib/authCrypto.js';
import { clearCookie, appendCookie, parseCookies } from '../../lib/httpCookies.js';
import { executeStatement, queryRows, withTransaction } from '../../lib/mysql.js';
import {
  AppError,
  badRequest,
  forbidden,
  tooManyRequests,
  unauthorized,
} from '../../lib/httpErrors.js';
import { createAuditEvent } from '../writeSupport.js';

type ActorRow = RowDataPacket & {
  account_status_code: string;
  display_name: string;
  email: string;
  login_enabled: number;
  must_rotate_password: number | null;
  permission_code: string | null;
  password_hash: string | null;
  public_id: string;
  role_code: string | null;
  user_id: number;
};

type SessionRow = RowDataPacket & {
  account_status_code: string;
  csrf_secret_hash: string;
  display_name: string;
  email: string;
  expires_at: string;
  login_enabled: number;
  must_rotate_password: number | null;
  permission_code: string | null;
  public_id: string;
  role_code: string | null;
  session_id: number;
  user_id: number;
};

type CredentialRow = RowDataPacket & {
  must_rotate_password: number;
  password_hash: string;
};

export type AdminActor = {
  displayName: string;
  email: string;
  id: string;
  mustRotatePassword: boolean;
  permissionCodes: string[];
  roleCodes: string[];
  sessionId?: number;
  userId: number;
};

const SIGN_IN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const SIGN_IN_RATE_LIMIT_LOCK_MS = 10 * 60 * 1000;
const SIGN_IN_RATE_LIMIT_MAX_FAILURES = 5;

type SignInAttemptState = {
  failureCount: number;
  firstFailureAt: number;
  lockedUntil?: number;
};

const signInAttempts = new Map<string, SignInAttemptState>();

const COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  secure: env.APP_ENV === 'production',
};

const toAdminSessionUser = (actor: AdminActor) => ({
  displayName: actor.displayName,
  email: actor.email,
  id: actor.id,
  mustRotatePassword: actor.mustRotatePassword,
  permissionCodes: actor.permissionCodes,
  roleCodes: actor.roleCodes,
});

const normalizeIdentifier = (identifier: string) => identifier.trim().toLowerCase();

const getRateLimitKey = (identifier: string, request: Request) =>
  `${request.ip || request.socket.remoteAddress || 'unknown'}:${normalizeIdentifier(identifier)}`;

const assertSignInAllowed = (key: string) => {
  const now = Date.now();
  const state = signInAttempts.get(key);

  if (!state) {
    return;
  }

  if (state.lockedUntil && state.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((state.lockedUntil - now) / 1000);
    throw tooManyRequests(
      'admin_sign_in_rate_limited',
      `Too many failed sign-in attempts. Try again in ${retryAfterSeconds} seconds.`,
      { retryAfterSeconds }
    );
  }

  if (now - state.firstFailureAt > SIGN_IN_RATE_LIMIT_WINDOW_MS) {
    signInAttempts.delete(key);
  }
};

const recordSignInFailure = (key: string) => {
  const now = Date.now();
  const current = signInAttempts.get(key);
  const next: SignInAttemptState =
    current && now - current.firstFailureAt <= SIGN_IN_RATE_LIMIT_WINDOW_MS
      ? {
          failureCount: current.failureCount + 1,
          firstFailureAt: current.firstFailureAt,
        }
      : {
          failureCount: 1,
          firstFailureAt: now,
        };

  if (next.failureCount >= SIGN_IN_RATE_LIMIT_MAX_FAILURES) {
    next.lockedUntil = now + SIGN_IN_RATE_LIMIT_LOCK_MS;
  }

  signInAttempts.set(key, next);
};

const clearSignInFailures = (key: string) => {
  signInAttempts.delete(key);
};

const shouldCountSignInFailure = (error: unknown) =>
  error instanceof AppError &&
  ['invalid_credentials', 'admin_access_required'].includes(error.code);

const validateStrongPassword = (
  newPassword: string,
  actor: Pick<AdminActor, 'displayName' | 'email'>
) => {
  const issues: string[] = [];
  const normalizedPassword = newPassword.toLowerCase();
  const emailLocalPart = actor.email.split('@')[0]?.toLowerCase() || '';
  const displayTokens = actor.displayName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);

  if (newPassword.length < 12) {
    issues.push('Use at least 12 characters.');
  }

  if (!/[a-z]/.test(newPassword)) {
    issues.push('Include a lowercase letter.');
  }

  if (!/[A-Z]/.test(newPassword)) {
    issues.push('Include an uppercase letter.');
  }

  if (!/[0-9]/.test(newPassword)) {
    issues.push('Include a number.');
  }

  if (!/[^A-Za-z0-9]/.test(newPassword)) {
    issues.push('Include a symbol.');
  }

  if (emailLocalPart.length >= 4 && normalizedPassword.includes(emailLocalPart)) {
    issues.push('Do not include the email username.');
  }

  if (displayTokens.some((token) => normalizedPassword.includes(token))) {
    issues.push('Do not include your display name.');
  }

  if (issues.length > 0) {
    throw badRequest(
      'password_strength_failed',
      'The new password does not meet admin security requirements.',
      issues
    );
  }
};

const collectActor = (rows: Array<ActorRow | SessionRow>) => {
  if (rows.length === 0) {
    return null;
  }

  const first = rows[0]!;
  const roleCodes = Array.from(
    new Set(rows.map((row) => row.role_code).filter((value): value is string => Boolean(value)))
  ).filter((roleCode) => roleCode !== 'client');

  if (!first.login_enabled || roleCodes.length === 0) {
    return null;
  }

  const permissionCodes = Array.from(
    new Set(
      rows.map((row) => row.permission_code).filter((value): value is string => Boolean(value))
    )
  );

  return {
    displayName: first.display_name,
    email: first.email,
    id: first.public_id,
    mustRotatePassword: Boolean(first.must_rotate_password),
    permissionCodes,
    roleCodes,
    sessionId: 'session_id' in first ? first.session_id : undefined,
    userId: first.user_id,
  } satisfies AdminActor;
};

const getSessionToken = (request: Request) =>
  parseCookies(request.headers.cookie)[env.SESSION_COOKIE_NAME] || null;

const getCsrfToken = (request: Request) =>
  request.header('x-csrf-token') || parseCookies(request.headers.cookie)[env.CSRF_COOKIE_NAME] || null;

const setSessionCookies = (
  response: Response,
  payload: { csrfToken: string; rememberMe: boolean; sessionToken: string }
) => {
  appendCookie(response, env.SESSION_COOKIE_NAME, payload.sessionToken, {
    ...COOKIE_OPTIONS,
    httpOnly: true,
    maxAge: payload.rememberMe ? env.REMEMBER_ME_TTL_DAYS * 24 * 60 * 60 : undefined,
  });
  appendCookie(response, env.CSRF_COOKIE_NAME, payload.csrfToken, {
    ...COOKIE_OPTIONS,
    httpOnly: false,
    maxAge: payload.rememberMe ? env.REMEMBER_ME_TTL_DAYS * 24 * 60 * 60 : undefined,
  });
};

export const clearSessionCookies = (response: Response) => {
  clearCookie(response, env.SESSION_COOKIE_NAME, COOKIE_OPTIONS);
  clearCookie(response, env.CSRF_COOKIE_NAME, COOKIE_OPTIONS);
};

const fetchActorByIdentifier = async (identifier: string) => {
  const rows = await queryRows<ActorRow>(
    `SELECT
       u.id AS user_id,
       u.public_id,
       u.email,
       u.display_name,
       u.login_enabled,
       u.account_status_code,
       uc.password_hash,
       uc.must_rotate_password,
       r.code AS role_code,
       rp.permission_code
     FROM users u
     LEFT JOIN user_credentials uc ON uc.user_id = u.id
     LEFT JOIN user_roles ur
       ON ur.user_id = u.id
      AND ur.is_active = 1
      AND (ur.starts_at IS NULL OR ur.starts_at <= UTC_TIMESTAMP(6))
      AND (ur.ends_at IS NULL OR ur.ends_at >= UTC_TIMESTAMP(6))
     LEFT JOIN roles r
       ON r.code = ur.role_code
      AND r.is_active = 1
      AND r.code <> 'client'
     LEFT JOIN role_permissions rp ON rp.role_code = r.code
     WHERE (LOWER(u.email) = LOWER(?) OR u.phone = ?)
       AND u.archived_at IS NULL
       AND u.actor_type_code <> 'client'`,
    [identifier, identifier]
  );

  return {
    actor: collectActor(rows),
    firstRow: rows[0] || null,
  };
};

const fetchActorBySessionToken = async (rawSessionToken: string) => {
  const hashedToken = hashOpaqueValue(rawSessionToken, env.AUTH_SESSION_SECRET);
  const rows = await queryRows<SessionRow>(
    `SELECT
       us.id AS session_id,
       us.user_id,
       us.csrf_secret_hash,
       us.expires_at,
       u.public_id,
       u.email,
       u.display_name,
       u.login_enabled,
       u.account_status_code,
       uc.must_rotate_password,
       r.code AS role_code,
       rp.permission_code
     FROM user_sessions us
     JOIN users u ON u.id = us.user_id
     LEFT JOIN user_credentials uc ON uc.user_id = u.id
     LEFT JOIN user_roles ur
       ON ur.user_id = u.id
      AND ur.is_active = 1
      AND (ur.starts_at IS NULL OR ur.starts_at <= UTC_TIMESTAMP(6))
      AND (ur.ends_at IS NULL OR ur.ends_at >= UTC_TIMESTAMP(6))
     LEFT JOIN roles r
       ON r.code = ur.role_code
      AND r.is_active = 1
      AND r.code <> 'client'
     LEFT JOIN role_permissions rp ON rp.role_code = r.code
     WHERE us.session_token_hash = ?
       AND us.revoked_at IS NULL
       AND us.expires_at > UTC_TIMESTAMP(6)
       AND u.archived_at IS NULL
       AND u.actor_type_code <> 'client'`,
    [hashedToken]
  );

  if (rows.length === 0) {
    return null;
  }

  const actor = collectActor(rows);
  if (!actor) {
    return null;
  }

  return {
    actor,
    csrfHash: rows[0]!.csrf_secret_hash,
    sessionId: rows[0]!.session_id,
  };
};

export const getSession = async (request: Request, response: Response) => {
  const rawSessionToken = getSessionToken(request);

  if (!rawSessionToken) {
    clearSessionCookies(response);
    return {
      authenticated: false,
      csrfToken: null,
      user: null,
    };
  }

  const resolution = await fetchActorBySessionToken(rawSessionToken);

  if (!resolution) {
    clearSessionCookies(response);
    return {
      authenticated: false,
      csrfToken: null,
      user: null,
    };
  }

  await queryRows(`UPDATE user_sessions SET last_seen_at = UTC_TIMESTAMP(6), updated_at = UTC_TIMESTAMP(6) WHERE id = ?`, [
    resolution.sessionId,
  ]);

  const csrfToken = getCsrfToken(request) || createRandomToken(18);
  const expectedHash = hashOpaqueValue(csrfToken, env.AUTH_SESSION_SECRET);

  if (expectedHash !== resolution.csrfHash) {
    await queryRows(`UPDATE user_sessions SET csrf_secret_hash = ?, updated_at = UTC_TIMESTAMP(6) WHERE id = ?`, [
      expectedHash,
      resolution.sessionId,
    ]);
  }

  appendCookie(response, env.CSRF_COOKIE_NAME, csrfToken, {
    ...COOKIE_OPTIONS,
    httpOnly: false,
  });

  return {
    authenticated: true,
    csrfToken,
    user: toAdminSessionUser(resolution.actor),
  };
};

export const signIn = async (
  identifier: string,
  password: string,
  rememberMe: boolean,
  request: Request,
  response: Response
) => {
  const rateLimitKey = getRateLimitKey(identifier, request);
  assertSignInAllowed(rateLimitKey);

  try {
    const initialResolution = await fetchActorByIdentifier(identifier);

    if (!initialResolution.firstRow?.password_hash) {
      throw unauthorized('invalid_credentials', 'Invalid email or password.');
    }

    const passwordMatches = await verifyPassword(password, initialResolution.firstRow.password_hash);
    if (!passwordMatches) {
      throw unauthorized('invalid_credentials', 'Invalid email or password.');
    }

    const actor = initialResolution.actor;

    if (!actor) {
      throw forbidden(
        'admin_access_required',
        'This account does not have admin access yet. Ask an existing admin to grant a role.'
      );
    }

    const sessionToken = createRandomToken();
    const csrfToken = createRandomToken(18);
    const sessionTokenHash = hashOpaqueValue(sessionToken, env.AUTH_SESSION_SECRET);
    const csrfTokenHash = hashOpaqueValue(csrfToken, env.AUTH_SESSION_SECRET);

    await queryRows(
      `INSERT INTO user_sessions (
         public_id, user_id, session_token_hash, csrf_secret_hash, remember_me, ip_address,
         user_agent, device_label, expires_at, last_seen_at, revoked_at, created_at, updated_at
       ) VALUES (
         ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(6) + INTERVAL ? HOUR, UTC_TIMESTAMP(6),
         NULL, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
       )`,
      [
        createPublicId(),
        actor.userId,
        sessionTokenHash,
        csrfTokenHash,
        rememberMe ? 1 : 0,
        request.ip,
        request.header('user-agent')?.trim() || null,
        null,
        rememberMe ? env.REMEMBER_ME_TTL_DAYS * 24 : env.SESSION_TTL_HOURS,
      ]
    );

    await queryRows(
      `UPDATE users SET last_login_at = UTC_TIMESTAMP(6), updated_at = UTC_TIMESTAMP(6) WHERE id = ?`,
      [actor.userId]
    );

    clearSignInFailures(rateLimitKey);

    setSessionCookies(response, {
      csrfToken,
      rememberMe,
      sessionToken,
    });

    return {
      authenticated: true,
      csrfToken,
      user: toAdminSessionUser(actor),
    };
  } catch (error) {
    if (shouldCountSignInFailure(error)) {
      recordSignInFailure(rateLimitKey);
    }

    throw error;
  }
};

export const signOut = async (request: Request, response: Response) => {
  const rawSessionToken = getSessionToken(request);
  const csrfToken = getCsrfToken(request);

  if (!rawSessionToken) {
    clearSessionCookies(response);
    return { status: 'signed_out' as const };
  }

  const resolution = await fetchActorBySessionToken(rawSessionToken);

  if (!resolution) {
    clearSessionCookies(response);
    return { status: 'signed_out' as const };
  }

  if (!csrfToken || hashOpaqueValue(csrfToken, env.AUTH_SESSION_SECRET) !== resolution.csrfHash) {
    throw forbidden('csrf_mismatch', 'CSRF validation failed.');
  }

  await queryRows(`UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP(6), updated_at = UTC_TIMESTAMP(6) WHERE id = ?`, [
    resolution.sessionId,
  ]);

  clearSessionCookies(response);
  return { status: 'signed_out' as const };
};

export const changePassword = async (
  request: Request,
  currentPassword: string,
  newPassword: string
) => {
  const actor = await requireAdminSession(request, {
    allowPasswordRotationRequired: true,
    requireCsrf: true,
  });

  if (newPassword === currentPassword) {
    throw badRequest(
      'password_reuse_not_allowed',
      'The new password must be different from the current password.'
    );
  }

  validateStrongPassword(newPassword, actor);

  const credentialRows = await queryRows<CredentialRow>(
    `SELECT password_hash, must_rotate_password
     FROM user_credentials
     WHERE user_id = ?
     LIMIT 1`,
    [actor.userId]
  );
  const credential = credentialRows[0] || null;

  if (!credential) {
    throw unauthorized('invalid_credentials', 'Invalid current password.');
  }

  const currentPasswordMatches = await verifyPassword(currentPassword, credential.password_hash);
  if (!currentPasswordMatches) {
    throw unauthorized('invalid_credentials', 'Invalid current password.');
  }

  const nextPasswordHash = await hashPassword(newPassword);

  await withTransaction(async (connection) => {
    await executeStatement<ResultSetHeader>(
      `UPDATE user_credentials
       SET password_hash = ?,
           password_algo = 'scrypt',
           password_changed_at = UTC_TIMESTAMP(6),
           must_rotate_password = 0
       WHERE user_id = ?`,
      [nextPasswordHash, actor.userId],
      connection
    );

    await executeStatement(
      `UPDATE user_sessions
       SET revoked_at = UTC_TIMESTAMP(6), updated_at = UTC_TIMESTAMP(6)
       WHERE user_id = ?
         AND id <> ?
         AND revoked_at IS NULL`,
      [actor.userId, actor.sessionId || 0],
      connection
    );

    await createAuditEvent(
      {
        actionCode: 'admin.password_changed',
        actionLabel: 'Admin password changed',
        actorRoleCode: actor.roleCodes[0] || 'ops_admin',
        actorUserId: actor.userId,
        changes: [
          {
            fieldName: 'must_rotate_password',
            newValue: false,
            oldValue: Boolean(credential.must_rotate_password),
          },
        ],
        entityPk: actor.userId,
        entityTableName: 'users',
        sourceModule: 'admin_auth',
        summaryNewValue: { mustRotatePassword: false },
        summaryOldValue: { mustRotatePassword: Boolean(credential.must_rotate_password) },
      },
      connection
    );
  });

  return {
    status: 'password_changed' as const,
    user: toAdminSessionUser({
      ...actor,
      mustRotatePassword: false,
    }),
  };
};

export const requireAdminSession = async (
  request: Request,
  options?: { allowPasswordRotationRequired?: boolean; requireCsrf?: boolean }
) => {
  const rawSessionToken = getSessionToken(request);

  if (!rawSessionToken) {
    throw unauthorized('auth_required', 'Authentication is required.');
  }

  const resolution = await fetchActorBySessionToken(rawSessionToken);

  if (!resolution) {
    throw unauthorized('auth_required', 'Authentication is required.');
  }

  if (options?.requireCsrf) {
    const csrfToken = getCsrfToken(request);
    if (!csrfToken || hashOpaqueValue(csrfToken, env.AUTH_SESSION_SECRET) !== resolution.csrfHash) {
      throw forbidden('csrf_mismatch', 'CSRF validation failed.');
    }
  }

  if (resolution.actor.mustRotatePassword && !options?.allowPasswordRotationRequired) {
    throw forbidden(
      'password_rotation_required',
      'Admin password rotation is required before accessing this resource.'
    );
  }

  return resolution.actor;
};
