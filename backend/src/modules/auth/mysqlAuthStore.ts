import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { fromMysqlDateTime, nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { createPublicId } from '../../lib/ids.js';
import { selectOne, withConnection, withTransaction } from '../../lib/mysqlUtils.js';
import { ensurePlatformReady } from '../platform/bootstrap.js';
import { allocateBusinessNumber } from '../platform/sequences.js';
import type {
  AuthAccountRecord,
  AuthFlowRecord,
  AuthSessionRecord,
  AuthStore,
  LegalAcceptanceRecord,
  PendingChallenge,
} from './types.js';

interface AccountRow extends RowDataPacket {
  created_at: string | Date;
  display_name: string;
  email: string;
  email_verified_at: string | Date | null;
  has_google: number;
  last_login_at: string | Date | null;
  password_hash: string | null;
  phone: string | null;
  phone_verified_at: string | Date | null;
  public_id: string;
  region: string | null;
}

interface FlowRow extends RowDataPacket {
  account_public_id: string;
  created_at: string | Date;
  email_attempt_count: number | null;
  email_code_hash: string | null;
  email_expires_at: string | Date | null;
  email_sent_at: string | Date | null;
  expires_at: string | Date;
  flow_token_hash: string;
  id: number;
  oauth_provider_code: string | null;
  password_attempt_count: number | null;
  password_code_hash: string | null;
  password_expires_at: string | Date | null;
  password_sent_at: string | Date | null;
  pending_country: string | null;
  pending_phone: string | null;
  phone_attempt_count: number | null;
  phone_code_hash: string | null;
  phone_expires_at: string | Date | null;
  phone_provider_code: string | null;
  phone_provider_reference: string | null;
  phone_sent_at: string | Date | null;
  phone_snapshot: string | null;
  purpose_code: string;
  remember_me: number;
}

interface SessionRow extends RowDataPacket {
  created_at: string | Date;
  expires_at: string | Date;
  last_seen_at: string | Date;
  public_id: string;
  remember_me: number;
  revoked_at: string | Date | null;
  session_token_hash: string;
  user_public_id: string;
}

interface IdRow extends RowDataPacket {
  id: number;
}

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizePhone = (value: string) => value.replace(/\s+/g, ' ').trim();

const splitName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || fullName.trim(),
    lastName: parts.slice(1).join(' ') || null,
  };
};

const toCountryValue = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return 'IN';
  }

  const uppercase = trimmed.toUpperCase();

  if (/^[A-Z]{2,3}$/.test(uppercase)) {
    return uppercase;
  }

  if (uppercase.length <= 16) {
    return uppercase;
  }

  return 'ZZ';
};

const toPendingChallenge = (
  type: PendingChallenge['type'],
  row: {
    codeHash: string | null;
    expiresAt: string | Date | null;
    phoneSnapshot?: string | null;
    providerCode?: string | null;
    providerReference?: string | null;
    sentAt: string | Date | null;
  }
): PendingChallenge | undefined => {
  if (!row.expiresAt || !row.sentAt) {
    return undefined;
  }

  const normalizedProviderCode =
    type === 'phone'
      ? ((row.providerCode as PendingChallenge['providerCode'] | null) ||
        (row.codeHash ? 'preview' : undefined))
      : undefined;

  if (!row.codeHash && !normalizedProviderCode && !row.providerReference) {
    return undefined;
  }

  return {
    expiresAt: fromMysqlDateTime(row.expiresAt) || nowUtc(),
    lastSentAt: fromMysqlDateTime(row.sentAt) || nowUtc(),
    ...(row.codeHash ? { hashedCode: row.codeHash } : {}),
    ...(row.phoneSnapshot ? { phoneSnapshot: row.phoneSnapshot } : {}),
    ...(normalizedProviderCode ? { providerCode: normalizedProviderCode } : {}),
    ...(row.providerReference ? { providerReference: row.providerReference } : {}),
    type,
  };
};

export class MysqlAuthStore implements AuthStore {
  public constructor(private readonly pool: Pool) {}

  public async initialize() {
    await ensurePlatformReady();
  }

  private async getUserIdByPublicId(connection: PoolConnection, publicId: string) {
    const row = await selectOne<IdRow>(
      connection,
      'SELECT id FROM users WHERE public_id = ? LIMIT 1',
      [publicId]
    );

    return row?.id;
  }

  private async upsertPrimaryClientAddress(
    connection: PoolConnection,
    clientAccountId: number,
    country: string
  ) {
    const timestamp = toMysqlDateTime(nowUtc());
    const existingPrimary = await selectOne<IdRow>(
      connection,
      `SELECT id
       FROM client_addresses
       WHERE client_account_id = ?
         AND archived_at IS NULL
         AND is_primary = 1
       ORDER BY id ASC
       LIMIT 1`,
      [clientAccountId]
    );

    if (existingPrimary?.id) {
      await connection.execute(
        `UPDATE client_addresses
         SET address_type_code = ?, line1 = ?, line2 = ?, city = ?, state = ?, postal_code = ?,
             country_code = ?, is_primary = ?, updated_at = ?, archived_at = NULL
         WHERE id = ?`,
        [
          'primary',
          'Not provided',
          null,
          'Not provided',
          'Not provided',
          '000000',
          toCountryValue(country),
          1,
          timestamp,
          existingPrimary.id,
        ]
      );

      await connection.execute(
        `UPDATE client_addresses
         SET is_primary = 0, archived_at = ?, updated_at = ?
         WHERE client_account_id = ?
           AND archived_at IS NULL
           AND is_primary = 1
           AND id <> ?`,
        [timestamp, timestamp, clientAccountId, existingPrimary.id]
      );

      return;
    }

    await connection.execute(
      `INSERT INTO client_addresses (
        client_account_id, address_type_code, line1, line2, city, state, postal_code, country_code,
        is_primary, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientAccountId,
        'primary',
        'Not provided',
        null,
        'Not provided',
        'Not provided',
        '000000',
        toCountryValue(country),
        1,
        timestamp,
        timestamp,
      ]
    );
  }

  private async getOrCreateClientAccount(
    connection: PoolConnection,
    userId: number,
    email: string,
    phone: string,
    fullName: string,
    country: string
  ) {
    const existing = await selectOne<IdRow>(
      connection,
      `SELECT ca.id
       FROM client_accounts ca
       INNER JOIN client_account_contacts cac ON cac.client_account_id = ca.id
       WHERE cac.user_id = ?
         AND cac.archived_at IS NULL
         AND ca.archived_at IS NULL
       LIMIT 1`,
      [userId]
    );

    if (existing?.id) {
      const timestamp = toMysqlDateTime(nowUtc());

      await connection.execute(
        `UPDATE client_accounts
         SET legal_name = ?, display_name = ?, billing_name = ?, primary_email = ?, primary_phone = ?, updated_at = ?
         WHERE id = ?`,
        [
          fullName.trim(),
          fullName.trim(),
          fullName.trim(),
          normalizeEmail(email),
          normalizePhone(phone),
          timestamp,
          existing.id,
        ]
      );
      await connection.execute(
        `UPDATE client_account_contacts
         SET mobile_number = COALESCE(mobile_number, ?),
             whatsapp_number = CASE WHEN whatsapp_same_as_mobile = 1 THEN ? ELSE whatsapp_number END,
             updated_at = ?
         WHERE client_account_id = ?
           AND user_id = ?
           AND archived_at IS NULL`,
        [normalizePhone(phone), normalizePhone(phone), timestamp, existing.id, userId]
      );

      await this.upsertPrimaryClientAddress(connection, existing.id, country);

      return existing.id;
    }

    const clientCode = await allocateBusinessNumber(connection, 'client_account', 'CLT');
    const timestamp = toMysqlDateTime(nowUtc());
    const [result] = await connection.execute(
      `INSERT INTO client_accounts (
        public_id, client_code, client_type_code, legal_name, display_name, billing_name,
        primary_email, primary_phone, gstin, tax_identifier, onboarding_status_code,
        account_status_code, owner_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createPublicId(),
        clientCode,
        'individual',
        fullName.trim(),
        fullName.trim(),
        fullName.trim(),
        normalizeEmail(email),
        normalizePhone(phone),
        null,
        null,
        'active',
        'active',
        null,
        timestamp,
        timestamp,
      ]
    );

    const clientAccountId = Number((result as unknown as { insertId: number }).insertId);

    await connection.execute(
      `INSERT INTO client_account_contacts (
        client_account_id, user_id, contact_role_code, is_primary, is_billing,
        mobile_number, whatsapp_number, whatsapp_same_as_mobile, portal_access_enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [clientAccountId, userId, 'primary', 1, 1, normalizePhone(phone), normalizePhone(phone), 1, 1, timestamp, timestamp]
    );

    await this.upsertPrimaryClientAddress(connection, clientAccountId, country);

    await connection.execute(
      `INSERT INTO user_notification_preferences (
        user_id, in_app_alerts, email_updates, sms_alerts, whatsapp_alerts, invoice_reminders, case_activity_alerts, product_announcements, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, 1, 1, 1, 0, 1, 1, 0, timestamp]
    );

    await connection.execute(
      `INSERT INTO user_roles (
        user_id, role_code, granted_by_user_id, starts_at, ends_at, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, 'client', null, timestamp, null, 1, timestamp, timestamp]
    );

    return clientAccountId;
  }

  private async hydrateAccount(connection: PoolConnection, whereClause: string, value: string) {
    const row = await selectOne<AccountRow>(
      connection,
      `SELECT
         u.public_id,
         u.email,
         u.phone,
         u.display_name,
         u.created_at,
         u.last_login_at,
         u.email_verified_at,
         u.phone_verified_at,
         uc.password_hash,
         COALESCE(addr.country_code, 'IN') AS region,
         CASE WHEN EXISTS (
           SELECT 1
           FROM user_oauth_accounts uoa
           WHERE uoa.user_id = u.id AND uoa.provider_code = 'google'
         ) THEN 1 ELSE 0 END AS has_google
       FROM users u
       LEFT JOIN user_credentials uc ON uc.user_id = u.id
       LEFT JOIN client_account_contacts cac
         ON cac.user_id = u.id
         AND cac.archived_at IS NULL
       LEFT JOIN client_accounts ca
         ON ca.id = cac.client_account_id
         AND ca.archived_at IS NULL
       LEFT JOIN client_addresses addr
         ON addr.client_account_id = ca.id
         AND addr.is_primary = 1
         AND addr.archived_at IS NULL
       WHERE ${whereClause}
       LIMIT 1`,
      [value]
    );

    if (!row) {
      return undefined;
    }

    return {
      createdAt: fromMysqlDateTime(row.created_at) || nowUtc(),
      country: row.region || 'IN',
      email: row.email,
      fullName: row.display_name,
      id: row.public_id,
      isEmailVerified: Boolean(row.email_verified_at),
      isPhoneVerified: Boolean(row.phone_verified_at),
      lastLoginAt: fromMysqlDateTime(row.last_login_at),
      passwordHash: row.password_hash || '',
      phone: row.phone || '',
      provider: (row.has_google ? 'google' : 'email') as AuthAccountRecord['provider'],
    } satisfies AuthAccountRecord;
  }

  private async getFlowTokenIds(connection: PoolConnection, hashedToken: string) {
    const row = await selectOne<RowDataPacket>(
      connection,
      `SELECT email_token_id, phone_token_id, password_reset_token_id
       FROM auth_flows
       WHERE flow_token_hash = ?
       LIMIT 1`,
      [hashedToken]
    );

    return row;
  }

  public async deleteFlowByHashedToken(hashedToken: string) {
    await this.initialize();

    await withTransaction(this.pool, async (connection) => {
      const tokenIds = await this.getFlowTokenIds(connection, hashedToken);

      await connection.execute('DELETE FROM auth_flows WHERE flow_token_hash = ?', [hashedToken]);

      if (tokenIds?.email_token_id) {
        await connection.execute('DELETE FROM email_verification_tokens WHERE id = ?', [
          tokenIds.email_token_id,
        ]);
      }

      if (tokenIds?.phone_token_id) {
        await connection.execute('DELETE FROM phone_verification_tokens WHERE id = ?', [
          tokenIds.phone_token_id,
        ]);
      }

      if (tokenIds?.password_reset_token_id) {
        await connection.execute('DELETE FROM password_reset_tokens WHERE id = ?', [
          tokenIds.password_reset_token_id,
        ]);
      }
    });
  }

  public async deleteSessionByHashedToken(hashedToken: string) {
    await this.initialize();

    await withConnection(this.pool, (connection) =>
      connection.execute('DELETE FROM user_sessions WHERE session_token_hash = ?', [hashedToken])
    );
  }

  public async deleteSessionsByAccountId(accountId: string) {
    await this.initialize();

    await withTransaction(this.pool, async (connection) => {
      const userId = await this.getUserIdByPublicId(connection, accountId);

      if (!userId) {
        return;
      }

      await connection.execute('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
    });
  }

  public async getAccountByEmail(email: string) {
    await this.initialize();

    return withConnection(this.pool, (connection) =>
      this.hydrateAccount(connection, 'u.email = ?', normalizeEmail(email))
    );
  }

  public async getAccountById(id: string) {
    await this.initialize();

    return withConnection(this.pool, (connection) =>
      this.hydrateAccount(connection, 'u.public_id = ?', id)
    );
  }

  public async getAccountByPhone(phone: string) {
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      return undefined;
    }

    await this.initialize();

    return withConnection(this.pool, (connection) =>
      this.hydrateAccount(connection, 'u.phone = ?', normalizedPhone)
    );
  }

  public async getFlowByHashedToken(hashedToken: string) {
    await this.initialize();

    return withConnection(this.pool, async (connection) => {
      const row = await selectOne<FlowRow>(
        connection,
        `SELECT
           af.id,
           af.flow_token_hash,
           af.purpose_code,
           af.remember_me,
           af.pending_phone,
           af.pending_country,
           af.oauth_provider_code,
           af.expires_at,
           u.public_id AS account_public_id,
           et.code_hash AS email_code_hash,
           et.expires_at AS email_expires_at,
           et.sent_at AS email_sent_at,
           et.attempt_count AS email_attempt_count,
           pt.code_hash AS phone_code_hash,
           pt.provider_code AS phone_provider_code,
           pt.provider_reference AS phone_provider_reference,
           pt.phone_snapshot,
           pt.expires_at AS phone_expires_at,
           pt.sent_at AS phone_sent_at,
           pt.attempt_count AS phone_attempt_count,
           rt.code_hash AS password_code_hash,
           rt.expires_at AS password_expires_at,
           rt.sent_at AS password_sent_at,
           rt.attempt_count AS password_attempt_count,
           af.created_at
         FROM auth_flows af
         INNER JOIN users u ON u.id = af.user_id
         LEFT JOIN email_verification_tokens et ON et.id = af.email_token_id
         LEFT JOIN phone_verification_tokens pt ON pt.id = af.phone_token_id
         LEFT JOIN password_reset_tokens rt ON rt.id = af.password_reset_token_id
         WHERE af.flow_token_hash = ?
         LIMIT 1`,
        [hashedToken]
      );

      if (!row) {
        return undefined;
      }

      const expiresAt = fromMysqlDateTime(row.expires_at);

      if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
        await this.deleteFlowByHashedToken(hashedToken);
        return undefined;
      }

      return {
        accountId: row.account_public_id,
        createdAt: fromMysqlDateTime(row.created_at) || nowUtc(),
        emailChallenge: toPendingChallenge('email', {
          codeHash: row.email_code_hash,
          expiresAt: row.email_expires_at,
          sentAt: row.email_sent_at,
        }),
        expiresAt,
        hashedToken: row.flow_token_hash,
        passwordResetChallenge: toPendingChallenge('password-reset', {
          codeHash: row.password_code_hash,
          expiresAt: row.password_expires_at,
          sentAt: row.password_sent_at,
        }),
        phoneChallenge: toPendingChallenge('phone', {
          codeHash: row.phone_code_hash,
          expiresAt: row.phone_expires_at,
          phoneSnapshot: row.phone_snapshot,
          providerCode: row.phone_provider_code,
          providerReference: row.phone_provider_reference,
          sentAt: row.phone_sent_at,
        }),
        purpose: row.purpose_code as AuthFlowRecord['purpose'],
        rememberMe: Boolean(row.remember_me),
      } satisfies AuthFlowRecord;
    });
  }

  public async getSessionByHashedToken(hashedToken: string) {
    await this.initialize();

    return withConnection(this.pool, async (connection) => {
      const row = await selectOne<SessionRow>(
        connection,
        `SELECT
           us.public_id,
           us.session_token_hash,
           us.remember_me,
           us.created_at,
           us.expires_at,
           us.last_seen_at,
           us.revoked_at,
           u.public_id AS user_public_id
         FROM user_sessions us
         INNER JOIN users u ON u.id = us.user_id
         WHERE us.session_token_hash = ?
         LIMIT 1`,
        [hashedToken]
      );

      if (!row) {
        return undefined;
      }

      const expiresAt = fromMysqlDateTime(row.expires_at);

      if (!expiresAt || new Date(expiresAt).getTime() <= Date.now() || row.revoked_at) {
        await this.deleteSessionByHashedToken(hashedToken);
        return undefined;
      }

      return {
        accountId: row.user_public_id,
        createdAt: fromMysqlDateTime(row.created_at) || nowUtc(),
        expiresAt,
        hashedToken: row.session_token_hash,
        lastSeenAt: fromMysqlDateTime(row.last_seen_at) || nowUtc(),
        rememberMe: Boolean(row.remember_me),
      } satisfies AuthSessionRecord;
    });
  }

  public async listAccounts() {
    await this.initialize();

    return withConnection(this.pool, async (connection) => {
      const [rows] = await connection.query<AccountRow[]>(
        `SELECT
           u.public_id,
           u.email,
           u.phone,
           u.display_name,
           u.created_at,
           u.last_login_at,
           u.email_verified_at,
           u.phone_verified_at,
           uc.password_hash,
           COALESCE(addr.country_code, 'IN') AS region,
           CASE WHEN EXISTS (
             SELECT 1
             FROM user_oauth_accounts uoa
             WHERE uoa.user_id = u.id AND uoa.provider_code = 'google'
           ) THEN 1 ELSE 0 END AS has_google
         FROM users u
         LEFT JOIN user_credentials uc ON uc.user_id = u.id
         LEFT JOIN client_account_contacts cac
           ON cac.user_id = u.id
           AND cac.archived_at IS NULL
         LEFT JOIN client_accounts ca
           ON ca.id = cac.client_account_id
           AND ca.archived_at IS NULL
         LEFT JOIN client_addresses addr
           ON addr.client_account_id = ca.id
           AND addr.is_primary = 1
           AND addr.archived_at IS NULL
         WHERE u.actor_type_code = 'client'
         ORDER BY u.created_at ASC`
      );

      return rows.map((row) => ({
        createdAt: fromMysqlDateTime(row.created_at) || nowUtc(),
        country: row.region || 'IN',
        email: row.email,
        fullName: row.display_name,
        id: row.public_id,
        isEmailVerified: Boolean(row.email_verified_at),
        isPhoneVerified: Boolean(row.phone_verified_at),
        lastLoginAt: fromMysqlDateTime(row.last_login_at),
        passwordHash: row.password_hash || '',
        phone: row.phone || '',
        provider: (row.has_google ? 'google' : 'email') as AuthAccountRecord['provider'],
      }));
    });
  }

  private async saveChallenge(
    connection: PoolConnection,
    userId: number,
    purposeCode: string,
    challenge: PendingChallenge | undefined
  ) {
    if (!challenge) {
      return undefined;
    }

    const timestamp = toMysqlDateTime(nowUtc());
    if (challenge.type === 'email') {
      if (!challenge.hashedCode) {
        throw new Error('Email challenges require a hashed verification code.');
      }

      const [result] = await connection.execute(
        `INSERT INTO email_verification_tokens (
          public_id, user_id, purpose_code, code_hash, expires_at, sent_at, attempt_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createPublicId(),
          userId,
          purposeCode,
          challenge.hashedCode,
          toMysqlDateTime(challenge.expiresAt),
          toMysqlDateTime(challenge.lastSentAt),
          0,
          timestamp,
          timestamp,
        ]
      );

      return Number((result as { insertId: number }).insertId);
    }

    if (challenge.type === 'phone') {
      const [result] = await connection.execute(
        `INSERT INTO phone_verification_tokens (
          public_id, user_id, phone_snapshot, purpose_code, provider_code, provider_reference,
          code_hash, expires_at, sent_at, attempt_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createPublicId(),
          userId,
          challenge.phoneSnapshot || '',
          purposeCode,
          challenge.providerCode || (challenge.hashedCode ? 'preview' : null),
          challenge.providerReference || null,
          challenge.hashedCode || null,
          toMysqlDateTime(challenge.expiresAt),
          toMysqlDateTime(challenge.lastSentAt),
          0,
          timestamp,
          timestamp,
        ]
      );

      return Number((result as { insertId: number }).insertId);
    }

    if (!challenge.hashedCode) {
      throw new Error('Password reset challenges require a hashed verification code.');
    }

    const [result] = await connection.execute(
      `INSERT INTO password_reset_tokens (
        public_id, user_id, code_hash, expires_at, sent_at, attempt_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createPublicId(),
        userId,
        challenge.hashedCode,
        toMysqlDateTime(challenge.expiresAt),
        toMysqlDateTime(challenge.lastSentAt),
        0,
        timestamp,
        timestamp,
      ]
    );

    return Number((result as { insertId: number }).insertId);
  }

  public async saveAccount(
    account: AuthAccountRecord,
    options?: { legalAcceptance?: LegalAcceptanceRecord }
  ) {
    await this.initialize();

    await withTransaction(this.pool, async (connection) => {
      const timestamp = toMysqlDateTime(nowUtc());
      const normalizedEmail = normalizeEmail(account.email);
      const normalizedPhone = normalizePhone(account.phone);
      let userId = await this.getUserIdByPublicId(connection, account.id);

      if (!userId) {
        const existingByEmail = await selectOne<IdRow>(
          connection,
          'SELECT id FROM users WHERE email = ? LIMIT 1',
          [normalizedEmail]
        );
        userId = existingByEmail?.id;
      }

      const { firstName, lastName } = splitName(account.fullName);

      if (!userId) {
        const [result] = await connection.execute(
          `INSERT INTO users (
            public_id, email, phone, display_name, first_name, last_name, actor_type_code,
            account_status_code, timezone_name, locale_code, avatar_url, login_enabled,
            last_login_at, email_verified_at, phone_verified_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            account.id,
            normalizedEmail,
            normalizedPhone || null,
            account.fullName.trim(),
            firstName,
            lastName,
            'client',
            'active',
            'Asia/Kolkata',
            'en-IN',
            '',
            1,
            account.lastLoginAt ? toMysqlDateTime(account.lastLoginAt) : null,
            account.isEmailVerified ? timestamp : null,
            account.isPhoneVerified ? timestamp : null,
            toMysqlDateTime(account.createdAt),
            timestamp,
          ]
        );

        userId = Number((result as { insertId: number }).insertId);
      } else {
        await connection.execute(
          `UPDATE users
           SET email = ?, phone = ?, display_name = ?, first_name = ?, last_name = ?, last_login_at = ?,
               email_verified_at = ?, phone_verified_at = ?, updated_at = ?, login_enabled = ?
           WHERE id = ?`,
          [
            normalizedEmail,
            normalizedPhone || null,
            account.fullName.trim(),
            firstName,
            lastName,
            account.lastLoginAt ? toMysqlDateTime(account.lastLoginAt) : null,
            account.isEmailVerified ? timestamp : null,
            account.isPhoneVerified ? timestamp : null,
            timestamp,
            1,
            userId,
          ]
        );
      }

      if (account.passwordHash) {
        await connection.execute(
          `INSERT INTO user_credentials (
            user_id, password_hash, password_algo, password_changed_at, must_rotate_password
          ) VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            password_hash = VALUES(password_hash),
            password_algo = VALUES(password_algo),
            password_changed_at = VALUES(password_changed_at),
            must_rotate_password = VALUES(must_rotate_password)`,
          [userId, account.passwordHash, 'scrypt', timestamp, 0]
        );
      }

      await this.getOrCreateClientAccount(
        connection,
        userId,
        normalizedEmail,
        normalizedPhone || '',
        account.fullName,
        account.country
      );

      if (options?.legalAcceptance) {
        await connection.execute(
          `INSERT INTO user_legal_acceptances (
            public_id, user_id, acceptance_type_code, source_code, accepted_at, ip_address, user_agent, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            createPublicId(),
            userId,
            options.legalAcceptance.acceptanceTypeCode,
            options.legalAcceptance.sourceCode,
            toMysqlDateTime(options.legalAcceptance.acceptedAt),
            options.legalAcceptance.ipAddress || null,
            options.legalAcceptance.userAgent || null,
            timestamp,
          ]
        );
      }

      if (account.provider === 'google') {
        await connection.execute(
          `INSERT INTO user_oauth_accounts (
            public_id, user_id, provider_code, provider_subject, provider_email, linked_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            provider_email = VALUES(provider_email),
            linked_at = VALUES(linked_at),
            updated_at = VALUES(updated_at)`,
          [
            createPublicId(),
            userId,
            'google',
            account.oauthSubject || normalizedEmail,
            normalizedEmail,
            timestamp,
            timestamp,
            timestamp,
          ]
        );
      }
    });
  }

  public async saveFlow(flow: AuthFlowRecord) {
    await this.initialize();

    await withTransaction(this.pool, async (connection) => {
      const userId = await this.getUserIdByPublicId(connection, flow.accountId);

      if (!userId) {
        throw new Error(`Cannot create auth flow for unknown account ${flow.accountId}.`);
      }

      const emailTokenId = await this.saveChallenge(connection, userId, flow.purpose, flow.emailChallenge);
      const phoneTokenId = await this.saveChallenge(connection, userId, flow.purpose, flow.phoneChallenge);
      const passwordResetTokenId = await this.saveChallenge(
        connection,
        userId,
        flow.purpose,
        flow.passwordResetChallenge
      );
      const timestamp = toMysqlDateTime(nowUtc());

      await connection.execute(
        `INSERT INTO auth_flows (
          public_id, user_id, purpose_code, remember_me, pending_phone, pending_country,
          oauth_provider_code, email_token_id, phone_token_id, password_reset_token_id,
          flow_token_hash, expires_at, consumed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          purpose_code = VALUES(purpose_code),
          remember_me = VALUES(remember_me),
          pending_phone = VALUES(pending_phone),
          pending_country = VALUES(pending_country),
          oauth_provider_code = VALUES(oauth_provider_code),
          email_token_id = VALUES(email_token_id),
          phone_token_id = VALUES(phone_token_id),
          password_reset_token_id = VALUES(password_reset_token_id),
          expires_at = VALUES(expires_at),
          consumed_at = VALUES(consumed_at),
          updated_at = VALUES(updated_at)`,
        [
          createPublicId(),
          userId,
          flow.purpose,
          flow.rememberMe ? 1 : 0,
          null,
          null,
          flow.purpose === 'google' ? 'google' : null,
          emailTokenId || null,
          phoneTokenId || null,
          passwordResetTokenId || null,
          flow.hashedToken,
          toMysqlDateTime(flow.expiresAt),
          null,
          toMysqlDateTime(flow.createdAt),
          timestamp,
        ]
      );
    });
  }

  public async saveSession(session: AuthSessionRecord) {
    await this.initialize();

    await withTransaction(this.pool, async (connection) => {
      const userId = await this.getUserIdByPublicId(connection, session.accountId);

      if (!userId) {
        throw new Error(`Cannot create session for unknown account ${session.accountId}.`);
      }

      const timestamp = toMysqlDateTime(nowUtc());
      await connection.execute(
        `INSERT INTO user_sessions (
          public_id, user_id, session_token_hash, csrf_secret_hash, remember_me, ip_address,
          user_agent, device_label, expires_at, last_seen_at, revoked_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          remember_me = VALUES(remember_me),
          expires_at = VALUES(expires_at),
          last_seen_at = VALUES(last_seen_at),
          revoked_at = VALUES(revoked_at),
          updated_at = VALUES(updated_at)`,
        [
          createPublicId(),
          userId,
          session.hashedToken,
          session.hashedToken,
          session.rememberMe ? 1 : 0,
          null,
          null,
          'browser',
          toMysqlDateTime(session.expiresAt),
          toMysqlDateTime(session.lastSeenAt),
          null,
          toMysqlDateTime(session.createdAt),
          timestamp,
        ]
      );

      await connection.execute(
        'UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?',
        [toMysqlDateTime(session.lastSeenAt), timestamp, userId]
      );
    });
  }
}
