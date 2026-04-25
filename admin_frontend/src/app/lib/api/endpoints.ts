import { API_BASE_URL } from '../../config/env';

const joinApiPath = (path: string) => {
  if (API_BASE_URL.endsWith('/')) {
    return `${API_BASE_URL.slice(0, -1)}${path}`;
  }

  return `${API_BASE_URL}${path}`;
};

export const API_ENDPOINTS = {
  admin: {
    audit: () => joinApiPath('/v1/admin/audit'),
    auth: {
      password: () => joinApiPath('/v1/admin/auth/password'),
      session: () => joinApiPath('/v1/admin/auth/session'),
      signIn: () => joinApiPath('/v1/admin/auth/sign-in'),
      signOut: () => joinApiPath('/v1/admin/auth/sign-out'),
    },
    billingWorkspace: () => joinApiPath('/v1/admin/billing/workspace'),
    createInvoice: () => joinApiPath('/v1/admin/billing/invoices'),
    createEvent: () => joinApiPath('/v1/admin/events'),
    cancelEvent: (eventId: string) => joinApiPath(`/v1/admin/events/${eventId}/cancel`),
    createMatterAssignment: (matterId: string) => joinApiPath(`/v1/admin/matters/${matterId}/assignments`),
    createMatterNote: (matterId: string) => joinApiPath(`/v1/admin/matters/${matterId}/notes`),
    createRefund: () => joinApiPath('/v1/admin/billing/refunds'),
    recordPayment: () => joinApiPath('/v1/admin/billing/payments'),
    clientWorkspace: (clientId: string) => joinApiPath(`/v1/admin/clients/${clientId}`),
    clients: () => joinApiPath('/v1/admin/clients'),
    dashboard: () => joinApiPath('/v1/admin/dashboard'),
    documents: () => joinApiPath('/v1/admin/documents'),
    documentControls: (documentId: string) => joinApiPath(`/v1/admin/documents/${documentId}`),
    documentDetail: (documentId: string) => joinApiPath(`/v1/admin/documents/${documentId}`),
    documentDownload: (documentId: string) => joinApiPath(`/v1/admin/documents/${documentId}/download`),
    documentPreview: (documentId: string) => joinApiPath(`/v1/admin/documents/${documentId}/preview`),
    documentVersionUpload: (documentId: string) =>
      joinApiPath(`/v1/admin/documents/${documentId}/versions`),
    events: () => joinApiPath('/v1/admin/events'),
    health: () => joinApiPath('/v1/admin/health'),
    matterWorkspace: (matterId: string) => joinApiPath(`/v1/admin/matters/${matterId}`),
    matters: () => joinApiPath('/v1/admin/matters'),
    matterDetails: (matterId: string) => joinApiPath(`/v1/admin/matters/${matterId}`),
    matterPackageArchive: (matterId: string, proposalVersion: number) =>
      joinApiPath(`/v1/admin/matters/${matterId}/package-proposals/${proposalVersion}/archive`),
    matterPackageDraft: (matterId: string) =>
      joinApiPath(`/v1/admin/matters/${matterId}/package-proposals/draft`),
    matterPackageOverride: (matterId: string) =>
      joinApiPath(`/v1/admin/matters/${matterId}/package-selection/override`),
    matterPackageProposals: (matterId: string) =>
      joinApiPath(`/v1/admin/matters/${matterId}/package-proposals`),
    matterPackagePublish: (matterId: string) =>
      joinApiPath(`/v1/admin/matters/${matterId}/package-proposals/publish`),
    matterStage: (matterId: string) => joinApiPath(`/v1/admin/matters/${matterId}/stage`),
    updateEvent: (eventId: string) => joinApiPath(`/v1/admin/events/${eventId}`),
    messageArchive: (threadId: string) => joinApiPath(`/v1/admin/messages/${threadId}/archive`),
    messageRead: (threadId: string) => joinApiPath(`/v1/admin/messages/${threadId}/read`),
    messagesWorkspace: () => joinApiPath('/v1/admin/messages/workspace'),
    notifications: () => joinApiPath('/v1/admin/notifications'),
    notificationDismiss: (notificationId: string) =>
      joinApiPath(`/v1/admin/notifications/${notificationId}/dismiss`),
    notificationRead: (notificationId: string) =>
      joinApiPath(`/v1/admin/notifications/${notificationId}/read`),
    processReminders: () => joinApiPath('/v1/admin/reminders/process'),
    reminderRetry: (reminderId: string) => joinApiPath(`/v1/admin/reminders/${reminderId}/retry`),
    reminderWorkspace: () => joinApiPath('/v1/admin/reminders/workspace'),
    reportsWorkspace: () => joinApiPath('/v1/admin/reports/workspace'),
    requestApprove: (requestId: string) => joinApiPath(`/v1/admin/requests/${requestId}/approve`),
    requestConvert: (requestId: string) => joinApiPath(`/v1/admin/requests/${requestId}/convert`),
    requestDecline: (requestId: string) => joinApiPath(`/v1/admin/requests/${requestId}/decline`),
    requestInformation: (requestId: string) =>
      joinApiPath(`/v1/admin/requests/${requestId}/request-information`),
    requestsWorkspace: () => joinApiPath('/v1/admin/requests/workspace'),
    sendInvoice: (invoiceId: string) => joinApiPath(`/v1/admin/billing/invoices/${invoiceId}/send`),
    replyToThread: (threadId: string) => joinApiPath(`/v1/admin/messages/${threadId}/replies`),
    rbacWorkspace: () => joinApiPath('/v1/admin/rbac/workspace'),
    search: () => joinApiPath('/v1/admin/search'),
    settingsWorkspace: () => joinApiPath('/v1/admin/settings/workspace'),
    tasksWorkspace: () => joinApiPath('/v1/admin/tasks/workspace'),
    uploadDocument: () => joinApiPath('/v1/admin/documents/uploads'),
  },
};
