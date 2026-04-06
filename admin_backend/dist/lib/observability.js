import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
const LOG_LEVEL_WEIGHT = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};
const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const shouldLog = (level) => LOG_LEVEL_WEIGHT[level] >= LOG_LEVEL_WEIGHT[env.LOG_LEVEL];
const getClientIp = (request) => {
    const forwardedFor = request.header('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0]?.trim() || request.ip;
    }
    return request.ip;
};
const resolveRequestId = (request) => {
    const incomingId = request.header(REQUEST_ID_HEADER);
    if (incomingId && REQUEST_ID_PATTERN.test(incomingId)) {
        return incomingId;
    }
    return randomUUID();
};
export const getRequestId = (response) => typeof response.locals.requestId === 'string' ? response.locals.requestId : 'unknown';
export const logEvent = (level, message, fields = {}) => {
    if (!shouldLog(level)) {
        return;
    }
    const payload = {
        level,
        message,
        service: 'global-lmg-api',
        environment: env.APP_ENV,
        timestamp: new Date().toISOString(),
        ...fields,
    };
    const serialized = JSON.stringify(payload);
    if (level === 'error') {
        console.error(serialized);
        return;
    }
    if (level === 'warn') {
        console.warn(serialized);
        return;
    }
    console.log(serialized);
};
export const requestContextMiddleware = (request, response, next) => {
    const requestId = resolveRequestId(request);
    response.locals.requestId = requestId;
    response.locals.requestStartedAt = process.hrtime.bigint();
    response.setHeader(REQUEST_ID_HEADER, requestId);
    next();
};
export const requestLoggingMiddleware = (request, response, next) => {
    if (!env.REQUEST_LOGGING_ENABLED) {
        next();
        return;
    }
    response.on('finish', () => {
        const startedAt = response.locals.requestStartedAt;
        const durationMs = startedAt
            ? Number(process.hrtime.bigint() - startedAt) / 1_000_000
            : undefined;
        const statusCode = response.statusCode;
        const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
        logEvent(level, 'request.completed', {
            contentLength: Number(response.getHeader('content-length') || 0),
            durationMs: durationMs ? Number(durationMs.toFixed(2)) : undefined,
            ip: getClientIp(request),
            method: request.method,
            path: request.originalUrl,
            requestId: getRequestId(response),
            statusCode,
            userAgent: request.header('user-agent') || 'unknown',
        });
    });
    next();
};
