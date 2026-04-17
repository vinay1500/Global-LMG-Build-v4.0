import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/httpErrors.js';
import { createRefund, getWorkspace } from '../modules/billing/service.js';
import { requireMutationPermission, requireReadPermission } from './shared.js';

export const billingRouter = Router();

const createRefundSchema = z.object({
  amount: z.number().positive(),
  invoiceId: z.string().trim().min(2).max(64).optional(),
  paymentId: z.string().trim().min(2).max(64),
  reasonText: z.string().trim().min(5).max(4000),
});

billingRouter.get(
  '/billing/workspace',
  asyncHandler(async (request, response) => {
    await requireReadPermission(request, 'invoice.view');
    response.json(await getWorkspace());
  })
);

billingRouter.post(
  '/billing/refunds',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'refund.manage');
    response.status(201).json(await createRefund(actor, createRefundSchema.parse(request.body)));
  })
);
