import type { RequestData } from '../../data/requestWizardData';
import type {
  DashboardMessageSubmissionPayload,
  DashboardPackageSelectionResponse,
  DashboardSnapshotResponse,
  AccountChangeRequestResponse,
  ClientAccountSettingsResponse,
  InvoiceDetailResponse,
  InvoicePaymentOrderResponse,
  InvoicePaymentVerifyResponse,
  NotificationPreferencesResponse,
  PortalNotificationResponse,
  DashboardRequestSubmissionPayload,
  RequestPricingConfigResponse,
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
): DashboardRequestSubmissionPayload => {
  const {
    caseDetails,
    consultationMode,
    documents,
    legalDomain,
    pastLegalAction,
    preferredDate,
    preferredEndAtUtc,
    preferredStartAtUtc,
    preferredTime,
    preferredTimezone,
    services,
    urgency,
  } = request;

  return {
    caseDetails,
    consultationMode,
    documentUploadIds,
    documents: documents.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
    })),
    legalDomain,
    pastLegalAction,
    preferredDate,
    preferredEndAtUtc,
    preferredStartAtUtc,
    preferredTime,
    preferredTimezone,
    services,
    urgency,
  };
};

export const dashboardApi = {
  buildInvoiceDownloadUrl: (invoiceId: string) => API_ENDPOINTS.me.invoiceDownload(invoiceId),
  getSnapshot: () => apiRequest<DashboardSnapshotResponse>(API_ENDPOINTS.dashboard.snapshot()),
  getRequestPricingConfig: () =>
    apiRequest<RequestPricingConfigResponse>(API_ENDPOINTS.dashboard.requestConfig()),
  getInvoiceDetail: (invoiceId: string) =>
    apiRequest<InvoiceDetailResponse>(API_ENDPOINTS.me.invoiceDetail(invoiceId)),
  createInvoicePaymentOrder: (invoiceId: string, payload: { amount?: number | null }) =>
    postJson<InvoicePaymentOrderResponse>(API_ENDPOINTS.me.invoicePaymentOrder(invoiceId), payload),
  verifyInvoicePayment: (
    invoiceId: string,
    payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }
  ) => postJson<InvoicePaymentVerifyResponse>(API_ENDPOINTS.me.invoicePaymentVerify(invoiceId), payload),
  getNotificationPreferences: () =>
    apiRequest<NotificationPreferencesResponse>(API_ENDPOINTS.me.preferences()),
  getAccountSettings: () =>
    apiRequest<ClientAccountSettingsResponse>(API_ENDPOINTS.me.accountSettings()),
  updateAccountAddress: (payload: {
    city: string;
    country: string;
    line1: string;
    line2?: string;
    postalCode: string;
    sourceCode?: 'google' | 'ip_prefill' | 'manual';
    state: string;
    googlePlaceId?: string | null;
    validationStatusCode?: 'manual' | 'unverified' | 'verified';
  }) =>
    apiRequest<ClientAccountSettingsResponse>(API_ENDPOINTS.me.accountAddress(), {
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    }),
  updateAccountName: (payload: { name: string }) =>
    apiRequest<ClientAccountSettingsResponse>(API_ENDPOINTS.me.accountName(), {
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    }),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    postJson<{ status: 'updated' }>(API_ENDPOINTS.me.accountPassword(), payload),
  requestEmailChange: (payload: { email: string }) =>
    postJson<AccountChangeRequestResponse>(API_ENDPOINTS.me.accountEmailChangeRequest(), payload),
  confirmEmailChange: (payload: { code: string; email: string }) =>
    postJson<ClientAccountSettingsResponse>(API_ENDPOINTS.me.accountEmailChangeConfirm(), payload),
  requestPhoneChange: (payload: { phone: string }) =>
    postJson<AccountChangeRequestResponse>(API_ENDPOINTS.me.accountPhoneChangeRequest(), payload),
  confirmPhoneChange: (payload: { code: string; phone: string }) =>
    postJson<ClientAccountSettingsResponse>(API_ENDPOINTS.me.accountPhoneChangeConfirm(), payload),
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
  markThreadRead: (threadId: string) =>
    postJson<DashboardSnapshotResponse>(API_ENDPOINTS.dashboard.messageRead(threadId), {}),
  selectMatterPackage: (matterId: string, payload: { matterPackageId: string; proposalVersion: number }) =>
    postJson<DashboardPackageSelectionResponse>(
      API_ENDPOINTS.dashboard.matterPackageSelection(matterId),
      payload
    ),
};
