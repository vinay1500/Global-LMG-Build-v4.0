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

const envSchema = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  AUTH_SESSION_SECRET: z.string().min(32).default('change-this-admin-development-session-secret-now'),
  CSRF_COOKIE_NAME: z.string().min(1).default('global_lmg_admin_csrf'),
  HEALTHCHECK_REQUIRE_MYSQL: booleanFromEnv.default(true),
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
  SESSION_COOKIE_NAME: z.string().min(1).default('global_lmg_admin_session'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
});

export const env = envSchema.parse(rawEnv);
