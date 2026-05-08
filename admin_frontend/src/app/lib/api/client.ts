import type { ApiErrorResponse } from './contracts';

const DEFAULT_HEADERS = {
  Accept: 'application/json',
};

const CSRF_COOKIE_NAME = 'global_lmg_admin_csrf';
const inFlightIdempotencyKeys = new Map<string, string>();

export class ApiRequestError extends Error {
  public readonly code: string;
  public readonly issues?: unknown;
  public readonly retryAfterSeconds?: number;

  constructor(
    code: string,
    message: string,
    options: {
      issues?: unknown;
      retryAfterSeconds?: number;
    } = {}
  ) {
    super(message);
    this.code = code;
    this.issues = options.issues;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

const readCookie = (name: string) => {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : undefined;
};

const createIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getBodyFingerprint = (body: BodyInit | null | undefined) => {
  if (typeof body === 'string') {
    return body;
  }

  if (body instanceof URLSearchParams) {
    return body.toString();
  }

  return '';
};

const attachInFlightIdempotencyKey = (
  headers: Headers,
  method: string,
  url: string,
  body: BodyInit | null | undefined
) => {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || headers.has('Idempotency-Key')) {
    return null;
  }

  const fingerprint = `${method} ${url} ${getBodyFingerprint(body)}`;
  const key = inFlightIdempotencyKeys.get(fingerprint) ?? createIdempotencyKey();
  inFlightIdempotencyKeys.set(fingerprint, key);
  headers.set('Idempotency-Key', key);

  return {
    fingerprint,
    key,
  };
};

export const apiRequest = async <TResponse>(
  url: string,
  init: RequestInit = {}
): Promise<TResponse> => {
  const headers = new Headers({
    ...DEFAULT_HEADERS,
    ...(init.headers || {}),
  });

  const method = init.method?.toUpperCase() || 'GET';
  const idempotency = attachInFlightIdempotencyKey(headers, method, url, init.body);

  if (method !== 'GET' && method !== 'HEAD' && !headers.has('x-csrf-token')) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken);
    }
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers,
  }).finally(() => {
    if (idempotency && inFlightIdempotencyKeys.get(idempotency.fingerprint) === idempotency.key) {
      inFlightIdempotencyKeys.delete(idempotency.fingerprint);
    }
  });

  if (!response.ok) {
    let errorBody: ApiErrorResponse | undefined;

    try {
      errorBody = (await response.json()) as ApiErrorResponse;
    } catch {
      errorBody = undefined;
    }

    throw new ApiRequestError(
      errorBody?.error || 'api_request_failed',
      errorBody?.message || `API request failed with status ${response.status}`,
      {
        issues: errorBody?.issues,
        retryAfterSeconds: errorBody?.retryAfterSeconds,
      }
    );
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
};
