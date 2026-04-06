import { env } from '../../../config/env.js';
import { serviceUnavailable } from '../../../lib/httpErrors.js';
const buildVerifyEndpoint = () => `https://verify.twilio.com/v2/Services/${encodeURIComponent(env.TWILIO_VERIFY_SERVICE_SID || '')}/Verifications`;
const buildVerifyCheckEndpoint = () => `https://verify.twilio.com/v2/Services/${encodeURIComponent(env.TWILIO_VERIFY_SERVICE_SID || '')}/VerificationCheck`;
const buildAuthHeader = () => `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`;
export const smsAuthProvider = {
    async sendCode(input) {
        if (env.SMS_PROVIDER_MODE === 'preview') {
            return {
                deliveryHint: `Preview OTP for ${input.recipientPhone}: ${input.code || '******'}`,
            };
        }
        if (env.SMS_PROVIDER_MODE === 'disabled') {
            throw serviceUnavailable('sms_provider_disabled', 'SMS delivery is disabled in this environment.');
        }
        if (!env.TWILIO_ACCOUNT_SID ||
            !env.TWILIO_AUTH_TOKEN ||
            !env.TWILIO_VERIFY_SERVICE_SID) {
            throw serviceUnavailable('sms_provider_misconfigured', 'SMS provider is missing required configuration.');
        }
        const body = new URLSearchParams({
            Channel: 'sms',
            To: input.recipientPhone,
        });
        const response = await fetch(buildVerifyEndpoint(), {
            method: 'POST',
            headers: {
                Authorization: buildAuthHeader(),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
        });
        if (!response.ok) {
            throw serviceUnavailable('sms_provider_failed', `SMS provider rejected the request with status ${response.status}.`);
        }
        const payload = (await response.json());
        return {
            providerReference: payload.sid,
        };
    },
    async verifyCode(input) {
        if (env.SMS_PROVIDER_MODE === 'preview') {
            return {
                approved: true,
                providerReference: input.providerReference,
                status: 'approved',
            };
        }
        if (env.SMS_PROVIDER_MODE === 'disabled') {
            throw serviceUnavailable('sms_provider_disabled', 'SMS delivery is disabled in this environment.');
        }
        if (!env.TWILIO_ACCOUNT_SID ||
            !env.TWILIO_AUTH_TOKEN ||
            !env.TWILIO_VERIFY_SERVICE_SID) {
            throw serviceUnavailable('sms_provider_misconfigured', 'SMS provider is missing required configuration.');
        }
        const body = new URLSearchParams({
            Code: input.code,
            To: input.recipientPhone,
        });
        const response = await fetch(buildVerifyCheckEndpoint(), {
            method: 'POST',
            headers: {
                Authorization: buildAuthHeader(),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
        });
        if (!response.ok) {
            throw serviceUnavailable('sms_provider_failed', `SMS provider rejected the request with status ${response.status}.`);
        }
        const payload = (await response.json());
        return {
            approved: payload.status === 'approved',
            providerReference: payload.sid || input.providerReference,
            status: payload.status,
        };
    },
};
