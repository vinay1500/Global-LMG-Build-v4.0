import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { env } from '../../config/env.js';
import {
  createNumericCode,
  hashOneTimeCode,
  hashPassword,
  verifyPassword,
} from '../../lib/authCrypto.js';
import { nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { createPublicId } from '../../lib/ids.js';
import { badRequest, conflict, notFound, unauthorized } from '../../lib/httpErrors.js';
import { selectOne, withConnection, withTransaction } from '../../lib/mysqlUtils.js';
import { emailAuthProvider } from '../auth/providers/email.js';
import { smsAuthProvider } from '../auth/providers/sms.js';
import { ensurePlatformReady } from '../platform/bootstrap.js';
import type { NotificationPreferences } from './types.js';
import { DEFAULT_NOTIFICATION_PREFERENCES } from './types.js';

interface PortalUserContextRow extends RowDataPacket {
  client_account_id: number;
  display_name: string;
  email: string;
  phone: string | null;
  user_id: number;
}

interface PreferencesRow extends RowDataPacket {
  case_activity_alerts: number;
  email_updates: number;
  in_app_alerts: number;
  invoice_reminders: number;
  product_announcements: number;
  sms_alerts: number;
  whatsapp_alerts: number;
}

interface AccountSettingsRow extends RowDataPacket {
  display_name: string;
  email: string;
  email_verified_at: string | null;
  mobile_number: string | null;
  phone: string | null;
  phone_verified_at: string | null;
  whatsapp_number: string | null;
  whatsapp_same_as_mobile: number;
}

interface CredentialRow extends RowDataPacket {
  password_hash: string | null;
}

interface IdRow extends RowDataPacket {
  id: number;
}

interface EmailTokenRow extends RowDataPacket {
  code_hash: string;
  email_snapshot: string | null;
  expires_at: string;
  id: number;
}

interface PhoneTokenRow extends RowDataPacket {
  code_hash: string | null;
  expires_at: string;
  id: number;
  phone_snapshot: string;
  provider_code: 'preview' | 'twilio-verify' | null;
  provider_reference: string | null;
}

const toPreferences = (row?: PreferencesRow | null): NotificationPreferences => {
  if (!row) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  return {
    caseActivityAlerts: Boolean(row.case_activity_alerts),
    emailUpdates: Boolean(row.email_updates),
    inAppAlerts: row.in_app_alerts === undefined ? true : Boolean(row.in_app_alerts),
    invoiceReminders: Boolean(row.invoice_reminders),
    productAnnouncements: Boolean(row.product_announcements),
    smsAlerts: Boolean(row.sms_alerts),
    whatsappAlerts: row.whatsapp_alerts === undefined ? false : Boolean(row.whatsapp_alerts),
  };
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizePhone = (value: string) => value.replace(/\s+/g, ' ').trim();

const assertStrongPassword = (value: string) => {
  if (
    value.trim().length < 10 ||
    !/[A-Z]/.test(value) ||
    !/[a-z]/.test(value) ||
    !/\d/.test(value) ||
    !/[^A-Za-z0-9]/.test(value)
  ) {
    throw badRequest(
      'weak_password',
      'Password must be at least 10 characters and include uppercase, lowercase, number, and special character.'
    );
  }
};

const assertEmailFormat = (value: string) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw badRequest('invalid_email', 'Enter a valid email address.');
  }
};

const assertPhoneFormat = (value: string) => {
  if (value.trim().length < 8 || value.trim().length > 40) {
    throw badRequest('invalid_phone', 'Enter a valid phone number.');
  }
};

export class ClientAccountsRepository {
  public constructor(private readonly pool: Pool) {}

  public async initialize() {
    await ensurePlatformReady();
  }

  private async resolvePortalUserContext(
    connection: PoolConnection,
    userPublicId: string
  ) {
    const row = await selectOne<PortalUserContextRow>(
      connection,
      `SELECT
         u.id AS user_id,
         u.display_name,
         u.email,
         u.phone,
         cac.client_account_id
       FROM users u
       INNER JOIN client_account_contacts cac
         ON cac.user_id = u.id
         AND cac.portal_access_enabled = 1
         AND cac.archived_at IS NULL
       WHERE u.public_id = ?
         AND u.archived_at IS NULL
       LIMIT 1`,
      [userPublicId]
    );

    if (!row) {
      throw notFound('portal_user_not_found', 'Portal user could not be resolved.');
    }

    return row;
  }

  private async readAccountSettings(connection: PoolConnection, userPublicId: string) {
    const context = await this.resolvePortalUserContext(connection, userPublicId);
    const row = await selectOne<AccountSettingsRow>(
      connection,
      `SELECT
         u.display_name,
         u.email,
         u.phone,
         u.email_verified_at,
         u.phone_verified_at,
         cac.mobile_number,
         cac.whatsapp_number,
         cac.whatsapp_same_as_mobile
       FROM users u
       INNER JOIN client_account_contacts cac
         ON cac.user_id = u.id
        AND cac.client_account_id = ?
        AND cac.archived_at IS NULL
       WHERE u.id = ?
       LIMIT 1`,
      [context.client_account_id, context.user_id]
    );

    if (!row) {
      throw notFound('portal_user_not_found', 'Portal user could not be resolved.');
    }

    return {
      account: {
        email: row.email,
        emailVerified: Boolean(row.email_verified_at),
        mobileNumber: row.mobile_number || row.phone || '',
        name: row.display_name,
        phone: row.phone || '',
        phoneVerified: Boolean(row.phone_verified_at),
        whatsappNumber:
          row.whatsapp_number || (row.whatsapp_same_as_mobile ? row.phone || row.mobile_number || '' : ''),
        whatsappSameAsMobile: Boolean(row.whatsapp_same_as_mobile),
      },
      providerMode: {
        email: env.EMAIL_PROVIDER_MODE,
        inApp: 'local' as const,
        sms: env.SMS_PROVIDER_MODE,
        whatsapp: 'informational' as const,
      },
    };
  }

  public async getNotificationPreferences(userPublicId: string) {
    await this.initialize();

    return withConnection(this.pool, async (connection) => {
      const context = await this.resolvePortalUserContext(connection, userPublicId);
      const row = await selectOne<PreferencesRow>(
        connection,
        `SELECT
           in_app_alerts,
           email_updates,
           sms_alerts,
           whatsapp_alerts,
           invoice_reminders,
           case_activity_alerts,
           product_announcements
         FROM user_notification_preferences
         WHERE user_id = ?
         LIMIT 1`,
        [context.user_id]
      );

      return toPreferences(row);
    });
  }

  public async updateNotificationPreferences(
    userPublicId: string,
    preferences: NotificationPreferences
  ) {
    await this.initialize();

    return withTransaction(this.pool, async (connection) => {
      const context = await this.resolvePortalUserContext(connection, userPublicId);
      const timestamp = toMysqlDateTime(nowUtc());

      await connection.execute(
        `INSERT INTO user_notification_preferences (
          user_id,
          in_app_alerts,
          email_updates,
          sms_alerts,
          whatsapp_alerts,
          invoice_reminders,
          case_activity_alerts,
          product_announcements,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          in_app_alerts = VALUES(in_app_alerts),
          email_updates = VALUES(email_updates),
          sms_alerts = VALUES(sms_alerts),
          whatsapp_alerts = VALUES(whatsapp_alerts),
          invoice_reminders = VALUES(invoice_reminders),
          case_activity_alerts = VALUES(case_activity_alerts),
          product_announcements = VALUES(product_announcements),
          updated_at = VALUES(updated_at)`,
        [
          context.user_id,
          preferences.inAppAlerts ? 1 : 0,
          preferences.emailUpdates ? 1 : 0,
          preferences.smsAlerts ? 1 : 0,
          preferences.whatsappAlerts ? 1 : 0,
          preferences.invoiceReminders ? 1 : 0,
          preferences.caseActivityAlerts ? 1 : 0,
          preferences.productAnnouncements ? 1 : 0,
          timestamp,
        ]
      );

      await connection.execute(
        `INSERT INTO audit_events (
          public_id,
          actor_user_id,
          actor_role_code_snapshot,
          entity_table_name,
          entity_pk,
          action_code,
          action_label,
          source_module,
          request_correlation_id,
          ip_address,
          user_agent,
          summary_old_value,
          summary_new_value,
          occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createPublicId(),
          context.user_id,
          'client',
          'user_notification_preferences',
          context.user_id,
          'preferences_updated',
          'Notification preferences updated',
          'Client Settings',
          null,
          null,
          null,
          null,
          JSON.stringify(preferences),
          timestamp,
        ]
      );

      return preferences;
    });
  }

  public async getAccountSettings(userPublicId: string) {
    await this.initialize();

    return withConnection(this.pool, async (connection) => this.readAccountSettings(connection, userPublicId));
  }

  public async updateContactSettings(
    userPublicId: string,
    payload: { whatsappNumber: string; whatsappSameAsMobile: boolean }
  ) {
    await this.initialize();

    return withTransaction(this.pool, async (connection) => {
      const context = await this.resolvePortalUserContext(connection, userPublicId);
      const whatsappNumber = normalizePhone(payload.whatsappNumber || context.phone || '');
      if (!payload.whatsappSameAsMobile) {
        assertPhoneFormat(whatsappNumber);
      }
      const timestamp = toMysqlDateTime(nowUtc());

      await connection.execute(
        `UPDATE client_account_contacts
         SET mobile_number = COALESCE(mobile_number, ?),
             whatsapp_number = ?,
             whatsapp_same_as_mobile = ?,
             updated_at = ?
         WHERE client_account_id = ?
           AND user_id = ?
           AND archived_at IS NULL`,
        [
          context.phone || '',
          payload.whatsappSameAsMobile ? context.phone || whatsappNumber : whatsappNumber,
          payload.whatsappSameAsMobile ? 1 : 0,
          timestamp,
          context.client_account_id,
          context.user_id,
        ]
      );

      await this.insertAuditEvent(connection, context.user_id, 'client.contact_updated', 'Client contact settings updated', {
        whatsappSameAsMobile: payload.whatsappSameAsMobile,
      });

      return this.readAccountSettings(connection, userPublicId);
    });
  }

  public async changePassword(
    userPublicId: string,
    payload: { currentPassword: string; newPassword: string }
  ) {
    await this.initialize();

    return withTransaction(this.pool, async (connection) => {
      const context = await this.resolvePortalUserContext(connection, userPublicId);
      assertStrongPassword(payload.newPassword);

      const credential = await selectOne<CredentialRow>(
        connection,
        `SELECT password_hash
         FROM user_credentials
         WHERE user_id = ?
         LIMIT 1`,
        [context.user_id]
      );

      if (!credential?.password_hash) {
        throw badRequest('password_not_configured', 'This account does not currently have a password.');
      }

      const currentMatches = await verifyPassword(payload.currentPassword, credential.password_hash);
      if (!currentMatches) {
        throw unauthorized('invalid_current_password', 'Current password is incorrect.');
      }

      await connection.execute(
        `UPDATE user_credentials
         SET password_hash = ?,
             password_algo = 'scrypt',
             password_changed_at = ?,
             must_rotate_password = 0
         WHERE user_id = ?`,
        [await hashPassword(payload.newPassword), toMysqlDateTime(nowUtc()), context.user_id]
      );

      await this.insertAuditEvent(connection, context.user_id, 'client.password_changed', 'Client password changed');

      return { status: 'updated' as const };
    });
  }

  public async requestEmailChange(userPublicId: string, nextEmail: string) {
    await this.initialize();

    return withTransaction(this.pool, async (connection) => {
      const context = await this.resolvePortalUserContext(connection, userPublicId);
      const email = normalizeEmail(nextEmail);
      assertEmailFormat(email);

      const duplicate = await selectOne<IdRow>(
        connection,
        `SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id <> ? LIMIT 1`,
        [email, context.user_id]
      );

      if (duplicate) {
        throw conflict('email_already_exists', 'This email is already used by another account.');
      }

      const code = createNumericCode();
      const timestamp = toMysqlDateTime(nowUtc());
      const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_TTL_MINUTES * 60_000).toISOString();
      const delivery = await emailAuthProvider.sendCode({
        code,
        purpose: 'email_verification',
        recipientEmail: email,
        recipientName: context.display_name,
      });

      await connection.execute(
        `UPDATE email_verification_tokens
         SET consumed_at = UTC_TIMESTAMP(6)
         WHERE user_id = ?
           AND purpose_code = 'email_change'
           AND consumed_at IS NULL`,
        [context.user_id]
      );

      await connection.execute(
        `INSERT INTO email_verification_tokens (
          public_id,
          user_id,
          email_snapshot,
          purpose_code,
          code_hash,
          expires_at,
          sent_at,
          attempt_count,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 'email_change', ?, ?, ?, 0, ?, ?)`,
        [
          createPublicId(),
          context.user_id,
          email,
          hashOneTimeCode(code, env.AUTH_SESSION_SECRET),
          toMysqlDateTime(expiresAt),
          timestamp,
          timestamp,
          timestamp,
        ]
      );

      await this.insertAuditEvent(connection, context.user_id, 'client.email_change_requested', 'Client email change requested', {
        nextEmail: email,
      });

      return {
        deliveryHint: delivery.deliveryHint,
        email,
        providerMode: env.EMAIL_PROVIDER_MODE,
        status: 'verification_required' as const,
      };
    });
  }

  public async confirmEmailChange(userPublicId: string, payload: { code: string; email: string }) {
    await this.initialize();

    return withTransaction(this.pool, async (connection) => {
      const context = await this.resolvePortalUserContext(connection, userPublicId);
      const email = normalizeEmail(payload.email);
      const token = await selectOne<EmailTokenRow>(
        connection,
        `SELECT id, email_snapshot, code_hash, expires_at
         FROM email_verification_tokens
         WHERE user_id = ?
           AND purpose_code = 'email_change'
           AND consumed_at IS NULL
         ORDER BY sent_at DESC
         LIMIT 1
         FOR UPDATE`,
        [context.user_id]
      );

      if (!token || normalizeEmail(token.email_snapshot || '') !== email) {
        throw unauthorized('email_change_not_pending', 'Email change verification is not pending.');
      }
      if (new Date(token.expires_at).getTime() <= Date.now()) {
        throw unauthorized('email_change_expired', 'Email change verification code expired.');
      }
      if (hashOneTimeCode(payload.code.trim(), env.AUTH_SESSION_SECRET) !== token.code_hash) {
        throw unauthorized('invalid_email_change_code', 'Email change verification code is invalid.');
      }

      const duplicate = await selectOne<IdRow>(
        connection,
        `SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id <> ? LIMIT 1`,
        [email, context.user_id]
      );

      if (duplicate) {
        throw conflict('email_already_exists', 'This email is already used by another account.');
      }

      const timestamp = toMysqlDateTime(nowUtc());
      await connection.execute(
        `UPDATE users
         SET email = ?,
             email_verified_at = ?,
             updated_at = ?
         WHERE id = ?`,
        [email, timestamp, timestamp, context.user_id]
      );
      await connection.execute(
        `UPDATE client_accounts
         SET primary_email = ?,
             updated_at = ?
         WHERE id = ?`,
        [email, timestamp, context.client_account_id]
      );
      await connection.execute(
        `UPDATE email_verification_tokens
         SET consumed_at = ?,
             updated_at = ?
         WHERE id = ?`,
        [timestamp, timestamp, token.id]
      );

      await this.insertAuditEvent(connection, context.user_id, 'client.email_changed', 'Client email changed', {
        nextEmail: email,
      });

      return this.readAccountSettings(connection, userPublicId);
    });
  }

  public async requestPhoneChange(userPublicId: string, nextPhone: string) {
    await this.initialize();

    return withTransaction(this.pool, async (connection) => {
      const context = await this.resolvePortalUserContext(connection, userPublicId);
      const phone = normalizePhone(nextPhone);
      assertPhoneFormat(phone);

      const duplicate = await selectOne<IdRow>(
        connection,
        `SELECT id FROM users WHERE phone = ? AND id <> ? LIMIT 1`,
        [phone, context.user_id]
      );

      if (duplicate) {
        throw conflict('phone_already_exists', 'This phone number is already used by another account.');
      }

      const timestamp = toMysqlDateTime(nowUtc());
      const expiresAt = new Date(Date.now() + env.PHONE_OTP_TTL_MINUTES * 60_000).toISOString();
      const code = env.SMS_PROVIDER_MODE === 'preview' ? createNumericCode() : undefined;
      const delivery = await smsAuthProvider.sendCode({
        code,
        purpose: 'phone_verification',
        recipientPhone: phone,
      });

      await connection.execute(
        `UPDATE phone_verification_tokens
         SET consumed_at = UTC_TIMESTAMP(6)
         WHERE user_id = ?
           AND purpose_code = 'phone_change'
           AND consumed_at IS NULL`,
        [context.user_id]
      );

      await connection.execute(
        `INSERT INTO phone_verification_tokens (
          public_id,
          user_id,
          phone_snapshot,
          purpose_code,
          provider_code,
          provider_reference,
          code_hash,
          expires_at,
          sent_at,
          attempt_count,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 'phone_change', ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          createPublicId(),
          context.user_id,
          phone,
          env.SMS_PROVIDER_MODE === 'preview' ? 'preview' : 'twilio-verify',
          delivery.providerReference || null,
          code ? hashOneTimeCode(code, env.AUTH_SESSION_SECRET) : null,
          toMysqlDateTime(expiresAt),
          timestamp,
          timestamp,
          timestamp,
        ]
      );

      await this.insertAuditEvent(connection, context.user_id, 'client.phone_change_requested', 'Client phone change requested');

      return {
        deliveryHint: delivery.deliveryHint,
        phone,
        providerMode: env.SMS_PROVIDER_MODE,
        status: 'verification_required' as const,
      };
    });
  }

  public async confirmPhoneChange(userPublicId: string, payload: { code: string; phone: string }) {
    await this.initialize();

    return withTransaction(this.pool, async (connection) => {
      const context = await this.resolvePortalUserContext(connection, userPublicId);
      const phone = normalizePhone(payload.phone);
      const token = await selectOne<PhoneTokenRow>(
        connection,
        `SELECT id, phone_snapshot, provider_code, provider_reference, code_hash, expires_at
         FROM phone_verification_tokens
         WHERE user_id = ?
           AND purpose_code = 'phone_change'
           AND consumed_at IS NULL
         ORDER BY sent_at DESC
         LIMIT 1
         FOR UPDATE`,
        [context.user_id]
      );

      if (!token || normalizePhone(token.phone_snapshot) !== phone) {
        throw unauthorized('phone_change_not_pending', 'Phone change verification is not pending.');
      }
      if (new Date(token.expires_at).getTime() <= Date.now()) {
        throw unauthorized('phone_change_expired', 'Phone change verification code expired.');
      }

      if (token.provider_code === 'twilio-verify') {
        const verification = await smsAuthProvider.verifyCode({
          code: payload.code.trim(),
          purpose: 'phone_verification',
          providerReference: token.provider_reference || undefined,
          recipientPhone: phone,
        });
        if (!verification.approved) {
          throw unauthorized('invalid_phone_change_code', 'Phone verification code is invalid.');
        }
      } else if (!token.code_hash || hashOneTimeCode(payload.code.trim(), env.AUTH_SESSION_SECRET) !== token.code_hash) {
        throw unauthorized('invalid_phone_change_code', 'Phone verification code is invalid.');
      }

      const duplicate = await selectOne<IdRow>(
        connection,
        `SELECT id FROM users WHERE phone = ? AND id <> ? LIMIT 1`,
        [phone, context.user_id]
      );

      if (duplicate) {
        throw conflict('phone_already_exists', 'This phone number is already used by another account.');
      }

      const timestamp = toMysqlDateTime(nowUtc());
      await connection.execute(
        `UPDATE users
         SET phone = ?,
             phone_verified_at = ?,
             updated_at = ?
         WHERE id = ?`,
        [phone, timestamp, timestamp, context.user_id]
      );
      await connection.execute(
        `UPDATE client_accounts
         SET primary_phone = ?,
             updated_at = ?
         WHERE id = ?`,
        [phone, timestamp, context.client_account_id]
      );
      await connection.execute(
        `UPDATE client_account_contacts
         SET mobile_number = ?,
             whatsapp_number = CASE WHEN whatsapp_same_as_mobile = 1 THEN ? ELSE whatsapp_number END,
             updated_at = ?
         WHERE client_account_id = ?
           AND user_id = ?
           AND archived_at IS NULL`,
        [phone, phone, timestamp, context.client_account_id, context.user_id]
      );
      await connection.execute(
        `UPDATE phone_verification_tokens
         SET consumed_at = ?,
             updated_at = ?
         WHERE id = ?`,
        [timestamp, timestamp, token.id]
      );

      await this.insertAuditEvent(connection, context.user_id, 'client.phone_changed', 'Client phone changed');

      return this.readAccountSettings(connection, userPublicId);
    });
  }

  private async insertAuditEvent(
    connection: PoolConnection,
    userId: number,
    actionCode: string,
    actionLabel: string,
    summary?: unknown
  ) {
    const timestamp = toMysqlDateTime(nowUtc());
    await connection.execute(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        actor_role_code_snapshot,
        entity_table_name,
        entity_pk,
        action_code,
        action_label,
        source_module,
        request_correlation_id,
        ip_address,
        user_agent,
        summary_old_value,
        summary_new_value,
        occurred_at
      ) VALUES (?, ?, 'client', 'users', ?, ?, ?, 'Client Settings', NULL, NULL, NULL, NULL, ?, ?)`,
      [createPublicId(), userId, userId, actionCode, actionLabel, summary ? JSON.stringify(summary) : null, timestamp]
    );
  }
}
