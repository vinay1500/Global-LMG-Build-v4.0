import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { renderInvoicePdfFromTemplate } from '../../backend/src/lib/invoicePdf.js';
import type { InvoiceDetail } from '../../backend/src/modules/domain/types.js';

const invoice = {
  amountDue: 1180,
  amountPaid: 0,
  amountRefunded: 0,
  billingSnapshot: {
    addressLine1: 'Disposable billing address',
    addressLine2: null,
    billingEmail: 'client@example.test',
    billingName: 'Disposable Client',
    billingPhone: '+910000000000',
    city: 'Mumbai',
    countryCode: 'IN',
    gstin: null,
    postalCode: '400001',
    state: 'Maharashtra',
  },
  business: {
    address: 'Global LMG office',
    email: 'billing@example.test',
    gstin: '27ABCDE1234F1Z5',
    name: 'Global LMG',
    paymentInstructions: 'Pay via the configured account only.',
    phone: '+910000000001',
    state: 'Maharashtra',
    website: 'https://example.test',
  },
  clientAccountId: 'client-public-id',
  currencyCode: 'USD',
  discountAmount: 0,
  documents: [],
  dueDate: '2026-05-31',
  id: 'invoice-public-id',
  installments: [],
  invoiceNumber: 'INV-TEST-001',
  issueDate: '2026-05-07',
  lines: [
    {
      description: 'Coordination support service',
      discountAmount: 0,
      id: 1,
      lineSubtotal: 1000,
      lineTotal: 1180,
      quantity: 1,
      serviceId: null,
      sortOrder: 1,
      subscriptionPlanId: null,
      taxableAmount: 1000,
      taxes: [{ amount: 180, code: 'IGST', id: 1, name: 'IGST', percent: 18 }],
      typeCode: 'service',
      unitPrice: 1000,
    },
  ],
  matterId: 'matter-public-id',
  statusCode: 'sent',
  subtotalAmount: 1000,
  taxAmount: 180,
  template: {
    body: 'This is fallback invoice copy.',
    footer: 'Thank you for working with Global LMG.',
    id: null,
    subject: 'Invoice for coordination services',
    terms: 'Payment due by the due date.',
    version: null,
  },
  totalAmount: 1180,
  typeCode: 'manual',
} satisfies InvoiceDetail;

describe('invoice PDF rendering fallback', () => {
  it('creates a valid PDF when no uploaded letterhead template exists', async () => {
    const pdf = await renderInvoicePdfFromTemplate(invoice, null);

    expect(pdf.subarray(0, 4).toString('utf8')).toBe('%PDF');
    const parsed = await PDFDocument.load(pdf);
    expect(parsed.getPageCount()).toBe(1);
  });
});
