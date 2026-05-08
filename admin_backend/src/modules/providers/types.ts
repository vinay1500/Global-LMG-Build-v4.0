export type DeliveryChannel = 'email' | 'sms';

export type DeliveryStatus = 'disabled' | 'failed' | 'preview' | 'sent';

export interface ProviderDeliveryResult {
  errorMessage?: string;
  providerCode: string;
  providerReference?: string;
  status: DeliveryStatus;
}

export interface SendEmailInput {
  html?: string;
  subject: string;
  text: string;
  to: string;
}

export interface SendSmsInput {
  body: string;
  to: string;
}
