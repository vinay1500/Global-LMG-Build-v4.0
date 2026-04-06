import 'dotenv/config';
import { z } from 'zod';
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
const envSchema = z.object({
    APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    REQUEST_LOGGING_ENABLED: booleanFromEnv.default(true),
    PORT: z.coerce.number().int().positive().default(3005),
    PUBLIC_ADMIN_WEB_ORIGIN: z.string().url().default('http://localhost:5175'),
    SESSION_COOKIE_NAME: z.string().min(1).default('global_lmg_admin_session'),
    CSRF_COOKIE_NAME: z.string().min(1).default('global_lmg_admin_csrf'),
    AUTH_SESSION_SECRET: z.string().min(32).default('change-this-admin-development-session-secret-now'),
    SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
    REMEMBER_ME_TTL_DAYS: z.coerce.number().int().positive().default(30),
    GENERAL_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    GENERAL_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(600),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(20),
    HEALTHCHECK_REQUIRE_MYSQL: booleanFromEnv.default(true),
    EMAIL_PROVIDER_MODE: z.enum(['preview', 'disabled', 'resend']).default('disabled'),
    EMAIL_FROM_ADDRESS: optionalString,
    RESEND_API_KEY: optionalString,
    MYSQL_HOST: optionalString,
    MYSQL_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
    MYSQL_PORT: z.coerce.number().int().positive().default(3306),
    MYSQL_DATABASE: optionalString,
    MYSQL_PASSWORD: optionalString,
    MYSQL_USER: optionalString,
    DOCUMENT_STORAGE_DRIVER: z.enum(['local', 'disabled']).default('local'),
    DOCUMENT_STORAGE_ROOT: z.string().min(1).default('../backend/var/uploads'),
    DOCUMENT_UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024),
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
    ADMIN_BOOTSTRAP_NAME: z.string().min(2).default('Global LMG Admin'),
    ADMIN_BOOTSTRAP_EMAIL: z.string().email().default('admin@globallmg.org'),
    ADMIN_BOOTSTRAP_PASSWORD: z.string().min(12).default('ChangeThisAdminPasswordNow123!'),
    ADMIN_BOOTSTRAP_ROLE_CODE: z.enum([
        'ops_admin',
        'case_manager',
        'billing_admin',
        'messaging_desk',
        'management_viewer',
    ]).default('ops_admin'),
    GOOGLE_CALENDAR_PROVIDER_MODE: z.enum(['disabled', 'google-calendar']).default('disabled'),
    GOOGLE_CALENDAR_ID: z.string().min(1).default('primary'),
    GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL: optionalString,
    GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY: optionalString,
    GOOGLE_CALENDAR_IMPERSONATE_USER: optionalString,
    REMINDER_WORKER_ENABLED: booleanFromEnv.default(true),
    REMINDER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
    MEETING_REMINDER_OFFSETS_MINUTES: z.string().min(1).default('1440,60'),
});
const parsedEnv = envSchema.parse(process.env);
if (parsedEnv.EMAIL_PROVIDER_MODE === 'resend') {
    if (!parsedEnv.RESEND_API_KEY || !parsedEnv.EMAIL_FROM_ADDRESS) {
        throw new Error('EMAIL_PROVIDER_MODE=resend requires both RESEND_API_KEY and EMAIL_FROM_ADDRESS.');
    }
}
if (parsedEnv.GOOGLE_CALENDAR_PROVIDER_MODE === 'google-calendar') {
    if (!parsedEnv.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL ||
        !parsedEnv.GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY ||
        !parsedEnv.GOOGLE_CALENDAR_ID) {
        throw new Error('GOOGLE_CALENDAR_PROVIDER_MODE=google-calendar requires GOOGLE_CALENDAR_ID, GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL, and GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY.');
    }
}
if (parsedEnv.APP_ENV === 'production') {
    if (parsedEnv.AUTH_SESSION_SECRET === 'change-this-admin-development-session-secret-now') {
        throw new Error('Production AUTH_SESSION_SECRET must be replaced with a strong random secret.');
    }
    if (!parsedEnv.PUBLIC_ADMIN_WEB_ORIGIN.startsWith('https://')) {
        throw new Error('Production PUBLIC_ADMIN_WEB_ORIGIN must use https://');
    }
}
export const env = {
    ...parsedEnv,
    MEETING_REMINDER_OFFSETS: parsedEnv.MEETING_REMINDER_OFFSETS_MINUTES.split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value) && value >= 0)
        .sort((left, right) => right - left),
};
