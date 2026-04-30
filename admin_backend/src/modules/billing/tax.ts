import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { executeStatement, queryRows, type QueryExecutor } from '../../lib/mysql.js';
import { getInvoiceSettings, type InvoiceSettings } from '../settings/invoiceSettings.js';

type TaxRateRow = RowDataPacket & {
  id: number;
};

export type InvoiceTaxComputation = {
  lineSubtotalDecimal: string;
  lineTotalDecimal: string;
  note: string | null;
  subtotalDecimal: string;
  taxableDecimal: string;
  taxDecimal: string;
  taxLines: Array<{
    code: string;
    name: string;
    percentDecimal: string;
    sortOrder: number;
    taxAmountDecimal: string;
    taxRateId: number | null;
    taxableAmountDecimal: string;
  }>;
  totalDecimal: string;
};

const MONEY_PATTERN = /^\d+(?:\.\d{1,2})?$/;

const toMinorUnits = (value: number | string) => {
  const normalized = String(value).trim();

  if (!MONEY_PATTERN.test(normalized)) {
    throw new Error('Money values must have no more than 2 decimals.');
  }

  const [wholePart, fractionPart = ''] = normalized.split('.');
  return Number(wholePart) * 100 + Number(fractionPart.padEnd(2, '0'));
};

const minorToDecimal = (minorUnits: number) => (minorUnits / 100).toFixed(2);
const bpsToPercentDecimal = (bps: number) => (bps / 100).toFixed(2);

const normalizeState = (value: string | null | undefined) =>
  value
    ? value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
    : '';

const divideRound = (numerator: number, denominator: number) => Math.round(numerator / denominator);

const getTaxRateId = async (rateBps: number, executor: QueryExecutor) => {
  const rows = await queryRows<TaxRateRow>(
    `SELECT id
     FROM tax_rates
     WHERE is_active = 1
       AND ROUND(rate_percent * 100) = ?
     ORDER BY effective_from DESC, id DESC
     LIMIT 1`,
    [rateBps],
    executor
  );

  return rows[0]?.id || null;
};

const resolveTaxType = (
  settings: InvoiceSettings,
  clientState: string | null | undefined
): 'cgst_sgst' | 'igst' | 'none' => {
  const businessState = normalizeState(settings.businessState);
  const normalizedClientState = normalizeState(clientState);
  const businessStateConfigured = Boolean(businessState && businessState !== 'notconfigured');

  if (businessStateConfigured && normalizedClientState) {
    return businessState === normalizedClientState ? 'cgst_sgst' : 'igst';
  }

  return settings.fallbackTaxType;
};

export const calculateInvoiceTax = async (
  input: {
    clientState?: string | null;
    lineAmount: number | string;
  },
  executor: QueryExecutor
): Promise<InvoiceTaxComputation> => {
  const settings = await getInvoiceSettings(executor);
  const lineAmountMinor = toMinorUnits(input.lineAmount);
  const rateBps = settings.gstEnabled && settings.taxMode === 'forward_charge' ? settings.defaultGstRateBps : 0;

  if (lineAmountMinor <= 0) {
    throw new Error('Line amount must be greater than zero.');
  }

  if (!settings.gstEnabled || settings.taxMode !== 'forward_charge' || rateBps === 0) {
    const note =
      settings.taxMode === 'reverse_charge'
        ? settings.reverseChargeNote || 'Tax payable under reverse charge where applicable.'
        : settings.taxMode === 'exempt'
          ? 'GST/tax is marked exempt for this invoice.'
          : 'GST/tax is disabled in invoice settings.';

    return {
      lineSubtotalDecimal: minorToDecimal(lineAmountMinor),
      lineTotalDecimal: minorToDecimal(lineAmountMinor),
      note,
      subtotalDecimal: minorToDecimal(lineAmountMinor),
      taxableDecimal: minorToDecimal(lineAmountMinor),
      taxDecimal: '0.00',
      taxLines: [],
      totalDecimal: minorToDecimal(lineAmountMinor),
    };
  }

  const taxableMinor = settings.pricesIncludeTax
    ? divideRound(lineAmountMinor * 10000, 10000 + rateBps)
    : lineAmountMinor;
  const taxMinor = settings.pricesIncludeTax
    ? lineAmountMinor - taxableMinor
    : divideRound(taxableMinor * rateBps, 10000);
  const totalMinor = settings.pricesIncludeTax ? lineAmountMinor : taxableMinor + taxMinor;
  const taxType = resolveTaxType(settings, input.clientState);
  const taxRateId = await getTaxRateId(rateBps, executor);

  if (taxType === 'none') {
    return {
      lineSubtotalDecimal: minorToDecimal(taxableMinor),
      lineTotalDecimal: minorToDecimal(taxableMinor),
      note: 'GST fallback is configured as none because tax jurisdiction could not be determined.',
      subtotalDecimal: minorToDecimal(taxableMinor),
      taxableDecimal: minorToDecimal(taxableMinor),
      taxDecimal: '0.00',
      taxLines: [],
      totalDecimal: minorToDecimal(taxableMinor),
    };
  }

  const taxLines =
    taxType === 'cgst_sgst'
      ? [
          {
            code: 'CGST',
            name: 'CGST',
            percentDecimal: bpsToPercentDecimal(rateBps / 2),
            sortOrder: 1,
            taxAmountDecimal: minorToDecimal(Math.floor(taxMinor / 2)),
            taxRateId,
            taxableAmountDecimal: minorToDecimal(taxableMinor),
          },
          {
            code: 'SGST',
            name: 'SGST',
            percentDecimal: bpsToPercentDecimal(rateBps / 2),
            sortOrder: 2,
            taxAmountDecimal: minorToDecimal(taxMinor - Math.floor(taxMinor / 2)),
            taxRateId,
            taxableAmountDecimal: minorToDecimal(taxableMinor),
          },
        ]
      : [
          {
            code: 'IGST',
            name: 'IGST',
            percentDecimal: bpsToPercentDecimal(rateBps),
            sortOrder: 1,
            taxAmountDecimal: minorToDecimal(taxMinor),
            taxRateId,
            taxableAmountDecimal: minorToDecimal(taxableMinor),
          },
        ];

  return {
    lineSubtotalDecimal: minorToDecimal(taxableMinor),
    lineTotalDecimal: minorToDecimal(totalMinor),
    note: settings.pricesIncludeTax ? 'Prices include GST/tax per invoice settings.' : null,
    subtotalDecimal: minorToDecimal(taxableMinor),
    taxableDecimal: minorToDecimal(taxableMinor),
    taxDecimal: minorToDecimal(taxMinor),
    taxLines,
    totalDecimal: minorToDecimal(totalMinor),
  };
};

export const insertInvoiceLineTaxes = async (
  invoiceLineId: number,
  tax: InvoiceTaxComputation,
  createdAt: string,
  executor: QueryExecutor
) => {
  for (const line of tax.taxLines) {
    await executeStatement<ResultSetHeader>(
      `INSERT INTO invoice_line_taxes (
         invoice_line_id,
         tax_rate_id,
         tax_code_snapshot,
         tax_name_snapshot,
         tax_percent_snapshot,
         taxable_amount,
         tax_amount,
         sort_order,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceLineId,
        line.taxRateId,
        line.code,
        line.name,
        line.percentDecimal,
        line.taxableAmountDecimal,
        line.taxAmountDecimal,
        line.sortOrder,
        createdAt,
      ],
      executor
    );
  }
};
