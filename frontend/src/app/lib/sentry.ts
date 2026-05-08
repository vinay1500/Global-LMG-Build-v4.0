import * as Sentry from '@sentry/react';

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

const scrubEvent = (event: Sentry.ErrorEvent): Sentry.ErrorEvent => {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;
    event.request.headers = undefined;
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

export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

  if (!dsn) {
    return false;
  }

  Sentry.init({
    beforeSend: scrubEvent,
    dsn,
    environment:
      (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ||
      import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    release: import.meta.env.VITE_SENTRY_RELEASE as string | undefined,
    sendDefaultPii: false,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.05),
  });

  return true;
};

export { Sentry };
