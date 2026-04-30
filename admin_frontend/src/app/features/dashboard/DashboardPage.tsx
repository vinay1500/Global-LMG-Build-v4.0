import React from 'react';
import {
  AlertCircle,
  Calendar,
  FileText,
  MessageSquare,
  Shield,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { formatCurrency } from '../../data/seedData';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.getDashboardWorkspace(),
    []
  );

  if (isLoading && !data) {
    return (
      <WorkspaceState
        description="Loading live metrics, aging buckets, recent audit events, notifications, and RBAC snapshots."
        title="Loading Control Tower"
      />
    );
  }

  if (errorMessage && !data) {
    return (
      <WorkspaceState
        actionLabel="Try Again"
        description={errorMessage}
        onAction={() => void refresh().catch(() => undefined)}
        title="Control Tower Unavailable"
      />
    );
  }

  const cards = [
    { drilldown: 'active-matters', label: 'Open Matters', value: data?.metrics.openMatters || 0, icon: Users },
    { drilldown: 'outstanding-invoices', label: 'Pending Invoices', value: data?.metrics.pendingInvoices || 0, icon: FileText },
    { drilldown: 'waiting-threads', label: 'Waiting Threads', value: data?.metrics.unreadThreads || 0, icon: MessageSquare },
    { drilldown: 'pending-documents', label: 'Doc Backlog', value: data?.metrics.docBacklog || 0, icon: AlertCircle },
    { drilldown: 'pending-reminders', label: 'Pending Reminders', value: data?.metrics.pendingReminders || 0, icon: Calendar },
    { drilldown: 'failed-reminders', label: 'Failed Reminders', value: data?.metrics.failedReminders || 0, icon: AlertCircle },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2
            className="text-2xl font-medium text-[#2C2B29]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Control Tower
          </h2>
          <p className="text-sm text-[#8C8981] mt-1">
            Operational overview and actionable queues from the shared MySQL system.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1.5 text-sm bg-white border border-[#E6E4DD] text-[#2C2B29] rounded-md shadow-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#8C8981]" /> Last 6 Months
          </div>
          <button
            className="px-3 py-1.5 text-sm bg-[#2C2B29] text-[#F4F1EA] rounded-md shadow-sm flex items-center gap-2"
            onClick={() => navigate('/reports')}
            type="button"
          >
            Open Reports
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#FDE8EC] border border-[#F5C2C7] p-4 rounded-xl flex items-start gap-3 lg:col-span-1">
          <AlertCircle className="w-5 h-5 text-[#d4183d] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#d4183d]">
              {data?.alertBanner.staleMatters || 0} Matters Stale (14+ Days)
            </p>
            <p className="text-xs text-[#d4183d]/80 mt-1">{data?.alertBanner.summary}</p>
          </div>
        </div>
        <div className="bg-[#FDF8EF] border border-[#EAD2A8] p-4 rounded-xl lg:col-span-2">
          <p className="text-sm font-medium text-[#2C2B29]">Phase 2 Live Status</p>
          <p className="text-xs text-[#8C8981] mt-1">
            Dashboard cards, stage mix, revenue trend, receivables aging, recent audit, recent
            notifications, and access-control snapshots are now live from `admin_backend`.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              className="bg-white border border-[#E6E4DD] rounded-xl p-5 shadow-sm text-left transition hover:border-[#D8C7A4] hover:shadow-md"
              key={card.label}
              onClick={() => navigate(`/reports?drilldown=${card.drilldown}`)}
              type="button"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#A8A69F] uppercase tracking-wider">{card.label}</p>
                <div className="w-9 h-9 rounded-full bg-[#F4F1EA] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#5A7C96]" />
                </div>
              </div>
              <p
                className="text-3xl mt-4 text-[#2C2B29]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {card.value}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-[#E6E4DD] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[#2C2B29]">Revenue Trend</h3>
            <p className="text-xs text-[#8C8981]">Captured payment volume</p>
          </div>
          <div className="h-72 rounded-xl bg-[#FCFBF8] border border-[#E6E4DD] p-4 flex items-end gap-3">
            {(data?.revenueTrend || []).map((point) => {
              const maxRevenue = Math.max(...(data?.revenueTrend || []).map((entry) => entry.revenue), 1);
              const height = Math.max(16, Math.round((point.revenue / maxRevenue) * 220));
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
            {(data?.stageMix || []).map((point) => (
              <div key={point.name}>
                <div className="flex items-center justify-between text-xs text-[#8C8981] mb-1">
                  <span>{point.name}</span>
                  <span>{point.value}</span>
                </div>
                <div className="h-3 rounded-full bg-[#F4F1EA] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#5A7C96]"
                    style={{
                      width: `${Math.min(
                        100,
                        point.value *
                          (100 /
                            Math.max(
                              ...(data?.stageMix || [{ name: '', value: 1 }]).map((entry) => entry.value)
                            ))
                      )}%`,
                    }}
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
            {(data?.aging || []).map((point) => (
              <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={point.bucket}>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A8A69F]">{point.bucket}</p>
                <p
                  className="text-xl mt-2 text-[#2C2B29]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {formatCurrency(point.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E6E4DD] rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-medium text-[#2C2B29] mb-4">Recent Audit</h3>
          <div className="space-y-3">
            {(data?.recentAudit || []).map((entry) => (
              <div className="border border-[#E6E4DD] rounded-lg p-3" key={entry.id}>
                <p className="text-sm font-medium text-[#2C2B29]">{entry.action}</p>
                <p className="text-xs text-[#8C8981] mt-1">
                  {entry.actor} • {entry.sourceModule}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E6E4DD] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#5A7C96]" />
            <h3 className="text-sm font-medium text-[#2C2B29]">Access Snapshot</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-[#A8A69F] uppercase tracking-wider mb-3">Roles</p>
              <div className="space-y-2">
                {(data?.accessOverview.roles || []).slice(0, 5).map((role) => (
                  <div className="rounded-lg border border-[#E6E4DD] bg-[#FCFBF8] p-3" key={role.code}>
                    <p className="text-sm font-medium text-[#2C2B29]">{role.name}</p>
                    <p className="text-xs text-[#8C8981] mt-1">
                      {role.userCount} users • {role.permissionCodes.length} permissions
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[#A8A69F] uppercase tracking-wider mb-3">Users</p>
              <div className="space-y-2">
                {(data?.accessOverview.users || []).slice(0, 5).map((user) => (
                  <div className="rounded-lg border border-[#E6E4DD] bg-[#FCFBF8] p-3" key={user.id}>
                    <p className="text-sm font-medium text-[#2C2B29]">{user.displayName}</p>
                    <p className="text-xs text-[#8C8981] mt-1">
                      {user.roleCodes.join(', ') || 'No active roles'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E6E4DD] rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-medium text-[#2C2B29] mb-4">Recent Notifications</h3>
          <div className="space-y-3">
            {(data?.recentNotifications || []).map((entry) => (
              <div className="border border-[#E6E4DD] rounded-lg p-3" key={entry.id}>
                <p className="text-sm font-medium text-[#2C2B29]">{entry.title}</p>
                <p className="text-xs text-[#8C8981] mt-1">{entry.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
