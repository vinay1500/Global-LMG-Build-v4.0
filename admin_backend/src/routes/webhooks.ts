import express, { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import {
  handleResendWebhook,
  handleTwilioStatusWebhook,
} from '../modules/webhooks/providerWebhooks.js';

export const webhookRouter = Router();

webhookRouter.post(
  '/resend',
  express.raw({ limit: '1mb', type: 'application/json' }),
  asyncHandler(async (request, response) => {
    const payload = Buffer.isBuffer(request.body)
      ? request.body
      : Buffer.from(JSON.stringify(request.body ?? {}));

    const result = await handleResendWebhook({
      headers: {
        id: request.header('svix-id') || undefined,
        signature: request.header('svix-signature') || undefined,
        timestamp: request.header('svix-timestamp') || undefined,
      },
      payload,
    });

    response.status(202).json(result);
  })
);

webhookRouter.post(
  '/twilio/status',
  express.urlencoded({ extended: false, limit: '256kb', type: 'application/x-www-form-urlencoded' }),
  asyncHandler(async (request, response) => {
    const result = await handleTwilioStatusWebhook(request);
    response.status(202).json(result);
  })
);
