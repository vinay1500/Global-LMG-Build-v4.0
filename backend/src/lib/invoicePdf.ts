import PDFDocument from 'pdfkit';
import type { InvoiceDetail } from '../modules/domain/types.js';

const formatCurrency = (amount: number, currencyCode: string) =>
  new Intl.NumberFormat('en-IN', {
    currency: currencyCode || 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(amount);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const ensureSpace = (document: PDFKit.PDFDocument, y: number, requiredHeight: number) => {
  const bottomLimit = document.page.height - document.page.margins.bottom;

  if (y + requiredHeight <= bottomLimit) {
    return y;
  }

  document.addPage();
  return document.page.margins.top;
};

const drawLabelValue = (
  document: PDFKit.PDFDocument,
  y: number,
  label: string,
  value: string
) => {
  document
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#6b7280')
    .text(label, 50, y, { width: 150 });
  document
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#111827')
    .text(value, 210, y, { width: 320 });

  return document.y + 4;
};

export const renderInvoicePdf = async (invoice: InvoiceDetail) => {
  const document = new PDFDocument({
    margin: 50,
    size: 'A4',
  });
  const chunks: Buffer[] = [];

  const bufferPromise = new Promise<Buffer>((resolve, reject) => {
    document.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
  });

  let y = 50;

  document
    .font('Helvetica-Bold')
    .fontSize(24)
    .fillColor('#111827')
    .text('Global LMG Invoice', 50, y);

  y = document.y + 6;
  document
    .font('Helvetica')
    .fontSize(11)
    .fillColor('#4b5563')
    .text(`Invoice ${invoice.invoiceNumber}`, 50, y);
  document.text(`Status: ${invoice.statusCode}`, 50, document.y + 2);
  document.text(`Issued: ${formatDate(invoice.issueDate)}   Due: ${formatDate(invoice.dueDate)}`, 50, document.y + 2);

  y = document.y + 18;
  document
    .moveTo(50, y)
    .lineTo(545, y)
    .strokeColor('#e5e7eb')
    .stroke();

  y += 18;
  y = drawLabelValue(document, y, 'Invoice Number', invoice.invoiceNumber);
  y = drawLabelValue(document, y, 'Currency', invoice.currencyCode);
  y = drawLabelValue(document, y, 'Amount Paid', formatCurrency(invoice.amountPaid, invoice.currencyCode));
  y = drawLabelValue(document, y, 'Amount Due', formatCurrency(invoice.amountDue, invoice.currencyCode));

  if (invoice.billingSnapshot) {
    y += 14;
    y = ensureSpace(document, y, 90);
    document
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#111827')
      .text('Bill To', 50, y);
    y = document.y + 8;

    const billToLines = [
      invoice.billingSnapshot.billingName,
      invoice.billingSnapshot.billingEmail,
      invoice.billingSnapshot.billingPhone,
      invoice.billingSnapshot.addressLine1,
      invoice.billingSnapshot.addressLine2,
      `${invoice.billingSnapshot.city}, ${invoice.billingSnapshot.state} ${invoice.billingSnapshot.postalCode}`,
      invoice.billingSnapshot.countryCode,
      invoice.billingSnapshot.gstin ? `GSTIN: ${invoice.billingSnapshot.gstin}` : null,
    ].filter(Boolean) as string[];

    for (const line of billToLines) {
      document
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#374151')
        .text(line, 50, y);
      y = document.y + 2;
    }
  }

  y += 14;
  y = ensureSpace(document, y, 120);
  document
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#111827')
    .text('Invoice Items', 50, y);
  y = document.y + 10;

  document
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#6b7280')
    .text('Description', 50, y, { width: 250 })
    .text('Qty', 320, y, { width: 45, align: 'right' })
    .text('Rate', 380, y, { width: 75, align: 'right' })
    .text('Amount', 470, y, { width: 75, align: 'right' });
  y = document.y + 8;

  for (const line of invoice.lines) {
    y = ensureSpace(document, y, 42);
    document
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#111827')
      .text(line.description, 50, y, { width: 250 })
      .text(String(line.quantity), 320, y, { width: 45, align: 'right' })
      .text(formatCurrency(line.unitPrice, invoice.currencyCode), 380, y, { width: 75, align: 'right' })
      .text(formatCurrency(line.lineTotal, invoice.currencyCode), 470, y, { width: 75, align: 'right' });

    y = Math.max(document.y, y + 14);

    if (line.taxes.length > 0) {
      document
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6b7280')
        .text(
          line.taxes.map((tax) => `${tax.name} (${tax.percent.toFixed(2)}%)`).join(' · '),
          50,
          y + 2,
          { width: 320 }
        );
      y = document.y + 6;
    } else {
      y += 8;
    }
  }

  y += 8;
  y = ensureSpace(document, y, 90);
  document
    .moveTo(330, y)
    .lineTo(545, y)
    .strokeColor('#e5e7eb')
    .stroke();
  y += 10;
  y = drawLabelValue(document, y, 'Subtotal', formatCurrency(invoice.subtotalAmount, invoice.currencyCode));
  y = drawLabelValue(document, y, 'Discount', formatCurrency(invoice.discountAmount, invoice.currencyCode));
  y = drawLabelValue(document, y, 'Tax', formatCurrency(invoice.taxAmount, invoice.currencyCode));
  y = drawLabelValue(document, y, 'Total', formatCurrency(invoice.totalAmount, invoice.currencyCode));

  if (invoice.installments.length > 0) {
    y += 18;
    y = ensureSpace(document, y, 70);
    document
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#111827')
      .text('Installments', 50, y);
    y = document.y + 8;

    for (const installment of invoice.installments) {
      y = ensureSpace(document, y, 30);
      document
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#374151')
        .text(
          `Installment ${installment.installmentNo} · Due ${formatDate(installment.dueDate)} · ${installment.statusCode}`,
          50,
          y,
          { width: 360 }
        )
        .text(formatCurrency(installment.amountDue, invoice.currencyCode), 430, y, {
          align: 'right',
          width: 115,
        });
      y = document.y + 6;
    }
  }

  document.end();
  return bufferPromise;
};
