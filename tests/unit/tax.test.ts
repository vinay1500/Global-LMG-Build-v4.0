import { describe, expect, it } from 'vitest';
import {
  calculateInvoiceTaxWithSettings,
  type InvoiceTaxComputation,
  type InvoiceTaxSettingsForMath,
} from '../../admin_backend/src/modules/billing/taxMath.js';

const baseSettings = (
  overrides: Partial<InvoiceTaxSettingsForMath> = {}
): InvoiceTaxSettingsForMath => ({
  businessState: 'Maharashtra',
  defaultGstRateBps: 1800,
  fallbackTaxType: 'igst',
  gstEnabled: true,
  pricesIncludeTax: false,
  reverseChargeNote: 'Reverse charge applies where required.',
  taxMode: 'forward_charge',
  ...overrides,
});

const taxCodes = (tax: InvoiceTaxComputation) => tax.taxLines.map((line) => line.code);

describe('invoice tax math', () => {
  it('splits forward-charge GST into CGST and SGST for same-state clients', () => {
    const tax = calculateInvoiceTaxWithSettings(
      baseSettings(),
      { clientState: 'Maharashtra', lineAmount: '1000.00' },
      42
    );

    expect(tax.lineSubtotalDecimal).toBe('1000.00');
    expect(tax.taxDecimal).toBe('180.00');
    expect(tax.totalDecimal).toBe('1180.00');
    expect(taxCodes(tax)).toEqual(['CGST', 'SGST']);
    expect(tax.taxLines.map((line) => line.taxAmountDecimal)).toEqual(['90.00', '90.00']);
    expect(tax.taxLines.every((line) => line.taxRateId === 42)).toBe(true);
  });

  it('uses IGST for interstate clients', () => {
    const tax = calculateInvoiceTaxWithSettings(baseSettings(), {
      clientState: 'Karnataka',
      lineAmount: '1000.00',
    });

    expect(tax.taxDecimal).toBe('180.00');
    expect(tax.totalDecimal).toBe('1180.00');
    expect(taxCodes(tax)).toEqual(['IGST']);
  });

  it('backs tax out when prices include tax', () => {
    const tax = calculateInvoiceTaxWithSettings(
      baseSettings({ pricesIncludeTax: true }),
      { clientState: 'Karnataka', lineAmount: '1180.00' }
    );

    expect(tax.taxableDecimal).toBe('1000.00');
    expect(tax.taxDecimal).toBe('180.00');
    expect(tax.totalDecimal).toBe('1180.00');
    expect(tax.note).toBe('Prices include GST/tax per invoice settings.');
  });

  it('keeps reverse-charge invoices tax-neutral', () => {
    const tax = calculateInvoiceTaxWithSettings(
      baseSettings({ taxMode: 'reverse_charge' }),
      { clientState: 'Karnataka', lineAmount: '1000.00' }
    );

    expect(tax.taxDecimal).toBe('0.00');
    expect(tax.totalDecimal).toBe('1000.00');
    expect(tax.taxLines).toEqual([]);
    expect(tax.note).toContain('Reverse charge');
  });
});
