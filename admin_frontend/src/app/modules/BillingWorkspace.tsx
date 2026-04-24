import React, { useEffect, useMemo, useState } from 'react';
import { 
  CreditCard, FileText, Download, Mail, DollarSign, 
  Search, Filter, Plus, ChevronRight, CheckCircle, 
  Clock, AlertCircle, RefreshCcw, MoreVertical, 
  ArrowUpRight, FileCheck, Landmark, Copy, Printer
} from 'lucide-react';
import { INVOICES, MATTERS, PAYMENTS, formatCurrency, formatDate, Invoice, Matter, Payment } from '../data/seedData';
import { StatusBadge } from '../components/dashboard/StatusBadge';
import type { RefundRecord } from '../lib/api/contracts';

type FilterStatus = 'all' | 'paid' | 'pending' | 'overdue' | 'draft';

export const BillingWorkspace: React.FC<{
  invoices?: Invoice[];
  matters?: Matter[];
  onCreateInvoice?: (payload: {
    amount: number;
    description: string;
    dueDate?: string;
    matterId: string;
  }) => Promise<{ invoiceId: string; status: 'created' }>;
  onCreateRefund?: (payload: {
    amount: number;
    invoiceId?: string;
    paymentId: string;
    reasonText: string;
  }) => Promise<void>;
  onSendInvoice?: (
    invoiceId: string
  ) => Promise<{ invoiceId: string; status: 'reminder_sent' | 'sent' }>;
  payments?: Payment[];
  refunds?: RefundRecord[];
}> = ({
  invoices = INVOICES,
  matters = MATTERS,
  onCreateInvoice,
  onCreateRefund,
  onSendInvoice,
  payments = PAYMENTS,
  refunds = [],
}) => {
  const [showCreateInvoiceForm, setShowCreateInvoiceForm] = useState(false);
  const [createMatterId, setCreateMatterId] = useState(matters[0]?.id || '');
  const [createDescription, setCreateDescription] = useState('');
  const [createAmount, setCreateAmount] = useState('');
  const [createDueDate, setCreateDueDate] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(invoices[0]?.id || null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  useEffect(() => {
    if (!invoices.some((invoice) => invoice.id === selectedInvoiceId)) {
      setSelectedInvoiceId(invoices[0]?.id || null);
    }
  }, [invoices, selectedInvoiceId]);

  useEffect(() => {
    setShowRefundForm(false);
    setRefundAmount('');
    setRefundReason('');
  }, [selectedInvoiceId]);

  useEffect(() => {
    if (!matters.some((matter) => matter.id === createMatterId)) {
      setCreateMatterId(matters[0]?.id || '');
    }
  }, [createMatterId, matters]);

  const activeInvoice = useMemo(
    () => invoices.find(i => i.id === selectedInvoiceId) || null,
    [invoices, selectedInvoiceId]
  );

  const canSendInvoice = useMemo(
    () => Boolean(activeInvoice && !['paid', 'refunded', 'void'].includes(activeInvoice.status)),
    [activeInvoice]
  );

  const sendInvoiceLabel = activeInvoice?.status === 'draft' ? 'Send Invoice' : 'Send Reminder';
  
  const activePayments = useMemo(() => {
    if (!activeInvoice) return [];
    return payments.filter(p => p.invoiceId === activeInvoice.id).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [activeInvoice, payments]);

  const activeRefunds = useMemo(() => {
    if (!activeInvoice) return [];
    return refunds
      .filter((refund) => refund.invoiceId === activeInvoice.id)
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }, [activeInvoice, refunds]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = 
        inv.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.matterTitle.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter || (statusFilter === 'pending' && inv.status === 'sent');
      
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [invoices, searchQuery, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const totalCollected = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0);
    const outstanding = invoices.filter(i => i.status === 'pending' || i.status === 'sent').reduce((sum, i) => sum + i.totalAmount, 0);
    const overdueAmount = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.totalAmount, 0);
    const draftAmount = invoices.filter(i => i.status === 'draft').reduce((sum, i) => sum + i.totalAmount, 0);
    
    return { totalCollected, outstanding, overdueAmount, draftAmount };
  }, [invoices]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case 'pending': 
      case 'sent': return 'text-blue-700 bg-blue-50 border-blue-100';
      case 'overdue': return 'text-red-700 bg-red-50 border-red-100';
      case 'draft': return 'text-gray-700 bg-gray-50 border-gray-200';
      case 'refunded': return 'text-amber-700 bg-amber-50 border-amber-100';
      case 'void': return 'text-slate-700 bg-slate-50 border-slate-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-100';
    }
  };

  const resetCreateInvoiceForm = () => {
    setCreateDescription('');
    setCreateAmount('');
    setCreateDueDate('');
    setCreateError(null);
  };

  const handleCreateInvoice = async () => {
    if (!onCreateInvoice) {
      return;
    }

    setCreateError(null);
    setActionMessage(null);
    setActionError(null);
    setIsCreatingInvoice(true);

    try {
      const result = await onCreateInvoice({
        amount: Number(createAmount),
        description: createDescription.trim(),
        dueDate: createDueDate || undefined,
        matterId: createMatterId,
      });

      setSelectedInvoiceId(result.invoiceId);
      setShowCreateInvoiceForm(false);
      resetCreateInvoiceForm();
      setActionMessage('Draft invoice created from live admin billing data.');
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Unable to create the invoice.');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!activeInvoice || !onSendInvoice || !canSendInvoice) {
      return;
    }

    setActionMessage(null);
    setActionError(null);
    setIsSendingInvoice(true);

    try {
      const result = await onSendInvoice(activeInvoice.id);
      setActionMessage(
        result.status === 'sent'
          ? 'Invoice sent to the client.'
          : 'Payment reminder sent to the client.'
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to send this invoice right now.');
    } finally {
      setIsSendingInvoice(false);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col -m-6 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-medium text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Billing & Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">Finance operations, invoice tracking, and revenue management.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-dashed border-gray-200 text-gray-400 text-sm font-medium rounded-lg flex items-center gap-2 cursor-not-allowed">
            <Download className="w-4 h-4" /> Export Later
          </button>
          <button
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition hover:bg-gray-800 disabled:opacity-50"
            disabled={!onCreateInvoice || matters.length === 0}
            onClick={() => {
              setActionMessage(null);
              setActionError(null);
              setCreateError(null);
              setShowCreateInvoiceForm((current) => !current);
            }}
            type="button"
          >
            <Plus className="w-4 h-4" /> Create Invoice
          </button>
        </div>
      </div>

      {showCreateInvoiceForm ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Create Draft Invoice</h2>
              <p className="text-sm text-gray-500 mt-1">
                Build a live invoice against a matter, then send it once the line item looks right.
              </p>
            </div>
            <button
              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              onClick={() => {
                setShowCreateInvoiceForm(false);
                resetCreateInvoiceForm();
              }}
              type="button"
            >
              Close
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Matter</span>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white"
                onChange={(event) => setCreateMatterId(event.target.value)}
                value={createMatterId}
              >
                {matters.map((matter) => (
                  <option key={matter.id} value={matter.id}>
                    {matter.referenceCode} · {matter.clientName} · {matter.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Amount</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white"
                onChange={(event) => setCreateAmount(event.target.value)}
                placeholder="25000"
                type="number"
                value={createAmount}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Due Date</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white"
                onChange={(event) => setCreateDueDate(event.target.value)}
                type="date"
                value={createDueDate}
              />
            </label>

            <label className="space-y-1 md:col-span-2 xl:col-span-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Line Item</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white"
                onChange={(event) => setCreateDescription(event.target.value)}
                placeholder="Professional services for matter review"
                type="text"
                value={createDescription}
              />
            </label>
          </div>

          {createError ? <p className="text-sm text-red-600">{createError}</p> : null}

          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              disabled={
                isCreatingInvoice ||
                !createMatterId ||
                !createDescription.trim() ||
                !createAmount ||
                Number(createAmount) <= 0
              }
              onClick={() => void handleCreateInvoice()}
              type="button"
            >
              {isCreatingInvoice ? 'Creating...' : 'Create Draft Invoice'}
            </button>
            <span className="text-xs text-gray-500">
              The invoice is saved as a draft first, then sent from the detail panel.
            </span>
          </div>
        </div>
      ) : null}

      {actionMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {actionMessage}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider">Overdue Aging</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.overdueAmount)}</p>
          <p className="text-xs text-red-600 mt-1 font-medium">Requires immediate action</p>
        </div>
        
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider">Outstanding Balance</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.outstanding)}</p>
          <p className="text-xs text-gray-500 mt-1">Pending client payments</p>
        </div>
        
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider">Total Collected</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalCollected)}</p>
          <p className="text-xs text-emerald-600 mt-1 font-medium">+12% from last month</p>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider">Unbilled / Drafts</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.draftAmount)}</p>
          <p className="text-xs text-gray-500 mt-1">Ready for review</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid lg:grid-cols-[320px_1fr_300px] xl:grid-cols-[360px_1fr_340px] gap-6">
        
        {/* Left: Invoice Queue */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 bg-white"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {['all', 'overdue', 'pending', 'paid', 'draft'].map((status) => (
                <button 
                  key={status}
                  onClick={() => setStatusFilter(status as FilterStatus)}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full border transition capitalize
                    ${statusFilter === status 
                      ? 'bg-gray-900 text-white border-gray-900' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  {status === 'pending' ? 'Unpaid' : status}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredInvoices.map(inv => (
              <div 
                key={inv.id} 
                onClick={() => setSelectedInvoiceId(inv.id)}
                className={`p-4 border-b border-gray-50 cursor-pointer transition relative group ${selectedInvoiceId === inv.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
              >
                {selectedInvoiceId === inv.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                )}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{inv.id}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{inv.clientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(inv.totalAmount)}</p>
                    <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${getStatusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Due: {formatDate(inv.dueDate)}</span>
                  {inv.status === 'overdue' && (
                    <span className="text-red-500 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Late
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: PDF Preview Document */}
        <div className="bg-gray-100/50 border border-gray-200 rounded-xl shadow-inner flex flex-col overflow-y-auto relative">
          {activeInvoice ? (
            <div className="p-8 mx-auto w-full max-w-2xl min-h-full flex items-center justify-center">
              {/* Paper Document */}
              <div className="bg-white w-full shadow-md rounded-sm overflow-hidden border border-gray-200">
                {/* Ribbon Top */}
                <div
                  className={`h-2 w-full ${
                    activeInvoice.status === 'paid'
                      ? 'bg-emerald-500'
                      : activeInvoice.status === 'overdue'
                        ? 'bg-red-500'
                        : activeInvoice.status === 'draft'
                          ? 'bg-gray-400'
                          : activeInvoice.status === 'refunded'
                            ? 'bg-amber-500'
                            : activeInvoice.status === 'void'
                              ? 'bg-slate-400'
                              : 'bg-blue-600'
                  }`}
                />
                
                <div className="p-10">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-12">
                    <div>
                      <h1 className="text-3xl font-medium text-gray-900 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>INVOICE</h1>
                      <p className="text-sm font-medium text-gray-500">{activeInvoice.id}</p>
                      
                      <div className="mt-6 space-y-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Billed To</p>
                        <p className="text-sm font-medium text-gray-900">{activeInvoice.clientName}</p>
                        <p className="text-sm text-gray-500">Matter: {activeInvoice.matterTitle}</p>
                        <p className="text-xs text-gray-400">Ref: {activeInvoice.matterRef}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="mb-6">
                        <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>LegalConnect</h2>
                        <p className="text-xs text-gray-500 mt-1">101 Heritage Building, Fort<br/>Mumbai, MH 400001</p>
                      </div>
                      
                      <table className="text-sm ml-auto">
                        <tbody>
                          <tr>
                            <td className="text-gray-500 pr-4 pb-1 text-right">Issue Date:</td>
                            <td className="font-medium text-gray-900 pb-1">{formatDate(activeInvoice.issueDate)}</td>
                          </tr>
                          <tr>
                            <td className="text-gray-500 pr-4 pb-1 text-right">Due Date:</td>
                            <td className="font-medium text-gray-900 pb-1">{formatDate(activeInvoice.dueDate)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Status Stamp */}
                  {activeInvoice.status === 'paid' && (
                    <div className="absolute top-32 right-12 opacity-10 rotate-[-15deg] pointer-events-none">
                      <span className="text-6xl font-bold border-4 border-emerald-900 text-emerald-900 px-6 py-2 rounded-lg uppercase tracking-widest">PAID</span>
                    </div>
                  )}
                  {activeInvoice.status === 'overdue' && (
                    <div className="absolute top-32 right-12 opacity-10 rotate-[-15deg] pointer-events-none">
                      <span className="text-6xl font-bold border-4 border-red-900 text-red-900 px-6 py-2 rounded-lg uppercase tracking-widest">OVERDUE</span>
                    </div>
                  )}

                  {/* Line Items */}
                  <table className="w-full mb-8">
                    <thead>
                      <tr className="border-b-2 border-gray-900 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <th className="text-left py-3">Description</th>
                        <th className="text-center py-3 w-20">Qty</th>
                        <th className="text-right py-3 w-32">Rate</th>
                        <th className="text-right py-3 w-32">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {activeInvoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-4 text-gray-900">{item.description}</td>
                          <td className="py-4 text-center text-gray-600">{item.quantity}</td>
                          <td className="py-4 text-right text-gray-600">{formatCurrency(item.rate)}</td>
                          <td className="py-4 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-64 space-y-3 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>{formatCurrency(activeInvoice.amount)}</span>
                      </div>
                      {activeInvoice.discount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Discount</span>
                          <span>-{formatCurrency(activeInvoice.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-3">
                        <span>GST (18%)</span>
                        <span>{formatCurrency(activeInvoice.tax)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg text-gray-900 pt-1">
                        <span>Total</span>
                        <span>{formatCurrency(activeInvoice.totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes Footer */}
                  {activeInvoice.clientNote && (
                    <div className="mt-16 pt-6 border-t border-gray-100 text-sm">
                      <p className="font-bold text-gray-900 mb-1">Note to Client</p>
                      <p className="text-gray-600">{activeInvoice.clientNote}</p>
                    </div>
                  )}

                  <div className="mt-8 text-center text-xs text-gray-400">
                    Thank you for your business. Please make payment by the due date to avoid late fees.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center p-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Invoice Selected</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">Select an invoice from the queue to view details and manage payments.</p>
            </div>
          )}
        </div>

        {/* Right: Context & Actions */}
        {activeInvoice && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition text-gray-700 disabled:opacity-50"
                  disabled={!canSendInvoice || !onSendInvoice || isSendingInvoice}
                  onClick={() => void handleSendInvoice()}
                  type="button"
                >
                  <Mail className="w-4 h-4 mb-1.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">
                    {activeInvoice.status === 'draft' ? 'Send' : 'Remind'}
                  </span>
                </button>
                <button className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition text-gray-700 cursor-not-allowed opacity-60">
                  <Download className="w-4 h-4 mb-1.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Download</span>
                </button>
                <button className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition text-gray-700 cursor-not-allowed opacity-60">
                  <Printer className="w-4 h-4 mb-1.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Print</span>
                </button>
                <button className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition text-gray-700 cursor-not-allowed opacity-60">
                  <Copy className="w-4 h-4 mb-1.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Copy Link</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Payment Status Summary */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Financial Status</h3>
                
                {activeInvoice.status === 'paid' ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-emerald-900">Fully Paid</p>
                      <p className="text-xs text-emerald-700 mt-0.5">Received on {activeInvoice.paidDate ? formatDate(activeInvoice.paidDate) : 'N/A'}</p>
                      <button
                        className="mt-3 text-xs font-medium text-emerald-700 hover:text-emerald-900 bg-white/60 px-3 py-1.5 rounded border border-emerald-200 transition disabled:opacity-50"
                        disabled={!activePayments[0] || isSubmittingRefund}
                        onClick={() => setShowRefundForm((current) => !current)}
                        type="button"
                      >
                        Issue Refund
                      </button>
                      {showRefundForm ? (
                        <div className="mt-3 space-y-2 rounded-lg border border-emerald-200 bg-white/70 p-3">
                          <input
                            className="w-full rounded border border-gray-200 px-3 py-2 text-xs outline-none"
                            onChange={(event) => setRefundAmount(event.target.value)}
                            placeholder="Refund amount"
                            type="number"
                            value={refundAmount}
                          />
                          <textarea
                            className="w-full rounded border border-gray-200 px-3 py-2 text-xs outline-none"
                            onChange={(event) => setRefundReason(event.target.value)}
                            placeholder="Reason for refund"
                            rows={3}
                            value={refundReason}
                          />
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-200"
                              onClick={() => {
                                setShowRefundForm(false);
                                setRefundAmount('');
                                setRefundReason('');
                              }}
                              type="button"
                            >
                              Cancel
                            </button>
                            <button
                              className="px-3 py-1.5 text-xs bg-emerald-700 text-white rounded disabled:opacity-50"
                              disabled={!refundAmount || !refundReason.trim() || !onCreateRefund || !activePayments[0]}
                              onClick={() => {
                                if (!activePayments[0] || !onCreateRefund) {
                                  return;
                                }

                                setIsSubmittingRefund(true);
                                void onCreateRefund({
                                  amount: Number(refundAmount),
                                  invoiceId: activeInvoice.id,
                                  paymentId: activePayments[0].id,
                                  reasonText: refundReason.trim(),
                                })
                                  .then(() => {
                                    setRefundAmount('');
                                    setRefundReason('');
                                    setShowRefundForm(false);
                                  })
                                  .finally(() => setIsSubmittingRefund(false));
                              }}
                              type="button"
                            >
                              Submit Refund
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : activeInvoice.status === 'void' ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-sm font-bold text-slate-900">Invoice Voided</p>
                    <p className="text-xs text-slate-600 mt-1">
                      This invoice is preserved for history but is no longer collectible.
                    </p>
                  </div>
                ) : activeInvoice.status === 'refunded' ? (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                    <p className="text-sm font-bold text-amber-900">Invoice Refunded</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Funds have been returned to the client against this invoice.
                    </p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <p className="text-xs text-blue-600 font-medium mb-1">Amount Due</p>
                        <p className="text-lg font-bold text-blue-900">{formatCurrency(activeInvoice.totalAmount)}</p>
                      </div>
                      <AlertCircle className={`w-5 h-5 ${activeInvoice.status === 'overdue' ? 'text-red-500' : 'text-blue-400'}`} />
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <button className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2 shadow-sm cursor-not-allowed opacity-60">
                        <DollarSign className="w-4 h-4" /> Record Payment
                      </button>
                      <button
                        className="w-full py-2 bg-white text-gray-700 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
                        disabled={!canSendInvoice || !onSendInvoice || isSendingInvoice}
                        onClick={() => void handleSendInvoice()}
                        type="button"
                      >
                        <Mail className="w-4 h-4" /> {isSendingInvoice ? 'Sending...' : sendInvoiceLabel}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Internal Notes */}
              {activeInvoice.internalNote && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Internal Note</h3>
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-sm text-gray-800">
                    {activeInvoice.internalNote}
                  </div>
                </div>
              )}

              {/* Payment & Action History */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Activity Ledger</h3>
                
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gray-100">
                  
                  {/* Show active payments if any */}
                  {activePayments.map(payment => (
                    <div key={payment.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-emerald-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                      <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white border border-gray-100 p-3 rounded-lg shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-gray-900 text-xs">Payment Received</span>
                          <span className="font-bold text-emerald-600 text-xs">{formatCurrency(payment.amount)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">via {payment.method} • Ref: {payment.reference}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{formatDate(payment.timestamp.split('T')[0])} by {payment.recordedBy}</p>
                      </div>
                    </div>
                  ))}

                  {activeRefunds.map((refund) => (
                    <div key={refund.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-amber-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                      <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white border border-gray-100 p-3 rounded-lg shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-gray-900 text-xs">Refund Issued</span>
                          <span className="font-bold text-amber-600 text-xs">{formatCurrency(refund.amount)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">{refund.reasonText}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {formatDate(refund.requestedAt.split('T')[0])} by {refund.requestedBy}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Invoice Sent/Draft state */}
                  {activeInvoice.status !== 'draft' && (
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-blue-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                      <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white border border-gray-100 p-3 rounded-lg shadow-sm">
                        <span className="font-bold text-gray-900 text-xs block mb-0.5">Invoice Issued</span>
                        <p className="text-[10px] text-gray-500">Sent to {activeInvoice.clientName}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{formatDate(activeInvoice.issueDate)}</p>
                      </div>
                    </div>
                  )}

                  {/* Creation */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-gray-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white border border-gray-100 p-3 rounded-lg shadow-sm">
                      <span className="font-bold text-gray-900 text-xs block mb-0.5">Draft Created</span>
                      <p className="text-[10px] text-gray-500">System generation</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatDate(new Date(new Date(activeInvoice.issueDate).getTime() - 2*24*60*60*1000).toISOString().split('T')[0])}</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
