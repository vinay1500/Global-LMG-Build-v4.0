import type { Request, Response } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { env } from '../../config/env.js';
import { createPublicId, createRandomToken, hashOpaqueValue, verifyPassword } from '../../lib/authCrypto.js';
import { clearCookie, appendCookie, parseCookies } from '../../lib/httpCookies.js';
import { queryRows } from '../../lib/mysql.js';
import { forbidden, unauthorized } from '../../lib/httpErrors.js';

const ADMIN_ROLE_CODES = new Set([
  'ops_admin',
  'case_manager',
  'billing_admin',
  'messaging_desk',
  'management_viewer',
]);

type ActorRow = RowDataPacket & {
  account_status_code: string;
  display_name: string;
  email: string;
  is_active: number | null;
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

export type AdminActor = {
  displayName: string;
  email: string;
  id: string;
  permissionCodes: string[];
  roleCodes: string[];
  sessionId?: number;
  userId: number;
};

const COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  secure: env.APP_ENV === 'production',
};

const collectActor = (rows: Array<ActorRow | SessionRow>) => {
  if (rows.length === 0) {
    return null;
  }

  const first = rows[0]!;
  const roleCodes = Array.from(
    new Set(rows.map((row) => row.role_code).filter((value): value is string => Boolean(value)))
  ).filter((roleCode) => ADMIN_ROLE_CODES.has(roleCode));

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
       ur.role_code,
       rp.permission_code,
       ur.is_active
     FROM users u
     LEFT JOIN user_credentials uc ON uc.user_id = u.id
     LEFT JOIN user_roles ur
       ON ur.user_id = u.id
      AND ur.is_active = 1
      AND (ur.starts_at IS NULL OR ur.starts_at <= UTC_TIMESTAMP(6))
      AND (ur.ends_at IS NULL OR ur.ends_at >= UTC_TIMESTAMP(6))
     LEFT JOIN role_permissions rp ON rp.role_code = ur.role_code
     WHERE (LOWER(u.email) = LOWER(?) OR u.phone = ?)
       AND u.archived_at IS NULL`,
    [identifier, identifier]
  );

  return {
    actor: collectActor(rows),
    firstRow: rows[0] || null,
  };
};

const grantDevelopmentOpsAdminRole = async (userId: number) => {
  await queryRows(
    `INSERT INTO user_roles (
       user_id, role_code, granted_by_user_id, starts_at, ends_at, is_active, created_at, updated_at
     ) VALUES (
       ?, 'ops_admin', NULL, UTC_TIMESTAMP(6), NULL, 1, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
     )
     ON DUPLICATE KEY UPDATE
       is_active = 1,
       ends_at = NULL,
       updated_at = UTC_TIMESTAMP(6)`,
    [userId]
  );
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
       ur.role_code,
       rp.permission_code
     FROM user_sessions us
     JOIN users u ON u.id = us.user_id
     LEFT JOIN user_credentials uc ON uc.user_id = u.id
     LEFT JOIN user_roles ur
       ON ur.user_id = u.id
      AND ur.is_active = 1
      AND (ur.starts_at IS NULL OR ur.starts_at <= UTC_TIMESTAMP(6))
      AND (ur.ends_at IS NULL OR ur.ends_at >= UTC_TIMESTAMP(6))
     LEFT JOIN role_permissions rp ON rp.role_code = ur.role_code
     WHERE us.session_token_hash = ?
       AND us.revoked_at IS NULL
       AND us.expires_at > UTC_TIMESTAMP(6)
       AND u.archived_at IS NULL`,
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
    user: {
      displayName: resolution.actor.displayName,
      email: resolution.actor.email,
      id: resolution.actor.id,
      mustRotatePassword: false,
      permissionCodes: resolution.actor.permissionCodes,
      roleCodes: resolution.actor.roleCodes,
    },
  };
};

export const signIn = async (
  identifier: string,
  password: string,
  rememberMe: boolean,
  request: Request,
  response: Response
) => {
  const initialResolution = await fetchActorByIdentifier(identifier);

  if (!initialResolution.firstRow?.password_hash) {
    throw unauthorized('invalid_credentials', 'Invalid email or password.');
  }

  const passwordMatches = await verifyPassword(password, initialResolution.firstRow.password_hash);
  if (!passwordMatches) {
    throw unauthorized('invalid_credentials', 'Invalid email or password.');
  }

  let actor = initialResolution.actor;

  if (!actor && env.APP_ENV === 'development') {
    await grantDevelopmentOpsAdminRole(initialResolution.firstRow.user_id);
    actor = (await fetchActorByIdentifier(identifier)).actor;
  }

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

  await queryRows(`UPDATE users SET last_login_at = UTC_TIMESTAMP(6), updated_at = UTC_TIMESTAMP(6) WHERE id = ?`, [
    actor.userId,
  ]);

  setSessionCookies(response, {
    csrfToken,
    rememberMe,
    sessionToken,
  });

  return {
    authenticated: true,
    csrfToken,
    user: {
      displayName: actor.displayName,
      email: actor.email,
      id: actor.id,
      mustRotatePassword: false,
      permissionCodes: actor.permissionCodes,
      roleCodes: actor.roleCodes,
    },
  };
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

export const requireAdminSession = async (request: Request, options?: { requireCsrf?: boolean }) => {
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

  return resolution.actor;
};
