import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/httpErrors.js';
import { getWorkspace } from '../modules/settings/service.js';
import { getInvoiceSettings, updateInvoiceSettings } from '../modules/settings/invoiceSettings.js';
import { requireMutationPermission, requireReadActor, requirePermission } from './shared.js';

export const settingsRouter = Router();

const invoiceSettingsSchema = z.object({
  billingDisplayName: z.string().trim().min(2).max(200).optional(),
  businessLegalName: z.string().trim().min(2).max(200).optional(),
  businessState: z.string().trim().min(2).max(100).optional(),
  defaultGstRatePercent: z.number().min(0).max(100).optional(),
  defaultSacCode: z.string().trim().max(32).nullable().optional(),
  fallbackTaxType: z.enum(['igst', 'cgst_sgst', 'none']).optional(),
  gstEnabled: z.boolean().optional(),
  gstin: z.string().trim().max(24).nullable().optional(),
  invoiceFooter: z.string().trim().max(4000).nullable().optional(),
  invoicePrefix: z.string().trim().min(1).max(24).optional(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(),
  pricesIncludeTax: z.boolean().optional(),
  reverseChargeNote: z.string().trim().max(2000).nullable().optional(),
  taxMode: z.enum(['forward_charge', 'reverse_charge', 'exempt']).optional(),
});

settingsRouter.get(
  '/settings/workspace',
  asyncHandler(async (request, response) => {
    const actor = requirePermission(await requireReadActor(request), 'dashboard.view');
    response.json(await getWorkspace(actor));
  })
);

settingsRouter.get(
  '/settings/invoice',
  asyncHandler(async (request, response) => {
    requirePermission(await requireReadActor(request), 'invoice.view');
    response.json(await getInvoiceSettings());
  })
);

settingsRouter.patch(
  '/settings/invoice',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'invoice.manage');
    response.json(await updateInvoiceSettings(actor, invoiceSettingsSchema.parse(request.body)));
  })
);
