import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/httpErrors.js';
import { createInvoice, createRefund, getWorkspace, sendInvoice } from '../modules/billing/service.js';
import { requireMutationPermission, requireReadPermission } from './shared.js';

export const billingRouter = Router();

const createInvoiceSchema = z.object({
  amount: z.number().positive(),
  description: z.string().trim().min(3).max(255),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  matterId: z.string().trim().min(2).max(64),
});

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
  '/billing/invoices',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'invoice.manage');
    response.status(201).json(await createInvoice(actor, createInvoiceSchema.parse(request.body)));
  })
);

billingRouter.post(
  '/billing/invoices/:invoiceId/send',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'invoice.manage');
    response.json(await sendInvoice(actor, z.string().trim().min(2).max(64).parse(request.params.invoiceId)));
  })
);

billingRouter.post(
  '/billing/refunds',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'refund.manage');
    response.status(201).json(await createRefund(actor, createRefundSchema.parse(request.body)));
  })
);
