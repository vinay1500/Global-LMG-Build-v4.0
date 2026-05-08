import * as Sentry from '@sentry/node';
import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env.js';

const SENSITIVE_FIELD_PATTERN =
  /(password|secret|token|cookie|csrf|authorization|api[_-]?key|private[_-]?key|credential|document|file|body|content|payload|attachment|upload)/i;

const redactValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      SENSITIVE_FIELD_PATTERN.test(key) ? '[Filtered]' : redactValue(nestedValue),
    ])
  );
};

const scrubHeaders = (headers: Record<string, unknown> | undefined): Record<string, string> | undefined => {
  if (!headers) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      /authorization|cookie|csrf|token|secret|key/i.test(key) ? '[Filtered]' : String(value ?? ''),
    ])
  );
};

const scrubEvent = (event: Sentry.ErrorEvent): Sentry.ErrorEvent => {
  if (event.request) {
    event.request.headers = scrubHeaders(event.request.headers as Record<string, unknown> | undefined);
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;
  }

  event.extra = redactValue(event.extra) as Sentry.Event['extra'];
  event.contexts = redactValue(event.contexts) as Sentry.Event['contexts'];
  event.breadcrumbs = event.breadcrumbs?.map((breadcrumb) => ({
    ...breadcrumb,
    data: redactValue(breadcrumb.data) as Record<string, unknown> | undefined,
    message: breadcrumb.message && SENSITIVE_FIELD_PATTERN.test(breadcrumb.message) ? '[Filtered]' : breadcrumb.message,
  }));

  return event;
};

let initialized = false;

export const initSentry = () => {
  if (!env.SENTRY_DSN || initialized) {
    return initialized;
  }

  Sentry.init({
    beforeSend: scrubEvent,
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.APP_ENV,
    integrations: [Sentry.expressIntegration(), Sentry.extraErrorDataIntegration({ depth: 4 })],
    release: env.SENTRY_RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  });

  initialized = true;
  return true;
};

export const isSentryEnabled = () => initialized;

export const sentryErrorHandler = (): ErrorRequestHandler =>
  initialized
    ? (Sentry.expressErrorHandler() as unknown as ErrorRequestHandler)
    : (error, _request, _response, next) => {
        next(error);
      };

export const captureSentryException = (error: unknown, extra: Record<string, unknown> = {}) => {
  if (!initialized) {
    return undefined;
  }

  return Sentry.captureException(error, {
    extra: redactValue(extra) as Record<string, unknown>,
  });
};

export const captureSentryMessage = (message: string, extra: Record<string, unknown> = {}) => {
  if (!initialized) {
    return undefined;
  }

  return Sentry.captureMessage(message, {
    extra: redactValue(extra) as Record<string, unknown>,
    level: 'info',
  });
};

export const flushSentry = (timeoutMs = 2000) => Sentry.flush(timeoutMs);
