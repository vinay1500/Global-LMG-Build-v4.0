import type { ApiErrorResponse } from './contracts';

const DEFAULT_HEADERS = {
  Accept: 'application/json',
};

const CSRF_COOKIE_NAME = 'global_lmg_admin_csrf';

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

export const apiRequest = async <TResponse>(
  url: string,
  init: RequestInit = {}
): Promise<TResponse> => {
  const headers = new Headers({
    ...DEFAULT_HEADERS,
    ...(init.headers || {}),
  });

  const method = init.method?.toUpperCase() || 'GET';

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
