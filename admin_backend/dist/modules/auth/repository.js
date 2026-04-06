import { notFound } from '../../lib/httpErrors.js';
import { createPublicId } from '../../lib/ids.js';
import { selectOne, withConnection } from '../../lib/mysqlUtils.js';
import { ensurePlatformReady } from '../platform/bootstrap.js';
export class AdminAuthRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async initialize() {
        await ensurePlatformReady();
    }
    async getUserCredentialByEmail(email) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => selectOne(connection, `SELECT
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
         LIMIT 1`, [email]));
    }
    async getInternalRoleCodes(userId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            const [rows] = await connection.query(`SELECT role_code
         FROM user_roles
         WHERE user_id = ?
           AND is_active = 1
           AND (starts_at IS NULL OR starts_at <= UTC_TIMESTAMP(6))
           AND (ends_at IS NULL OR ends_at > UTC_TIMESTAMP(6))`, [userId]);
            return rows.map((row) => row.role_code);
        });
    }
    async createSession(input) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            await connection.execute(`INSERT INTO user_sessions (
          public_id, user_id, session_token_hash, csrf_secret_hash, remember_me, ip_address,
          user_agent, device_label, expires_at, last_seen_at, revoked_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
            ]);
        });
    }
    async revokeSession(sessionTokenHash) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            await connection.execute(`UPDATE user_sessions
         SET revoked_at = UTC_TIMESTAMP(6),
             updated_at = UTC_TIMESTAMP(6)
         WHERE session_token_hash = ?
           AND revoked_at IS NULL`, [sessionTokenHash]);
        });
    }
    async revokeUserSessions(userId, options = {}) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            const values = [userId];
            let whereClause = `user_id = ?
           AND revoked_at IS NULL`;
            if (options.exceptSessionTokenHash) {
                whereClause += ' AND session_token_hash <> ?';
                values.push(options.exceptSessionTokenHash);
            }
            await connection.execute(`UPDATE user_sessions
         SET revoked_at = UTC_TIMESTAMP(6),
             updated_at = UTC_TIMESTAMP(6)
         WHERE ${whereClause}`, values);
        });
    }
    async resolveSession(sessionTokenHash) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => selectOne(connection, `SELECT
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
         LIMIT 1`, [sessionTokenHash]));
    }
    async updateSessionCsrf(sessionTokenHash, csrfSecretHash, timestamp) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            await connection.execute(`UPDATE user_sessions
         SET csrf_secret_hash = ?,
             updated_at = ?
         WHERE session_token_hash = ?
           AND revoked_at IS NULL`, [csrfSecretHash, timestamp, sessionTokenHash]);
        });
    }
    async touchSession(sessionTokenHash, seenAt) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            await connection.execute(`UPDATE user_sessions
         SET last_seen_at = ?,
             updated_at = ?
         WHERE session_token_hash = ?
           AND revoked_at IS NULL`, [seenAt, seenAt, sessionTokenHash]);
        });
    }
    async updateUserLastLogin(userId, timestamp) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            await connection.execute(`UPDATE users
         SET last_login_at = ?,
             updated_at = ?
         WHERE id = ?`, [timestamp, timestamp, userId]);
        });
    }
    async getUserCredentialByPublicId(userPublicId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => selectOne(connection, `SELECT
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
         LIMIT 1`, [userPublicId]));
    }
    async updatePassword(userId, input) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            await connection.execute(`UPDATE user_credentials
         SET password_hash = ?,
             password_algo = 'scrypt',
             password_changed_at = ?,
             must_rotate_password = ?
         WHERE user_id = ?`, [
                input.passwordHash,
                input.passwordChangedAt,
                input.mustRotatePassword ? 1 : 0,
                userId,
            ]);
        });
    }
    async recordSecurityEvent(input) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            await connection.execute(`INSERT INTO security_events (
          public_id,
          user_id,
          identifier_value,
          event_type_code,
          success_flag,
          ip_address,
          user_agent,
          occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                createPublicId(),
                input.userId || null,
                input.identifierValue || null,
                input.eventTypeCode,
                input.successFlag ? 1 : 0,
                input.ipAddress || null,
                input.userAgent || null,
                input.occurredAt,
            ]);
        });
    }
    async requireUserIdByPublicId(publicId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            const row = await selectOne(connection, 'SELECT id FROM users WHERE public_id = ? LIMIT 1', [publicId]);
            if (!row?.id) {
                throw notFound('admin_user_not_found', 'Admin user could not be resolved.');
            }
            return Number(row.id);
        });
    }
}
