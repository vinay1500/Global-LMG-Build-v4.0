import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { env } from '../../../config/env.js';
import { forbidden, serviceUnavailable, unauthorized } from '../../../lib/httpErrors.js';
import type { GoogleIdentity } from './types.js';

const verifyWithGoogleJwt = async (credential: string) => {
  let payload: TokenPayload | undefined;

  try {
    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      audience: env.GOOGLE_CLIENT_ID,
      idToken: credential,
    });
    payload = ticket.getPayload();
  } catch {
    throw unauthorized('google_token_invalid', 'Google authentication could not be verified.');
  }

  if (!payload?.sub || !payload.email) {
    throw unauthorized('google_identity_invalid', 'Google response did not include the required identity fields.');
  }

  if (env.GOOGLE_CLIENT_ID && payload.aud !== env.GOOGLE_CLIENT_ID) {
    throw unauthorized('google_audience_invalid', 'Google sign-in token audience does not match this application.');
  }

  return {
    email: payload.email.trim().toLowerCase(),
    emailVerified: Boolean(payload.email_verified),
    fullName: payload.name?.trim() || payload.email,
    pictureUrl: payload.picture,
    subject: payload.sub,
  } satisfies GoogleIdentity;
};

export const googleAuthProvider = {
  async resolveIdentity(credential: string | undefined) {
    if (env.GOOGLE_AUTH_MODE === 'preview') {
      return {
        email: env.PREVIEW_GOOGLE_EMAIL.trim().toLowerCase(),
        emailVerified: true,
        fullName: env.PREVIEW_GOOGLE_NAME,
        subject: env.PREVIEW_GOOGLE_EMAIL.trim().toLowerCase(),
      } satisfies GoogleIdentity;
    }

    if (env.GOOGLE_AUTH_MODE === 'disabled') {
      throw forbidden(
        'google_sign_in_disabled',
        'Google sign-in is not available right now.'
      );
    }

    if (!credential?.trim()) {
      throw unauthorized('google_credential_required', 'Google sign-in requires an ID token.');
    }

    if (!env.GOOGLE_CLIENT_ID) {
      throw serviceUnavailable(
        'google_provider_misconfigured',
        'Google sign-in is missing the client ID configuration.'
      );
    }

    return verifyWithGoogleJwt(credential.trim());
  },
};
