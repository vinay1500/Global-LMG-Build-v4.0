import type { RowDataPacket } from 'mysql2/promise';
import { badRequest } from '../../lib/httpErrors.js';
import { executeStatement, queryRows, type QueryExecutor } from '../../lib/mysql.js';
import type { AdminActor } from '../auth/service.js';
import { createAuditEvent } from '../writeSupport.js';

export type InvoiceTaxMode = 'exempt' | 'forward_charge' | 'reverse_charge';
export type InvoiceFallbackTaxType = 'cgst_sgst' | 'igst' | 'none';

export type InvoiceSettings = {
  billingDisplayName: string;
  businessLegalName: string;
  businessState: string;
  defaultGstRateBps: number;
  defaultGstRatePercent: number;
  defaultSacCode: string | null;
  fallbackTaxType: InvoiceFallbackTaxType;
  gstEnabled: boolean;
  gstin: string | null;
  invoiceFooter: string | null;
  invoicePrefix: string;
  paymentTermsDays: number;
  pricesIncludeTax: boolean;
  reverseChargeNote: string | null;
  taxMode: InvoiceTaxMode;
};

export type UpdateInvoiceSettingsPayload = Partial<{
  billingDisplayName: string;
  businessLegalName: string;
  businessState: string;
  defaultGstRatePercent: number;
  defaultSacCode: string | null;
  fallbackTaxType: InvoiceFallbackTaxType;
  gstEnabled: boolean;
  gstin: string | null;
  invoiceFooter: string | null;
  invoicePrefix: string;
  paymentTermsDays: number;
  pricesIncludeTax: boolean;
  reverseChargeNote: string | null;
  taxMode: InvoiceTaxMode;
}>;

type InvoiceSettingsRow = RowDataPacket & {
  billingDisplayName: string;
  businessLegalName: string;
  businessState: string;
  defaultGstRateBps: number;
  defaultSacCode: string | null;
  fallbackTaxType: InvoiceFallbackTaxType;
  gstEnabled: number;
  gstin: string | null;
  invoiceFooter: string | null;
  invoicePrefix: string;
  paymentTermsDays: number;
  pricesIncludeTax: number;
  reverseChargeNote: string | null;
  taxMode: InvoiceTaxMode;
};

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const trimNullable = (value: string | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const mapRow = (row: InvoiceSettingsRow): InvoiceSettings => ({
  billingDisplayName: row.billingDisplayName,
  businessLegalName: row.businessLegalName,
  businessState: row.businessState,
  defaultGstRateBps: Number(row.defaultGstRateBps || 0),
  defaultGstRatePercent: Number(row.defaultGstRateBps || 0) / 100,
  defaultSacCode: row.defaultSacCode,
  fallbackTaxType: row.fallbackTaxType,
  gstEnabled: Boolean(row.gstEnabled),
  gstin: row.gstin,
  invoiceFooter: row.invoiceFooter,
  invoicePrefix: row.invoicePrefix,
  paymentTermsDays: Number(row.paymentTermsDays || 0),
  pricesIncludeTax: Boolean(row.pricesIncludeTax),
  reverseChargeNote: row.reverseChargeNote,
  taxMode: row.taxMode,
});

export const getInvoiceSettings = async (executor?: QueryExecutor): Promise<InvoiceSettings> => {
  const rows = await queryRows<InvoiceSettingsRow>(
    `SELECT
       business_legal_name AS businessLegalName,
       billing_display_name AS billingDisplayName,
       gstin,
       business_state AS businessState,
       invoice_prefix AS invoicePrefix,
       default_sac_code AS defaultSacCode,
       gst_enabled AS gstEnabled,
       default_gst_rate_bps AS defaultGstRateBps,
       tax_mode_code AS taxMode,
       prices_include_tax AS pricesIncludeTax,
       fallback_tax_type_code AS fallbackTaxType,
       payment_terms_days AS paymentTermsDays,
       invoice_footer AS invoiceFooter,
       reverse_charge_note AS reverseChargeNote
     FROM invoice_settings
     WHERE id = 1
     LIMIT 1`,
    [],
    executor
  );

  if (rows[0]) {
    return mapRow(rows[0]);
  }

  await executeStatement(
    `INSERT INTO invoice_settings (
       id,
       business_legal_name,
       billing_display_name,
       gstin,
       business_state,
       invoice_prefix,
       default_sac_code,
       gst_enabled,
       default_gst_rate_bps,
       tax_mode_code,
       prices_include_tax,
       fallback_tax_type_code,
       payment_terms_days,
       invoice_footer,
       reverse_charge_note,
       created_at,
       updated_at
     ) VALUES (
       1,
       'Global LMG',
       'Global LMG',
       NULL,
       'Not configured',
       'INV',
       NULL,
       1,
       1800,
       'forward_charge',
       0,
       'igst',
       7,
       'Global LMG provides intermediary legal consultancy, coordination, and support services. This invoice is not for legal representation by Global LMG.',
       'Tax payable under reverse charge where applicable.',
       UTC_TIMESTAMP(6),
       UTC_TIMESTAMP(6)
     )`,
    [],
    executor
  );

  return getInvoiceSettings(executor);
};

export const updateInvoiceSettings = async (
  actor: AdminActor,
  payload: UpdateInvoiceSettingsPayload
) => {
  const existing = await getInvoiceSettings();
  const next: InvoiceSettings = {
    ...existing,
    billingDisplayName: payload.billingDisplayName?.trim() || existing.billingDisplayName,
    businessLegalName: payload.businessLegalName?.trim() || existing.businessLegalName,
    businessState: payload.businessState?.trim() || existing.businessState,
    defaultGstRateBps:
      payload.defaultGstRatePercent === undefined
        ? existing.defaultGstRateBps
        : Math.round(payload.defaultGstRatePercent * 100),
    defaultGstRatePercent:
      payload.defaultGstRatePercent === undefined
        ? existing.defaultGstRatePercent
        : payload.defaultGstRatePercent,
    defaultSacCode:
      payload.defaultSacCode === undefined ? existing.defaultSacCode : trimNullable(payload.defaultSacCode),
    fallbackTaxType: payload.fallbackTaxType || existing.fallbackTaxType,
    gstEnabled: payload.gstEnabled ?? existing.gstEnabled,
    gstin: payload.gstin === undefined ? existing.gstin : trimNullable(payload.gstin?.toUpperCase() || null),
    invoiceFooter:
      payload.invoiceFooter === undefined ? existing.invoiceFooter : trimNullable(payload.invoiceFooter),
    invoicePrefix: payload.invoicePrefix?.trim() || existing.invoicePrefix,
    paymentTermsDays: payload.paymentTermsDays ?? existing.paymentTermsDays,
    pricesIncludeTax: payload.pricesIncludeTax ?? existing.pricesIncludeTax,
    reverseChargeNote:
      payload.reverseChargeNote === undefined
        ? existing.reverseChargeNote
        : trimNullable(payload.reverseChargeNote),
    taxMode: payload.taxMode || existing.taxMode,
  };

  if (next.gstin && !GSTIN_PATTERN.test(next.gstin)) {
    throw badRequest('invalid_gstin', 'GSTIN format is invalid.');
  }

  if (next.defaultGstRateBps < 0 || next.defaultGstRateBps > 10000) {
    throw badRequest('invalid_gst_rate', 'GST rate must be between 0 and 100 percent.');
  }

  if (next.paymentTermsDays < 0 || next.paymentTermsDays > 365) {
    throw badRequest('invalid_payment_terms', 'Payment terms must be between 0 and 365 days.');
  }

  await executeStatement(
    `UPDATE invoice_settings
     SET business_legal_name = ?,
         billing_display_name = ?,
         gstin = ?,
         business_state = ?,
         invoice_prefix = ?,
         default_sac_code = ?,
         gst_enabled = ?,
         default_gst_rate_bps = ?,
         tax_mode_code = ?,
         prices_include_tax = ?,
         fallback_tax_type_code = ?,
         payment_terms_days = ?,
         invoice_footer = ?,
         reverse_charge_note = ?,
         updated_at = UTC_TIMESTAMP(6),
         row_version = row_version + 1
     WHERE id = 1`,
    [
      next.businessLegalName,
      next.billingDisplayName,
      next.gstin,
      next.businessState,
      next.invoicePrefix,
      next.defaultSacCode,
      next.gstEnabled ? 1 : 0,
      next.defaultGstRateBps,
      next.taxMode,
      next.pricesIncludeTax ? 1 : 0,
      next.fallbackTaxType,
      next.paymentTermsDays,
      next.invoiceFooter,
      next.reverseChargeNote,
    ]
  );

  await createAuditEvent({
    actionCode: 'invoice_settings.updated',
    actionLabel: 'Invoice settings updated',
    actorRoleCode: actor.roleCodes[0] || 'billing_admin',
    actorUserId: actor.userId,
    changes: [
      { fieldName: 'business_legal_name', oldValue: existing.businessLegalName, newValue: next.businessLegalName },
      { fieldName: 'gstin', oldValue: existing.gstin, newValue: next.gstin },
      { fieldName: 'business_state', oldValue: existing.businessState, newValue: next.businessState },
      { fieldName: 'default_gst_rate_bps', oldValue: existing.defaultGstRateBps, newValue: next.defaultGstRateBps },
      { fieldName: 'tax_mode_code', oldValue: existing.taxMode, newValue: next.taxMode },
      { fieldName: 'prices_include_tax', oldValue: existing.pricesIncludeTax, newValue: next.pricesIncludeTax },
      { fieldName: 'fallback_tax_type_code', oldValue: existing.fallbackTaxType, newValue: next.fallbackTaxType },
      { fieldName: 'payment_terms_days', oldValue: existing.paymentTermsDays, newValue: next.paymentTermsDays },
    ],
    entityPk: 1,
    entityTableName: 'invoice_settings',
    sourceModule: 'settings_workspace',
  });

  return getInvoiceSettings();
};
