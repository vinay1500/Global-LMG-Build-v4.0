import React from 'react';
import { AlertCircle, Calendar, Download, FileText, MessageSquare, Users } from 'lucide-react';
import { AUDIT_ENTRIES, DOCUMENTS, INVOICES, MATTERS, MESSAGE_THREADS, formatCurrency } from '../../data/seedData';

export const DashboardPage = () => {
  const stageData = [
    { name: 'Intake', value: 12 },
    { name: 'Review', value: 19 },
    { name: 'Drafting', value: 8 },
    { name: 'Filing', value: 4 },
    { name: 'Closing', value: 2 },
  ];

  const revenueTrend = [
    { month: 'Jan', revenue: 12400 },
    { month: 'Feb', revenue: 14500 },
    { month: 'Mar', revenue: 11200 },
    { month: 'Apr', revenue: 18900 },
    { month: 'May', revenue: 22100 },
    { month: 'Jun', revenue: 19800 },
  ];

  const agingData = [
    { bucket: '1-15 Days', amount: 4500 },
    { bucket: '16-30 Days', amount: 2100 },
    { bucket: '31-60 Days', amount: 850 },
    { bucket: '60+ Days', amount: 1200 },
  ];

  const cards = [
    { label: 'Open Matters', value: MATTERS.filter((matter) => matter.operationalStatus !== 'completed').length, icon: Users },
    { label: 'Pending Invoices', value: INVOICES.filter((invoice) => invoice.status !== 'paid').length, icon: FileText },
    { label: 'Unread Threads', value: MESSAGE_THREADS.filter((thread) => thread.unreadCount > 0).length, icon: MessageSquare },
    { label: 'Doc Backlog', value: DOCUMENTS.filter((doc) => doc.reviewState === 'unreviewed').length, icon: AlertCircle },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-medium text-[#2C2B29]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Control Tower
          </h2>
          <p className="text-sm text-[#8C8981] mt-1">Operational overview and actionable queues.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-sm bg-white border border-[#E6E4DD] text-[#2C2B29] rounded-md shadow-sm hover:bg-[#FCFBF8] transition flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#8C8981]" /> Last 30 Days
          </button>
          <button className="px-3 py-1.5 text-sm bg-[#2C2B29] text-[#F4F1EA] rounded-md shadow-sm hover:bg-[#4A4946] transition flex items-center gap-2">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#FDE8EC] border border-[#F5C2C7] p-4 rounded-xl flex items-start gap-3 lg:col-span-1">
          <AlertCircle className="w-5 h-5 text-[#d4183d] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#d4183d]">3 Matters Stale (14+ Days)</p>
            <p className="text-xs text-[#d4183d]/80 mt-1">Awaiting internal review or client signatures.</p>
          </div>
        </div>
        <div className="bg-[#FDF8EF] border border-[#EAD2A8] p-4 rounded-xl lg:col-span-2">
          <p className="text-sm font-medium text-[#2C2B29]">Phase 1 Note</p>
          <p className="text-xs text-[#8C8981] mt-1">
            This dashboard is still seed-backed for now, but the shell is now standalone and ready for real admin data wiring.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div className="bg-white border border-[#E6E4DD] rounded-xl p-5 shadow-sm" key={card.label}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#A8A69F] uppercase tracking-wider">{card.label}</p>
                <div className="w-9 h-9 rounded-full bg-[#F4F1EA] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#5A7C96]" />
                </div>
              </div>
              <p className="text-3xl mt-4 text-[#2C2B29]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-[#E6E4DD] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[#2C2B29]">Revenue Trend</h3>
            <p className="text-xs text-[#8C8981]">Seed-backed through Phase 1</p>
          </div>
          <div className="h-72 rounded-xl bg-[#FCFBF8] border border-[#E6E4DD] p-4 flex items-end gap-3">
            {revenueTrend.map((point) => {
              const height = Math.max(16, Math.round((point.revenue / 22100) * 220));
              return (
                <div className="flex-1 flex flex-col justify-end items-center gap-2" key={point.month}>
                  <span className="text-[11px] text-[#8C8981]">{formatCurrency(point.revenue)}</span>
                  <div
                    className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-[#C19A5B] to-[#EAD2A8]"
                    style={{ height }}
                  />
                  <span className="text-xs text-[#5A7C96]">{point.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-[#E6E4DD] rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-medium text-[#2C2B29] mb-4">Stage Mix</h3>
          <div className="space-y-4">
            {stageData.map((point) => (
              <div key={point.name}>
                <div className="flex items-center justify-between text-xs text-[#8C8981] mb-1">
                  <span>{point.name}</span>
                  <span>{point.value}</span>
                </div>
                <div className="h-3 rounded-full bg-[#F4F1EA] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#5A7C96]"
                    style={{ width: `${Math.min(100, point.value * 5)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white border border-[#E6E4DD] rounded-xl p-5 shadow-sm xl:col-span-2">
          <h3 className="text-sm font-medium text-[#2C2B29] mb-4">Receivables Aging</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {agingData.map((point) => (
              <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={point.bucket}>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A8A69F]">{point.bucket}</p>
                <p className="text-xl mt-2 text-[#2C2B29]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {formatCurrency(point.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E6E4DD] rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-medium text-[#2C2B29] mb-4">Recent Audit</h3>
          <div className="space-y-3">
            {AUDIT_ENTRIES.slice(0, 5).map((entry) => (
              <div className="border border-[#E6E4DD] rounded-lg p-3" key={entry.id}>
                <p className="text-sm font-medium text-[#2C2B29]">{entry.action}</p>
                <p className="text-xs text-[#8C8981] mt-1">{entry.actor} • {entry.sourceModule}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
