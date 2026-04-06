export interface DeliveryResult {
  deliveryHint?: string;
  providerReference?: string;
}

export interface SendEmailCodeInput {
  code: string;
  purpose: 'email_verification' | 'password_reset';
  recipientEmail: string;
  recipientName?: string;
}

export interface SendSmsCodeInput {
  code?: string;
  purpose: 'phone_verification';
  recipientPhone: string;
}

export interface VerifySmsCodeInput {
  code: string;
  purpose: 'phone_verification';
  providerReference?: string;
  recipientPhone: string;
}

export interface VerifySmsCodeResult {
  approved: boolean;
  providerReference?: string;
  status?: string;
}

export interface GoogleIdentity {
  email: string;
  emailVerified: boolean;
  fullName: string;
  pictureUrl?: string;
  subject: string;
}
