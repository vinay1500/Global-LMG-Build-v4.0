import React from 'react';

const statusColors: Record<string, string> = {
  'in-progress': 'bg-blue-50 text-blue-700 border-blue-200',
  'immediate-6h': 'bg-red-50 text-red-700 border-red-200',
  'awaiting-client': 'bg-amber-50 text-amber-700 border-amber-200',
  'awaiting-team': 'bg-orange-50 text-orange-700 border-orange-200',
  'completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'on-hold': 'bg-gray-50 text-gray-600 border-gray-200',
  // operational
  'new-lead': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'awaiting-verification': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'verification-scheduled': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'verification-done': 'bg-teal-50 text-teal-700 border-teal-200',
  'consultation-scheduled': 'bg-blue-50 text-blue-700 border-blue-200',
  'consultation-completed': 'bg-violet-50 text-violet-700 border-violet-200',
  'fee-pending': 'bg-amber-50 text-amber-700 border-amber-200',
  'package-ready': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'invoice-sent': 'bg-sky-50 text-sky-700 border-sky-200',
  'awaiting-payment': 'bg-orange-50 text-orange-700 border-orange-200',
  'paid': 'bg-green-50 text-green-700 border-green-200',
  'work-in-progress': 'bg-blue-50 text-blue-700 border-blue-200',
  'immediate': 'bg-red-50 text-red-700 border-red-200',
  'archived': 'bg-gray-100 text-gray-500 border-gray-200',
  'lost-closed': 'bg-gray-100 text-gray-500 border-gray-200',
  'converted': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  // invoice
  'draft': 'bg-gray-50 text-gray-600 border-gray-200',
  'sent': 'bg-blue-50 text-blue-700 border-blue-200',
  'pending': 'bg-amber-50 text-amber-700 border-amber-200',
  'overdue': 'bg-red-50 text-red-700 border-red-200',
  'failed': 'bg-red-100 text-red-800 border-red-300',
  'refunded': 'bg-purple-50 text-purple-700 border-purple-200',
  // user lifecycle
  'registered': 'bg-gray-50 text-gray-600 border-gray-200',
  'lead': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'client': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  // event
  'upcoming': 'bg-blue-50 text-blue-700 border-blue-200',
  'cancelled': 'bg-red-50 text-red-600 border-red-200',
  'rescheduled': 'bg-amber-50 text-amber-600 border-amber-200',
  // doc
  'reviewed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'unreviewed': 'bg-amber-50 text-amber-700 border-amber-200',
  'requires-revision': 'bg-red-50 text-red-700 border-red-200',
  // thread
  'active': 'bg-blue-50 text-blue-700 border-blue-200',
  'waiting': 'bg-amber-50 text-amber-700 border-amber-200',
  'resolved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  // workload
  'light': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'moderate': 'bg-amber-50 text-amber-700 border-amber-200',
  'heavy': 'bg-red-50 text-red-700 border-red-200',
  'available': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'busy': 'bg-amber-50 text-amber-700 border-amber-200',
  'unavailable': 'bg-red-50 text-red-700 border-red-200',
  'on-leave': 'bg-purple-50 text-purple-600 border-purple-200',
  'inactive': 'bg-gray-100 text-gray-500 border-gray-200',
  'success': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const formatLabel = (status: string) =>
  (status || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  const color = statusColors[status] || 'bg-gray-50 text-gray-600 border-gray-200';
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  return (
    <span className={`inline-flex items-center rounded-full border ${color} ${sizeClass} whitespace-nowrap`}>
      {formatLabel(status)}
    </span>
  );
};

export const UrgencyDot: React.FC<{ urgency: string }> = ({ urgency }) => {
  if (!urgency || urgency === 'standard') return null;
  const color = urgency === 'within-2hrs' ? 'bg-red-500' : 'bg-amber-500';
  const label = urgency === 'within-2hrs' ? 'Immediate' : 'Urgent';
  return (
    <span className="inline-flex items-center gap-1 text-[11px]">
      <span className={`w-2 h-2 rounded-full ${color} animate-pulse`} />
      {label}
    </span>
  );
};
