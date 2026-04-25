import 'dotenv/config';
import { z } from 'zod';

const rawEnv = { ...process.env };

if (!rawEnv.MYSQL_SSL_CA && rawEnv.MYSQL_SSL_CA_PATH) {
  rawEnv.MYSQL_SSL_CA = rawEnv.MYSQL_SSL_CA_PATH;
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
  CALENDAR_SYNC_MODE: z.enum(['disabled', 'google']).default('disabled'),
  AUTH_SESSION_SECRET: z.string().min(32).default('change-this-admin-development-session-secret-now'),
  CSRF_COOKIE_NAME: z.string().min(1).default('global_lmg_admin_csrf'),
  DOCUMENT_STORAGE_DRIVER: z.enum(['local', 'disabled']).default('local'),
  DOCUMENT_STORAGE_ROOT: z.string().min(1).default('../storage/glmg-uploads'),
  DOCUMENT_UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024),
  EMAIL_PROVIDER_MODE: z.enum(['disabled', 'preview', 'resend']).default('disabled'),
  HEALTHCHECK_REQUIRE_MYSQL: booleanFromEnv.default(true),
  GOOGLE_CALENDAR_CLIENT_EMAIL: optionalString,
  GOOGLE_CALENDAR_ID: optionalString,
  GOOGLE_CALENDAR_PRIVATE_KEY: optionalString,
  GOOGLE_CALENDAR_SEND_UPDATES: z.enum(['none', 'all', 'externalOnly']).default('none'),
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
  SESSION_COOKIE_NAME: z.string().min(1).default('global_lmg_admin_session'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
  SMS_PROVIDER_MODE: z.enum(['disabled', 'preview', 'twilio-verify']).default('disabled'),
});

export const env = envSchema.parse(rawEnv);
