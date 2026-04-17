import type { AdminSessionResponse } from './contracts';
import { apiRequest } from './client';
import { API_ENDPOINTS } from './endpoints';

const postJson = <TResponse>(url: string, payload?: unknown) =>
  apiRequest<TResponse>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

export const authApi = {
  getSession: () => apiRequest<AdminSessionResponse>(API_ENDPOINTS.admin.auth.session()),
  signIn: (payload: { identifier: string; password: string; rememberMe: boolean }) =>
    postJson<AdminSessionResponse>(API_ENDPOINTS.admin.auth.signIn(), payload),
  signOut: () => apiRequest<void>(API_ENDPOINTS.admin.auth.signOut(), { method: 'POST' }),
};
