import type { RequestData } from '../../data/requestWizardData';
import type {
  DashboardMessageSubmissionPayload,
  DashboardSnapshotResponse,
  InvoiceDetailResponse,
  NotificationPreferencesResponse,
  PortalNotificationResponse,
  DashboardRequestSubmissionPayload,
  UpdateNotificationPreferencesPayload,
} from './contracts';
import { API_ENDPOINTS } from './endpoints';
import { apiRequest } from './client';

const postJson = <TResponse>(url: string, payload: unknown) =>
  apiRequest<TResponse>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

const putJson = <TResponse>(url: string, payload: unknown) =>
  apiRequest<TResponse>(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

const toRequestSubmissionPayload = (
  request: RequestData,
  documentUploadIds: string[] = []
): DashboardRequestSubmissionPayload => ({
  ...request,
  documentUploadIds,
  documents: request.documents.map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
  })),
});

export const dashboardApi = {
  buildInvoiceDownloadUrl: (invoiceId: string) => API_ENDPOINTS.me.invoiceDownload(invoiceId),
  getSnapshot: () => apiRequest<DashboardSnapshotResponse>(API_ENDPOINTS.dashboard.snapshot()),
  getInvoiceDetail: (invoiceId: string) =>
    apiRequest<InvoiceDetailResponse>(API_ENDPOINTS.me.invoiceDetail(invoiceId)),
  getNotificationPreferences: () =>
    apiRequest<NotificationPreferencesResponse>(API_ENDPOINTS.me.preferences()),
  updateNotificationPreferences: (payload: UpdateNotificationPreferencesPayload) =>
    putJson<NotificationPreferencesResponse>(API_ENDPOINTS.me.preferences(), payload),
  getNotifications: () =>
    apiRequest<PortalNotificationResponse[]>(API_ENDPOINTS.notifications.list()),
  markNotificationRead: (notificationId: string) =>
    postJson<void>(API_ENDPOINTS.notifications.markRead(notificationId), {}),
  dismissNotification: (notificationId: string) =>
    postJson<void>(API_ENDPOINTS.notifications.dismiss(notificationId), {}),
  submitRequest: (request: RequestData, documentUploadIds: string[] = []) =>
    postJson<DashboardSnapshotResponse>(
      API_ENDPOINTS.dashboard.requests(),
      toRequestSubmissionPayload(request, documentUploadIds)
    ),
  sendMessage: (payload: DashboardMessageSubmissionPayload) =>
    postJson<DashboardSnapshotResponse>(API_ENDPOINTS.dashboard.messages(), payload),
};
