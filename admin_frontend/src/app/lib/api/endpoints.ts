import { API_BASE_URL } from '../../config/env';

const joinApiPath = (path: string) => {
  if (API_BASE_URL.endsWith('/')) {
    return `${API_BASE_URL.slice(0, -1)}${path}`;
  }

  return `${API_BASE_URL}${path}`;
};

export const API_ENDPOINTS = {
  admin: {
    auth: {
      session: () => joinApiPath('/v1/admin/auth/session'),
      signIn: () => joinApiPath('/v1/admin/auth/sign-in'),
      signOut: () => joinApiPath('/v1/admin/auth/sign-out'),
    },
    billingWorkspace: () => joinApiPath('/v1/admin/billing/workspace'),
    clientWorkspace: (clientId: string) => joinApiPath(`/v1/admin/clients/${clientId}`),
    clients: () => joinApiPath('/v1/admin/clients'),
    documents: () => joinApiPath('/v1/admin/documents'),
    health: () => joinApiPath('/v1/admin/health'),
    matterWorkspace: (matterId: string) => joinApiPath(`/v1/admin/matters/${matterId}`),
    matters: () => joinApiPath('/v1/admin/matters'),
    messagesWorkspace: () => joinApiPath('/v1/admin/messages/workspace'),
  },
};
