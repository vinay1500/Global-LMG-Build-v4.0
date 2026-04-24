import 'dotenv/config';
import { z } from 'zod';

const rawEnv = { ...process.env };

if (!rawEnv.SMS_PROVIDER_MODE && rawEnv.PHONE_PROVIDER_MODE) {
  rawEnv.SMS_PROVIDER_MODE = rawEnv.PHONE_PROVIDER_MODE;
}

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

const smsProviderMode = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'twilio') {
    return 'twilio-verify';
  }

  return normalized;
}, z.enum(['preview', 'disabled', 'twilio-verify']));

const googleAuthMode = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'google-tokeninfo') {
    return 'google-jwt';
  }

  return normalized;
}, z.enum(['preview', 'disabled', 'google-jwt']));

const mysqlSslMode = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().toUpperCase();
}, z.enum(['DISABLED', 'REQUIRED']));

const envSchema = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  REQUEST_LOGGING_ENABLED: booleanFromEnv.default(true),
  PORT: z.coerce.number().int().positive().default(3001),
  PUBLIC_WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  AUTH_STORE_MODE: z.enum(['mysql']).default('mysql'),
  DASHBOARD_STORE_MODE: z.enum(['mysql']).default('mysql'),
  HEALTHCHECK_REQUIRE_MYSQL: booleanFromEnv.default(true),
  SESSION_COOKIE_NAME: z.string().min(1).default('global_lmg_session'),
  AUTH_FLOW_COOKIE_NAME: z.string().min(1).default('global_lmg_auth_flow'),
  CSRF_COOKIE_NAME: z.string().min(1).default('global_lmg_csrf'),
  AUTH_SESSION_SECRET: z.string().min(32).default('change-this-development-session-secret-now'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
  REMEMBER_ME_TTL_DAYS: z.coerce.number().int().positive().default(30),
  EMAIL_VERIFICATION_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  PHONE_OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  AUTH_FLOW_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  AUTH_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  AUTH_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  EMAIL_PROVIDER_MODE: z.enum(['preview', 'disabled', 'resend']).default('disabled'),
  SMS_PROVIDER_MODE: smsProviderMode.default('disabled'),
  GOOGLE_AUTH_MODE: googleAuthMode.default('disabled'),
  EMAIL_FROM_ADDRESS: optionalString,
  RESEND_API_KEY: optionalString,
  TWILIO_ACCOUNT_SID: optionalString,
  TWILIO_AUTH_TOKEN: optionalString,
  TWILIO_VERIFY_SERVICE_SID: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  PREVIEW_ACCOUNT_ID: z.string().min(1).default('user-1'),
  PREVIEW_ACCOUNT_NAME: z.string().min(1).default('Arjun Mehta'),
  PREVIEW_ACCOUNT_EMAIL: z.string().email().default('arjun.m@example.com'),
  PREVIEW_ACCOUNT_PHONE: z.string().min(8).default('+91 98765 43210'),
  PREVIEW_ACCOUNT_COUNTRY: z.string().min(2).default('IN'),
  PREVIEW_ACCOUNT_PASSWORD: z.string().min(8).default('Preview@123'),
  PREVIEW_GOOGLE_EMAIL: z.string().email().default('preview.google@globallmg.org'),
  PREVIEW_GOOGLE_NAME: z.string().min(2).default('Google Preview Client'),
  PREVIEW_GOOGLE_COUNTRY: z.string().min(2).default('IN'),
  MYSQL_HOST: optionalString,
  MYSQL_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_DATABASE: optionalString,
  MYSQL_PASSWORD: optionalString,
  MYSQL_SSL_CA: optionalString,
  MYSQL_SSL_MODE: mysqlSslMode.default('DISABLED'),
  MYSQL_USER: optionalString,
  DOCUMENT_STORAGE_DRIVER: z.enum(['local', 'disabled']).default('local'),
  DOCUMENT_STORAGE_ROOT: z.string().min(1).default('../storage/glmg-uploads'),
  DOCUMENT_UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
});

const parsedEnv = envSchema.parse(rawEnv);

if (parsedEnv.EMAIL_PROVIDER_MODE === 'resend') {
  if (!parsedEnv.RESEND_API_KEY || !parsedEnv.EMAIL_FROM_ADDRESS) {
    throw new Error(
      'EMAIL_PROVIDER_MODE=resend requires both RESEND_API_KEY and EMAIL_FROM_ADDRESS.'
    );
  }
}

if (parsedEnv.SMS_PROVIDER_MODE === 'twilio-verify') {
  if (
    !parsedEnv.TWILIO_ACCOUNT_SID ||
    !parsedEnv.TWILIO_AUTH_TOKEN ||
    !parsedEnv.TWILIO_VERIFY_SERVICE_SID
  ) {
    throw new Error(
      'SMS_PROVIDER_MODE=twilio-verify requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID.'
    );
  }
}

if (parsedEnv.GOOGLE_AUTH_MODE === 'google-jwt' && !parsedEnv.GOOGLE_CLIENT_ID) {
  throw new Error('GOOGLE_AUTH_MODE=google-jwt requires GOOGLE_CLIENT_ID.');
}

if (parsedEnv.APP_ENV === 'production') {
  if (parsedEnv.AUTH_SESSION_SECRET === 'change-this-development-session-secret-now') {
    throw new Error('Production AUTH_SESSION_SECRET must be replaced with a strong random secret.');
  }

  if (!parsedEnv.PUBLIC_WEB_ORIGIN.startsWith('https://')) {
    throw new Error('Production PUBLIC_WEB_ORIGIN must use https://');
  }

  if (
    parsedEnv.EMAIL_PROVIDER_MODE === 'preview' ||
    parsedEnv.SMS_PROVIDER_MODE === 'preview' ||
    parsedEnv.GOOGLE_AUTH_MODE === 'preview'
  ) {
    throw new Error('Preview auth providers are not allowed when APP_ENV=production.');
  }
}

export const env = parsedEnv;
