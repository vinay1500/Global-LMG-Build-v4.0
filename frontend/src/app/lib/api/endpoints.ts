import { API_BASE_URL } from '../../config/runtime';

const joinApiPath = (path: string) => {
  if (API_BASE_URL.endsWith('/')) {
    return `${API_BASE_URL.slice(0, -1)}${path}`;
  }

  return `${API_BASE_URL}${path}`;
};

export const API_ENDPOINTS = {
  health: () => joinApiPath('/v1/health'),
  auth: {
    session: () => joinApiPath('/v1/auth/session'),
    signIn: () => joinApiPath('/v1/auth/sign-in'),
    signUp: () => joinApiPath('/v1/auth/sign-up'),
    google: () => joinApiPath('/v1/auth/google'),
    verifyEmail: () => joinApiPath('/v1/auth/verify-email'),
    submitGooglePhone: () => joinApiPath('/v1/auth/google/phone'),
    verifyPhoneOtp: () => joinApiPath('/v1/auth/verify-phone-otp'),
    requestPasswordReset: () => joinApiPath('/v1/auth/password-reset/request'),
    resetPassword: () => joinApiPath('/v1/auth/password-reset/confirm'),
    resendEmailVerification: () => joinApiPath('/v1/auth/email-verification/resend'),
    resendPhoneOtp: () => joinApiPath('/v1/auth/phone-otp/resend'),
    resendPasswordReset: () => joinApiPath('/v1/auth/password-reset/resend'),
    signOut: () => joinApiPath('/v1/auth/sign-out'),
  },
  dashboard: {
    snapshot: () => joinApiPath('/v1/dashboard'),
    requests: () => joinApiPath('/v1/dashboard/requests'),
    messages: () => joinApiPath('/v1/dashboard/messages'),
    matterPackageSelection: (matterId: string) =>
      joinApiPath(`/v1/dashboard/matters/${matterId}/package-selection`),
  },
  me: {
    preferences: () => joinApiPath('/v1/me/preferences'),
    documentDownload: (documentId: string) =>
      joinApiPath(`/v1/me/documents/${documentId}/download`),
    invoiceDetail: (invoiceId: string) => joinApiPath(`/v1/me/invoices/${invoiceId}`),
    invoiceDownload: (invoiceId: string) =>
      joinApiPath(`/v1/me/invoices/${invoiceId}/download`),
  },
  notifications: {
    list: () => joinApiPath('/v1/notifications'),
    markRead: (notificationId: string) =>
      joinApiPath(`/v1/notifications/${notificationId}/read`),
    dismiss: (notificationId: string) =>
      joinApiPath(`/v1/notifications/${notificationId}/dismiss`),
  },
  uploads: {
    intent: () => joinApiPath('/v1/uploads/intents'),
    content: (uploadId: string) => joinApiPath(`/v1/uploads/${uploadId}/content`),
  },
};
