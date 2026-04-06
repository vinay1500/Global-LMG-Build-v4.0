import type { Pool, RowDataPacket } from 'mysql2/promise';
import { notFound } from '../../lib/httpErrors.js';
import { createPublicId } from '../../lib/ids.js';
import { selectOne, withConnection } from '../../lib/mysqlUtils.js';
import { ensurePlatformReady } from '../platform/bootstrap.js';

interface UserCredentialRow extends RowDataPacket {
  account_status_code: string;
  archived_at: string | null;
  display_name: string;
  email: string;
  id: number;
  last_login_at: string | null;
  login_enabled: number;
  must_rotate_password: number;
  password_changed_at: string | null;
  password_hash: string;
  public_id: string;
}

interface SessionRow extends RowDataPacket {
  account_status_code: string;
  archived_at: string | null;
  csrf_secret_hash: string;
  display_name: string;
  email: string;
  expires_at: string;
  last_login_at: string | null;
  login_enabled: number;
  must_rotate_password: number;
  public_id: string;
  remember_me: number;
  revoked_at: string | null;
  session_public_id: string;
  user_id: number;
}

export class AdminAuthRepository {
  public constructor(private readonly pool: Pool) {}

  public async initialize() {
    await ensurePlatformReady();
  }

  public async getUserCredentialByEmail(email: string) {
    await this.initialize();

    return withConnection(this.pool, async (connection) =>
      selectOne<UserCredentialRow>(
        connection,
        `SELECT
           u.id,
           u.public_id,
           u.display_name,
           u.email,
           u.account_status_code,
           u.login_enabled,
           u.last_login_at,
           u.archived_at,
           uc.password_hash,
           uc.password_changed_at,
           uc.must_rotate_password
         FROM users u
         INNER JOIN user_credentials uc
           ON uc.user_id = u.id
         WHERE u.email = ?
         LIMIT 1`,
        [email]
      )
    );
  }

  public async getInternalRoleCodes(userId: number) {
    await this.initialize();

    return withConnection(this.pool, async (connection) => {
      const [rows] = await connection.query<Array<RowDataPacket & { role_code: string }>>(
        `SELECT role_code
         FROM user_roles
         WHERE user_id = ?
           AND is_active = 1
           AND (starts_at IS NULL OR starts_at <= UTC_TIMESTAMP(6))
           AND (ends_at IS NULL OR ends_at > UTC_TIMESTAMP(6))`,
        [userId]
      );

      return rows.map((row) => row.role_code);
    });
  }

  public async createSession(input: {
    csrfSecretHash: string;
    createdAt: string;
    expiresAt: string;
    ipAddress?: string | null;
    lastSeenAt: string;
    rememberMe: boolean;
    sessionPublicId: string;
    sessionTokenHash: string;
    userAgent?: string | null;
    userId: number;
  }) {
    await this.initialize();

    return withConnection(this.pool, async (connection) => {
      await connection.execute(
        `INSERT INTO user_sessions (
          public_id, user_id, session_token_hash, csrf_secret_hash, remember_me, ip_address,
          user_agent, device_label, expires_at, last_seen_at, revoked_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.sessionPublicId,
          input.userId,
          input.sessionTokenHash,
          input.csrfSecretHash,
          input.rememberMe ? 1 : 0,
          input.ipAddress || null,
          input.userAgent || null,
          'admin-web',
          input.expiresAt,
          input.lastSeenAt,
          null,
          input.createdAt,
          input.createdAt,
        ]
      );
    });
  }

  public async revokeSession(sessionTokenHash: string) {
    await this.initialize();

    return withConnection(this.pool, async (connection) => {
      await connection.execute(
        `UPDATE user_sessions
         SET revoked_at = UTC_TIMESTAMP(6),
             updated_at = UTC_TIMESTAMP(6)
         WHERE session_token_hash = ?
           AND revoked_at IS NULL`,
        [sessionTokenHash]
      );
    });
  }

  public async revokeUserSessions(userId: number, options: { exceptSessionTokenHash?: string } = {}) {
    await this.initialize();

    return withConnection(this.pool, async (connection) => {
      const values: Array<number | string> = [userId];
      let whereClause = `user_id = ?
           AND revoked_at IS NULL`;

      if (options.exceptSessionTokenHash) {
        whereClause += ' AND session_token_hash <> ?';
        values.push(options.exceptSessionTokenHash);
      }

      await connection.execute(
        `UPDATE user_sessions
         SET revoked_at = UTC_TIMESTAMP(6),
             updated_at = UTC_TIMESTAMP(6)
         WHERE ${whereClause}`,
        values
      );
    });
  }

  public async resolveSession(sessionTokenHash: string) {
    await this.initialize();

    return withConnection(this.pool, async (connection) =>
      selectOne<SessionRow>(
        connection,
        `SELECT
           us.public_id AS session_public_id,
           us.user_id,
           u.public_id,
           u.display_name,
           u.email,
           u.account_status_code,
           u.login_enabled,
           u.archived_at,
           u.last_login_at,
           us.csrf_secret_hash,
           us.remember_me,
           us.expires_at,
           us.revoked_at,
           uc.must_rotate_password
         FROM user_sessions us
         INNER JOIN users u
           ON u.id = us.user_id
         INNER JOIN user_credentials uc
           ON uc.user_id = u.id
         WHERE us.session_token_hash = ?
         LIMIT 1`,
        [sessionTokenHash]
      )
    );
  }

  public async updateSessionCsrf(sessionTokenHash: string, csrfSecretHash: string, timestamp: string) {
    await this.initialize();

    return withConnection(this.pool, async (connection) => {
      await connection.execute(
        `UPDATE user_sessions
         SET csrf_secret_hash = ?,
             updated_at = ?
         WHERE session_token_hash = ?
           AND revoked_at IS NULL`,
        [csrfSecretHash, timestamp, sessionTokenHash]
      );
    });
  }

  public async touchSession(sessionTokenHash: string, seenAt: string) {
    await this.initialize();

    return withConnection(this.pool, async (connection) => {
      await connection.execute(
        `UPDATE user_sessions
         SET last_seen_at = ?,
             updated_at = ?
         WHERE session_token_hash = ?
           AND revoked_at IS NULL`,
        [seenAt, seenAt, sessionTokenHash]
      );
    });
  }

  public async updateUserLastLogin(userId: number, timestamp: string) {
    await this.initialize();

    return withConnection(this.pool, async (connection) => {
      await connection.execute(
        `UPDATE users
         SET last_login_at = ?,
             updated_at = ?
         WHERE id = ?`,
        [timestamp, timestamp, userId]
      );
    });
  }

  public async getUserCredentialByPublicId(userPublicId: string) {
    await this.initialize();

    return withConnection(this.pool, async (connection) =>
      selectOne<UserCredentialRow>(
        connection,
        `SELECT
           u.id,
           u.public_id,
           u.display_name,
           u.email,
           u.account_status_code,
           u.login_enabled,
           u.last_login_at,
           u.archived_at,
           uc.password_hash,
           uc.password_changed_at,
           uc.must_rotate_password
         FROM users u
         INNER JOIN user_credentials uc
           ON uc.user_id = u.id
         WHERE u.public_id = ?
         LIMIT 1`,
        [userPublicId]
      )
    );
  }

  public async updatePassword(
    userId: number,
    input: {
      mustRotatePassword: boolean;
      passwordChangedAt: string;
      passwordHash: string;
    }
  ) {
    await this.initialize();

    return withConnection(this.pool, async (connection) => {
      await connection.execute(
        `UPDATE user_credentials
         SET password_hash = ?,
             password_algo = 'scrypt',
             password_changed_at = ?,
             must_rotate_password = ?
         WHERE user_id = ?`,
        [
          input.passwordHash,
          input.passwordChangedAt,
          input.mustRotatePassword ? 1 : 0,
          userId,
        ]
      );
    });
  }

  public async recordSecurityEvent(input: {
    eventTypeCode: string;
    identifierValue?: string | null;
    ipAddress?: string | null;
    occurredAt: string;
    successFlag: boolean;
    userAgent?: string | null;
    userId?: number | null;
  }) {
    await this.initialize();

    return withConnection(this.pool, async (connection) => {
      await connection.execute(
        `INSERT INTO security_events (
          public_id,
          user_id,
          identifier_value,
          event_type_code,
          success_flag,
          ip_address,
          user_agent,
          occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createPublicId(),
          input.userId || null,
          input.identifierValue || null,
          input.eventTypeCode,
          input.successFlag ? 1 : 0,
          input.ipAddress || null,
          input.userAgent || null,
          input.occurredAt,
        ]
      );
    });
  }

  public async requireUserIdByPublicId(publicId: string) {
    await this.initialize();

    return withConnection(this.pool, async (connection) => {
      const row = await selectOne<RowDataPacket>(
        connection,
        'SELECT id FROM users WHERE public_id = ? LIMIT 1',
        [publicId]
      );

      if (!row?.id) {
        throw notFound('admin_user_not_found', 'Admin user could not be resolved.');
      }

      return Number(row.id);
    });
  }
}
