 
import { RUNTIME_GOOGLE_FORM_URL } from './runtime';

export const TEMP_GOOGLE_FORM_URL = RUNTIME_GOOGLE_FORM_URL;

export const CLIENT_INTAKE_WARNING =
  'Do not submit privileged, highly sensitive, regulated, or payment-related information through the temporary Google Form.';

const TRUSTED_GOOGLE_FORM_HOSTS = new Set(['docs.google.com', 'forms.gle']);

const getTrustedGoogleFormUrl = (candidateUrl: string): string | null => {
  try {
    const parsedUrl = new URL(candidateUrl);

    if (parsedUrl.protocol !== 'https:') {
      return null;
    }

    if (!TRUSTED_GOOGLE_FORM_HOSTS.has(parsedUrl.hostname)) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
};

export const CLIENT_INTAKE_URL = getTrustedGoogleFormUrl(TEMP_GOOGLE_FORM_URL);
export const HAS_TRUSTED_CLIENT_INTAKE_URL = CLIENT_INTAKE_URL !== null;
export const CLIENT_INTAKE_HREF = CLIENT_INTAKE_URL ?? '/legal-disclaimer';
