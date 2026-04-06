export type PortalMode = 'express-portal' | 'google-form';

const DEFAULT_PUBLIC_SITE_URL = 'https://www.globallmg.org';
const DEFAULT_API_BASE_URL = '/api';
const DEFAULT_PORTAL_MODE: PortalMode = 'express-portal';
const DEFAULT_GOOGLE_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScPhase0DummyGlobalLMGForm/viewform';

const getOptionalString = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getAbsoluteUrl = (value: string | undefined, fallbackValue: string) => {
  if (!value) {
    return fallbackValue;
  }

  try {
    return new URL(value).toString();
  } catch {
    return fallbackValue;
  }
};

const getApiBaseUrl = (value: string | undefined) => {
  if (!value) {
    return DEFAULT_API_BASE_URL;
  }

  if (value.startsWith('/')) {
    return value;
  }

  try {
    return new URL(value).toString();
  } catch {
    return DEFAULT_API_BASE_URL;
  }
};

const getPortalMode = (value: string | undefined): PortalMode => {
  return value === 'express-portal' ? 'express-portal' : DEFAULT_PORTAL_MODE;
};

export const PUBLIC_SITE_URL = getAbsoluteUrl(
  import.meta.env.VITE_PUBLIC_SITE_URL,
  DEFAULT_PUBLIC_SITE_URL
);
export const API_BASE_URL = getApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
export const PORTAL_MODE = getPortalMode(import.meta.env.VITE_PORTAL_MODE);
export const GOOGLE_CLIENT_ID = getOptionalString(import.meta.env.VITE_GOOGLE_CLIENT_ID);
export const RUNTIME_GOOGLE_FORM_URL = getAbsoluteUrl(
  import.meta.env.VITE_TEMP_GOOGLE_FORM_URL,
  DEFAULT_GOOGLE_FORM_URL
);
