import type {
  BillingWorkspaceResponse,
  ClientWorkspaceResponse,
  ClientsListResponse,
  DocumentsListResponse,
  MatterWorkspaceResponse,
  MattersListResponse,
  MessagesWorkspaceResponse,
} from './contracts';
import { apiRequest } from './client';
import { API_ENDPOINTS } from './endpoints';

const withQuery = (url: string, params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `${url}?${query}` : url;
};

export const adminApi = {
  getBillingWorkspace: () =>
    apiRequest<BillingWorkspaceResponse>(API_ENDPOINTS.admin.billingWorkspace()),
  getClientWorkspace: (clientId: string) =>
    apiRequest<ClientWorkspaceResponse>(API_ENDPOINTS.admin.clientWorkspace(clientId)),
  getDocuments: () => apiRequest<DocumentsListResponse>(API_ENDPOINTS.admin.documents()),
  getHealth: () =>
    apiRequest<{ service: string; status: 'ok' }>(API_ENDPOINTS.admin.health()),
  getMatterWorkspace: (matterId: string) =>
    apiRequest<MatterWorkspaceResponse>(API_ENDPOINTS.admin.matterWorkspace(matterId)),
  getMessagesWorkspace: () =>
    apiRequest<MessagesWorkspaceResponse>(API_ENDPOINTS.admin.messagesWorkspace()),
  listClients: (params: { limit?: number; offset?: number; search?: string } = {}) =>
    apiRequest<ClientsListResponse>(
      withQuery(API_ENDPOINTS.admin.clients(), {
        limit: params.limit ?? 100,
        offset: params.offset ?? 0,
        search: params.search,
      })
    ),
  listMatters: (params: { limit?: number; search?: string } = {}) =>
    apiRequest<MattersListResponse>(
      withQuery(API_ENDPOINTS.admin.matters(), {
        limit: params.limit ?? 100,
        search: params.search,
      })
    ),
};
