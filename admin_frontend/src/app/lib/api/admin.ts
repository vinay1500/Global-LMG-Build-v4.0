import type {
  AuditEntriesResponse,
  BillingWorkspaceResponse,
  ClientWorkspaceResponse,
  ClientsListResponse,
  DashboardWorkspaceResponse,
  DocumentsListResponse,
  EventsWorkspaceResponse,
  MatterWorkspaceResponse,
  MattersListResponse,
  MessagesWorkspaceResponse,
  NotificationsListResponse,
  RbacWorkspaceResponse,
  SearchResultsResponse,
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
  createEvent: (payload: {
    clientAccountId?: string;
    date: string;
    durationMinutes?: number;
    matterId?: string;
    meetLink?: string;
    mode: string;
    notes?: string;
    time: string;
    title: string;
    type: string;
    visibleToClient?: boolean;
  }) =>
    apiRequest<{ status: 'created' }>(API_ENDPOINTS.admin.createEvent(), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  createMatterAssignment: (
    matterId: string,
    payload: {
      assignmentRoleCode: string;
      counselPartnerId?: string;
      feeAgreedAmount?: number;
      feeDueAmount?: number;
      feePaidAmount?: number;
      internalUserId?: string;
      isPrimary?: boolean;
      notes?: string;
    }
  ) =>
    apiRequest<{ status: 'created' }>(API_ENDPOINTS.admin.createMatterAssignment(matterId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  createMatterNote: (
    matterId: string,
    payload: { bodyText: string; title: string; visibleToClient?: boolean }
  ) =>
    apiRequest<{ status: 'created' }>(API_ENDPOINTS.admin.createMatterNote(matterId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  createRefund: (payload: {
    amount: number;
    invoiceId?: string;
    paymentId: string;
    reasonText: string;
  }) =>
    apiRequest<{ status: 'created' }>(API_ENDPOINTS.admin.createRefund(), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  getAuditEntries: () => apiRequest<AuditEntriesResponse>(API_ENDPOINTS.admin.audit()),
  getBillingWorkspace: () =>
    apiRequest<BillingWorkspaceResponse>(API_ENDPOINTS.admin.billingWorkspace()),
  getClientWorkspace: (clientId: string) =>
    apiRequest<ClientWorkspaceResponse>(API_ENDPOINTS.admin.clientWorkspace(clientId)),
  getDashboardWorkspace: () =>
    apiRequest<DashboardWorkspaceResponse>(API_ENDPOINTS.admin.dashboard()),
  getDocuments: () => apiRequest<DocumentsListResponse>(API_ENDPOINTS.admin.documents()),
  getEventsWorkspace: () => apiRequest<EventsWorkspaceResponse>(API_ENDPOINTS.admin.events()),
  getHealth: () =>
    apiRequest<{ service: string; status: 'ok' }>(API_ENDPOINTS.admin.health()),
  getMatterWorkspace: (matterId: string) =>
    apiRequest<MatterWorkspaceResponse>(API_ENDPOINTS.admin.matterWorkspace(matterId)),
  getMessagesWorkspace: () =>
    apiRequest<MessagesWorkspaceResponse>(API_ENDPOINTS.admin.messagesWorkspace()),
  getNotifications: () =>
    apiRequest<NotificationsListResponse>(API_ENDPOINTS.admin.notifications()),
  getRbacWorkspace: () =>
    apiRequest<RbacWorkspaceResponse>(API_ENDPOINTS.admin.rbacWorkspace()),
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
  markNotificationRead: (notificationId: string) =>
    apiRequest<{ status: 'read' }>(API_ENDPOINTS.admin.notificationRead(notificationId), {
      method: 'POST',
    }),
  dismissNotification: (notificationId: string) =>
    apiRequest<{ status: 'dismissed' }>(API_ENDPOINTS.admin.notificationDismiss(notificationId), {
      method: 'POST',
    }),
  replyToThread: (
    threadId: string,
    payload: { content: string; visibleToClient?: boolean }
  ) =>
    apiRequest<{ status: 'created' }>(API_ENDPOINTS.admin.replyToThread(threadId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  search: (query: string) =>
    apiRequest<SearchResultsResponse>(
      withQuery(API_ENDPOINTS.admin.search(), {
        q: query,
      })
    ),
  updateDocumentControls: (
    documentId: string,
    payload: { reviewState: 'reviewed' | 'unreviewed'; visibility: 'client' | 'internal' }
  ) =>
    apiRequest<{ status: 'updated' }>(API_ENDPOINTS.admin.documentControls(documentId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
    }),
  updateMatterDetails: (
    matterId: string,
    payload: {
      issueSummary?: string;
      operationalStatusCode?: string;
      quotedTotalAmount?: number;
      selectedServices?: string[];
    }
  ) =>
    apiRequest<{ status: 'updated' }>(API_ENDPOINTS.admin.matterDetails(matterId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
    }),
  updateMatterStage: (
    matterId: string,
    payload: {
      changeNote?: string;
      operationalStatusCode?: string;
      stageCode: string;
      visibleToClient?: boolean;
    }
  ) =>
    apiRequest<{ status: 'updated' }>(API_ENDPOINTS.admin.matterStage(matterId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
    }),
};
