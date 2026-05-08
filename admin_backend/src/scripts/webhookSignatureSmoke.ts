import { createHmac } from 'node:crypto';
import {
  buildTwilioSignature,
  verifyResendWebhookSignature,
  verifyTwilioWebhookSignature,
} from '../modules/webhooks/providerWebhooks.js';

const expect = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const resendPayload = Buffer.from(
  JSON.stringify({
    data: { email_id: 'email_test_123', to: ['client@example.test'] },
    id: 'event_test_123',
    type: 'email.delivered',
  })
);
const resendSecret = `whsec_${Buffer.from('resend-test-secret').toString('base64')}`;
const resendId = 'msg_test';
const resendTimestamp = String(Math.floor(Date.now() / 1000));
const resendSignedPayload = Buffer.concat([
  Buffer.from(`${resendId}.${resendTimestamp}.`, 'utf8'),
  resendPayload,
]);
const resendSignature = `v1,${createHmac('sha256', Buffer.from('resend-test-secret'))
  .update(resendSignedPayload)
  .digest('base64')}`;

expect(
  verifyResendWebhookSignature({
    id: resendId,
    payload: resendPayload,
    secret: resendSecret,
    signature: resendSignature,
    timestamp: resendTimestamp,
  }),
  'Valid Resend signature should verify.'
);

let invalidResendRejected = false;
try {
  verifyResendWebhookSignature({
    id: resendId,
    payload: resendPayload,
    secret: resendSecret,
    signature: 'v1,invalid',
    timestamp: resendTimestamp,
  });
} catch {
  invalidResendRejected = true;
}
expect(invalidResendRejected, 'Invalid Resend signature should be rejected.');

const twilioUrl = 'https://api.globallmg.test/api/v1/webhooks/twilio/status';
const twilioParams = {
  From: '+15551112222',
  MessageSid: 'SM_test_123',
  MessageStatus: 'delivered',
  To: '+15553334444',
};
const twilioAuthToken = 'twilio-test-token';
const twilioSignature = buildTwilioSignature(twilioUrl, twilioParams, twilioAuthToken);

expect(
  verifyTwilioWebhookSignature({
    authToken: twilioAuthToken,
    params: twilioParams,
    signature: twilioSignature,
    url: twilioUrl,
  }),
  'Valid Twilio signature should verify.'
);

let invalidTwilioRejected = false;
try {
  verifyTwilioWebhookSignature({
    authToken: twilioAuthToken,
    params: twilioParams,
    signature: 'invalid',
    url: twilioUrl,
  });
} catch {
  invalidTwilioRejected = true;
}
expect(invalidTwilioRejected, 'Invalid Twilio signature should be rejected.');

console.log('Provider webhook signature smoke passed.');
