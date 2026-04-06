export type AuthFlowPurposeCode = 'sign-in' | 'sign-up' | 'google' | 'password-reset';
export type VerificationTokenKind = 'email' | 'phone' | 'password-reset';

export interface PortalUserAccount {
  accountStatusCode: string;
  clientAccountId: number;
  clientAccountPublicId: string;
  countryCode: string;
  createdAt: string;
  displayName: string;
  email: string;
  emailVerifiedAt?: string;
  lastLoginAt?: string;
  ownerName: string;
  passwordHash?: string;
  phone: string;
  phoneVerifiedAt?: string;
  roleCodes: string[];
  userId: number;
  userPublicId: string;
}

export interface StoredAuthSession {
  createdAt: string;
  csrfSecretHash: string;
  expiresAt: string;
  lastSeenAt: string;
  rememberMe: boolean;
  revokedAt?: string;
  sessionTokenHash: string;
  userId: number;
  userPublicId: string;
}

export interface StoredVerificationToken {
  codeHash: string;
  expiresAt: string;
  id: number;
  purposeCode: string;
  sentAt: string;
  userId: number;
}

export interface StoredAuthFlow {
  emailTokenId?: number;
  expiresAt: string;
  flowTokenHash: string;
  id: number;
  oauthProviderCode?: string;
  passwordResetTokenId?: number;
  pendingCountry?: string;
  pendingPhone?: string;
  phoneTokenId?: number;
  purposeCode: AuthFlowPurposeCode;
  rememberMe: boolean;
  userId: number;
}
