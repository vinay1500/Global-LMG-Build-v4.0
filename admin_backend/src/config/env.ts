import 'dotenv/config';
import { z } from 'zod';

const rawEnv = { ...process.env };

if (!rawEnv.MYSQL_SSL_CA && rawEnv.MYSQL_SSL_CA_PATH) {
  rawEnv.MYSQL_SSL_CA = rawEnv.MYSQL_SSL_CA_PATH;
}

if (!rawEnv.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL && rawEnv.GOOGLE_CALENDAR_CLIENT_EMAIL) {
  rawEnv.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL = rawEnv.GOOGLE_CALENDAR_CLIENT_EMAIL;
}

if (!rawEnv.GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY && rawEnv.GOOGLE_CALENDAR_PRIVATE_KEY) {
  rawEnv.GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY = rawEnv.GOOGLE_CALENDAR_PRIVATE_KEY;
}

const optionalString = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1).optional());

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());

const mysqlSslMode = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().toUpperCase();
}, z.enum(['DISABLED', 'REQUIRED']));

const smsProviderMode = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'twilio-sms' || normalized === 'twilio-messaging') {
    return 'twilio';
  }

  return normalized;
}, z.enum(['disabled', 'preview', 'twilio', 'twilio-verify']));

const fileScanMode = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().toLowerCase();
}, z.enum(['disabled', 'clamav']));

const adminBootstrapRole = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.enum(['ops_admin', 'case_manager', 'billing_admin', 'messaging_desk', 'management_viewer']).default('ops_admin'));

const envSchema = z.object({
  ADMIN_BOOTSTRAP_EMAIL: optionalString,
  ADMIN_BOOTSTRAP_ENABLED: booleanFromEnv.default(false),
  ADMIN_BOOTSTRAP_FORCE_ROTATION: booleanFromEnv.default(true),
  ADMIN_BOOTSTRAP_NAME: optionalString,
  ADMIN_BOOTSTRAP_PASSWORD: optionalString,
  ADMIN_BOOTSTRAP_RESET_PASSWORD: booleanFromEnv.default(false),
  ADMIN_BOOTSTRAP_ROLE: adminBootstrapRole,
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  APP_SEND_EVENT_EMAIL: booleanFromEnv.default(false),
  CALENDAR_ADMIN_AUTH_MODE: z.enum(['workspace_delegation']).default('workspace_delegation'),
  CALENDAR_CLIENT_INVITE_MODE: z.enum(['none', 'google_attendee']).default('google_attendee'),
  CALENDAR_SYNC_MODE: z.enum(['disabled', 'google']).default('disabled'),
  AUTH_SESSION_SECRET: z.string().min(32),
  CSRF_COOKIE_NAME: z.string().min(1).default('global_lmg_admin_csrf'),
  DOCUMENT_STORAGE_DRIVER: z.enum(['local', 'disabled']).default('local'),
  DOCUMENT_STORAGE_ROOT: z.string().min(1).default('../storage/glmg-uploads'),
  DOCUMENT_UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024),
  FILE_SCAN_BLOCK_DOWNLOAD_UNTIL_CLEAN: booleanFromEnv.default(false),
  FILE_SCAN_BLOCK_PREVIEW_UNTIL_CLEAN: booleanFromEnv.default(true),
  FILE_SCAN_MODE: fileScanMode.default('disabled'),
  CLAMAV_HOST: optionalString,
  CLAMAV_PORT: z.coerce.number().int().positive().default(3310),
  EMAIL_PROVIDER_MODE: z.enum(['disabled', 'preview', 'resend']).default('disabled'),
  EMAIL_FROM_ADDRESS: optionalString,
  HEALTHCHECK_REQUIRE_MYSQL: booleanFromEnv.default(true),
  GOOGLE_CALENDAR_CLIENT_EMAIL: optionalString,
  GOOGLE_CALENDAR_DEFAULT_CALENDAR_ID: optionalString,
  GOOGLE_CALENDAR_ID: optionalString,
  GOOGLE_CALENDAR_IMPERSONATE_DOMAIN: optionalString,
  GOOGLE_CALENDAR_PRIVATE_KEY: optionalString,
  GOOGLE_CALENDAR_SEND_UPDATES: z.enum(['none', 'all', 'externalOnly']).default('none'),
  GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL: optionalString,
  GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY: optionalString,
  MYSQL_DATABASE: optionalString,
  MYSQL_HOST: optionalString,
  MYSQL_PASSWORD: optionalString,
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_SSL_CA: optionalString,
  MYSQL_SSL_MODE: mysqlSslMode.default('DISABLED'),
  MYSQL_USER: optionalString,
  PORT: z.coerce.number().int().positive().default(3005),
  PUBLIC_ADMIN_WEB_ORIGIN: z.string().url().default('http://localhost:5174'),
  REMEMBER_ME_TTL_DAYS: z.coerce.number().int().positive().default(30),
  REMINDER_PROCESS_BATCH_SIZE: z.coerce.number().int().positive().max(100).default(25),
  RESEND_API_KEY: optionalString,
  SESSION_COOKIE_NAME: z.string().min(1).default('global_lmg_admin_session'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
  SMS_PROVIDER_MODE: smsProviderMode.default('disabled'),
  TWILIO_ACCOUNT_SID: optionalString,
  TWILIO_AUTH_TOKEN: optionalString,
  TWILIO_FROM_NUMBER: optionalString,
  TWILIO_MESSAGING_SERVICE_SID: optionalString,
  TWILIO_VERIFY_SERVICE_SID: optionalString,
});

const parsedEnv = envSchema.parse(rawEnv);

if (parsedEnv.EMAIL_PROVIDER_MODE === 'resend') {
  if (!parsedEnv.RESEND_API_KEY || !parsedEnv.EMAIL_FROM_ADDRESS) {
    throw new Error(
      'EMAIL_PROVIDER_MODE=resend requires both RESEND_API_KEY and EMAIL_FROM_ADDRESS.'
    );
  }
}

if (parsedEnv.FILE_SCAN_MODE === 'clamav' && !parsedEnv.CLAMAV_HOST) {
  throw new Error('FILE_SCAN_MODE=clamav requires CLAMAV_HOST.');
}

if (parsedEnv.SMS_PROVIDER_MODE === 'twilio' || parsedEnv.SMS_PROVIDER_MODE === 'twilio-verify') {
  if (!parsedEnv.TWILIO_ACCOUNT_SID || !parsedEnv.TWILIO_AUTH_TOKEN) {
    throw new Error(
      'SMS provider mode requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.'
    );
  }

  if (
    parsedEnv.SMS_PROVIDER_MODE === 'twilio' &&
    !parsedEnv.TWILIO_FROM_NUMBER &&
    !parsedEnv.TWILIO_MESSAGING_SERVICE_SID
  ) {
    throw new Error(
      'SMS_PROVIDER_MODE=twilio requires either TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID.'
    );
  }
}

export const env = parsedEnv;
