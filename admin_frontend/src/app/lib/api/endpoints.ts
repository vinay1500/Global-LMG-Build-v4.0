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
      session: () => joinApiPath('/v1/admin/auth/session'),
      signIn: () => joinApiPath('/v1/admin/auth/sign-in'),
      signOut: () => joinApiPath('/v1/admin/auth/sign-out'),
    },
    billingWorkspace: () => joinApiPath('/v1/admin/billing/workspace'),
    createEvent: () => joinApiPath('/v1/admin/events'),
    createMatterAssignment: (matterId: string) => joinApiPath(`/v1/admin/matters/${matterId}/assignments`),
    createMatterNote: (matterId: string) => joinApiPath(`/v1/admin/matters/${matterId}/notes`),
    createRefund: () => joinApiPath('/v1/admin/billing/refunds'),
    clientWorkspace: (clientId: string) => joinApiPath(`/v1/admin/clients/${clientId}`),
    clients: () => joinApiPath('/v1/admin/clients'),
    dashboard: () => joinApiPath('/v1/admin/dashboard'),
    documents: () => joinApiPath('/v1/admin/documents'),
    documentControls: (documentId: string) => joinApiPath(`/v1/admin/documents/${documentId}`),
    events: () => joinApiPath('/v1/admin/events'),
    health: () => joinApiPath('/v1/admin/health'),
    matterWorkspace: (matterId: string) => joinApiPath(`/v1/admin/matters/${matterId}`),
    matters: () => joinApiPath('/v1/admin/matters'),
    matterDetails: (matterId: string) => joinApiPath(`/v1/admin/matters/${matterId}`),
    matterStage: (matterId: string) => joinApiPath(`/v1/admin/matters/${matterId}/stage`),
    messagesWorkspace: () => joinApiPath('/v1/admin/messages/workspace'),
    notifications: () => joinApiPath('/v1/admin/notifications'),
    notificationDismiss: (notificationId: string) =>
      joinApiPath(`/v1/admin/notifications/${notificationId}/dismiss`),
    notificationRead: (notificationId: string) =>
      joinApiPath(`/v1/admin/notifications/${notificationId}/read`),
    replyToThread: (threadId: string) => joinApiPath(`/v1/admin/messages/${threadId}/replies`),
    rbacWorkspace: () => joinApiPath('/v1/admin/rbac/workspace'),
    search: () => joinApiPath('/v1/admin/search'),
  },
};
