import { Router } from 'express';
import { asyncHandler, badRequest } from '../lib/httpErrors.js';
import { handleRazorpayWebhook } from '../modules/payments/razorpayService.js';

export const webhooksRouter = Router();

webhooksRouter.post(
  '/webhooks/razorpay',
  asyncHandler(async (request, response) => {
    const rawBody = request.rawBody;

    if (!rawBody || rawBody.length === 0) {
      throw badRequest('missing_webhook_body', 'Webhook body is required.');
    }

    const result = await handleRazorpayWebhook({
      eventId: request.header('x-razorpay-event-id'),
      rawBody,
      signature: request.header('x-razorpay-signature'),
    });

    response.json(result);
  })
);
