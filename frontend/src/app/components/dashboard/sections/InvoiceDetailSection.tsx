import React from 'react';
import { ArrowLeft, Download, FileText, ReceiptIndianRupee } from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { formatCurrency, formatDate } from '../../../utils/dashboardFormatting';
import type { InvoiceDetailResponse } from '../../../lib/api/contracts';

interface InvoiceDetailSectionProps {
  errorMessage: string | null;
  invoice: InvoiceDetailResponse | null;
  isLoading: boolean;
  onBack: () => void;
  onDownloadInvoice: (invoiceId: string) => void;
  onOpenMatter: (matterId: string | null) => void;
}

export const InvoiceDetailSection = ({
  errorMessage,
  invoice,
  isLoading,
  onBack,
  onDownloadInvoice,
  onOpenMatter,
}: InvoiceDetailSectionProps) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Billing & Invoices
        </button>
        <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            Loading invoice
          </h1>
          <p className="mt-3 text-sm text-gray-500">
            We are fetching the invoice detail from the portal API.
          </p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Billing & Invoices
        </button>
        <div className="rounded-xl border border-red-100 bg-white p-8 shadow-sm">
          <h1 className="text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            Invoice unavailable
          </h1>
          <p className="mt-3 text-sm text-gray-500">
            {errorMessage || 'We could not load that invoice right now.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Billing & Invoices
      </button>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>
                {invoice.invoiceNumber}
              </h1>
              <StatusBadge status={invoice.statusCode} size="md" />
            </div>
            <p className="text-sm text-gray-500">
              Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {invoice.matterId && (
              <button
                type="button"
                onClick={() => onOpenMatter(invoice.matterId)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50"
              >
                View Matter
              </button>
            )}
            <button
              type="button"
              onClick={() => onDownloadInvoice(invoice.id)}
              className="flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white hover:bg-gray-800"
            >
              <Download className="h-3.5 w-3.5" /> Download PDF
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Subtotal',
              value: formatCurrency(invoice.subtotalAmount),
              tone: 'text-gray-900',
            },
            {
              label: 'Tax',
              value: formatCurrency(invoice.taxAmount),
              tone: 'text-sky-700',
            },
            {
              label: 'Paid',
              value: formatCurrency(invoice.amountPaid),
              tone: 'text-emerald-600',
            },
            {
              label: 'Due',
              value: formatCurrency(invoice.amountDue),
              tone: invoice.amountDue > 0 ? 'text-amber-600' : 'text-emerald-600',
            },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="mb-1 text-xs text-gray-500">{card.label}</p>
              <p className={`text-2xl ${card.tone}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <ReceiptIndianRupee className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm text-gray-500">Invoice Items</h2>
              </div>
              <div className="overflow-hidden rounded-xl border border-gray-100">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      {['Description', 'Qty', 'Rate', 'Amount'].map((header) => (
                        <th key={header} className="px-4 py-3 text-left text-xs text-gray-500">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {invoice.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-3 align-top">
                          <p className="text-sm text-gray-900">{line.description}</p>
                          {line.taxes.length > 0 && (
                            <p className="mt-1 text-xs text-gray-400">
                              {line.taxes
                                .map((tax) => `${tax.name} (${tax.percent.toFixed(2)}%)`)
                                .join(' · ')}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{line.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatCurrency(line.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatCurrency(line.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {invoice.installments.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm text-gray-500">Installments</h2>
                <div className="space-y-2">
                  {invoice.installments.map((installment) => (
                    <div
                      key={installment.id}
                      className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm">
                          Installment {installment.installmentNo} · {formatDate(installment.dueDate)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Paid {formatCurrency(installment.amountPaid)} · Remaining{' '}
                          {formatCurrency(installment.amountRemaining)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={installment.statusCode} />
                        <span className="text-sm text-gray-900">
                          {formatCurrency(installment.amountDue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <h2 className="mb-3 text-xs uppercase tracking-wider text-gray-400">Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Discount</span>
                  <span>{formatCurrency(invoice.discountAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.totalAmount)}</span>
                </div>
              </div>
            </div>

            {invoice.billingSnapshot && (
              <div className="rounded-xl bg-gray-50 p-4">
                <h2 className="mb-3 text-xs uppercase tracking-wider text-gray-400">Bill To</h2>
                <div className="space-y-1 text-sm text-gray-600">
                  <p className="text-gray-900">{invoice.billingSnapshot.billingName}</p>
                  <p>{invoice.billingSnapshot.billingEmail}</p>
                  <p>{invoice.billingSnapshot.billingPhone}</p>
                  <p>{invoice.billingSnapshot.addressLine1}</p>
                  {invoice.billingSnapshot.addressLine2 && <p>{invoice.billingSnapshot.addressLine2}</p>}
                  <p>
                    {invoice.billingSnapshot.city}, {invoice.billingSnapshot.state}{' '}
                    {invoice.billingSnapshot.postalCode}
                  </p>
                  <p>{invoice.billingSnapshot.countryCode}</p>
                  {invoice.billingSnapshot.gstin && <p>GSTIN: {invoice.billingSnapshot.gstin}</p>}
                </div>
              </div>
            )}

            {invoice.documents.length > 0 && (
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <h2 className="text-xs uppercase tracking-wider text-gray-400">Related Records</h2>
                </div>
                <div className="space-y-2">
                  {invoice.documents.map((document) => (
                    <div key={document.id} className="rounded-lg bg-white px-3 py-2 text-sm text-gray-700">
                      {document.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
