import { Router } from 'express';
import { z } from 'zod';
import { requireCsrf } from '../lib/csrf.js';
import { asyncHandler } from '../lib/httpErrors.js';
import { adminBillingService } from '../modules/billing/service.js';
import { requireAdminPermission, getRouteParam } from './shared.js';

export const billingRouter = Router();

const createRefundSchema = z.object({
  amount: z.number().positive(),
  invoiceId: z.string().trim().min(2).max(64).optional(),
  paymentId: z.string().trim().min(2).max(64),
  reasonText: z.string().trim().min(5).max(4000),
});

const sendInvoiceEmailSchema = z.object({
  messageText: z.string().trim().max(4000).optional(),
  recipientEmail: z.string().trim().email().max(320).optional(),
});

billingRouter.get(
  '/billing/overview',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'invoice.view', [
      'ops_admin',
      'billing_admin',
      'case_manager',
      'management_viewer',
    ]);
    response.json(await adminBillingService.getOverview());
  })
);

billingRouter.get(
  '/billing/invoices',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'invoice.view', [
      'ops_admin',
      'billing_admin',
      'case_manager',
      'management_viewer',
    ]);
    response.json(await adminBillingService.listInvoices());
  })
);

billingRouter.post(
  '/billing/invoices',
  asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'invoice.manage', [
      'ops_admin',
      'billing_admin',
      'case_manager',
    ]);
    response.status(201).json(
      await adminBillingService.createPackageInvoice(
        actor.userId,
        actor.roleCodes[0] || actor.actorTypeCode,
        request.body
      )
    );
  })
);

billingRouter.get(
  '/billing/invoices/:invoiceId',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'invoice.view', [
      'ops_admin',
      'billing_admin',
      'case_manager',
      'management_viewer',
    ]);
    response.json(await adminBillingService.getInvoice(getRouteParam(request.params.invoiceId)));
  })
);

billingRouter.get(
  '/billing/invoices/:invoiceId/pdf',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'invoice.view', [
      'ops_admin',
      'billing_admin',
      'case_manager',
      'management_viewer',
    ]);
    const result = await adminBillingService.getInvoicePdf(getRouteParam(request.params.invoiceId));
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    response.setHeader('Content-Type', 'application/pdf');
    response.send(result.buffer);
  })
);

billingRouter.post(
  '/billing/invoices/:invoiceId/send-email',
  asyncHandler(async (request, response) => {
    await requireCsrf(request);
    await requireAdminPermission(request, response, 'invoice.manage', [
      'ops_admin',
      'billing_admin',
      'case_manager',
    ]);
    const payload = sendInvoiceEmailSchema.parse(request.body ?? {});
    response.status(200).json(
      await adminBillingService.sendInvoiceEmail(getRouteParam(request.params.invoiceId), payload)
    );
  })
);

billingRouter.get(
  '/billing/payments',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'payment.view', [
      'ops_admin',
      'billing_admin',
      'case_manager',
      'management_viewer',
    ]);
    response.json(await adminBillingService.listPayments());
  })
);

billingRouter.post(
  '/billing/payments',
  asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'payment.manage', [
      'ops_admin',
      'billing_admin',
    ]);
    response.status(201).json(
      await adminBillingService.recordManualPayment(
        actor.userId,
        actor.roleCodes[0] || actor.actorTypeCode,
        request.body
      )
    );
  })
);

billingRouter.get(
  '/billing/refunds',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'refund.view', [
      'ops_admin',
      'billing_admin',
      'case_manager',
      'management_viewer',
    ]);
    response.json(await adminBillingService.listRefunds());
  })
);

billingRouter.post(
  '/billing/refunds',
  asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'refund.manage', [
      'ops_admin',
      'billing_admin',
    ]);
    const payload = createRefundSchema.parse(request.body);
    response
      .status(201)
      .json(
        await adminBillingService.createRefund(
          actor.publicId,
          actor.roleCodes[0] || actor.actorTypeCode,
          payload
        )
      );
  })
);
