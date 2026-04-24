import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  Download,
  FileText,
  Filter,
  Layers,
  Printer,
  Users,
  Zap,
} from 'lucide-react';
import { formatCurrency } from '../data/seedData';
import type { ReportsWorkspaceResponse } from '../lib/api/contracts';
import { EmptyState } from './EmptyState';

type ReportsWorkspaceProps = {
  workspace: ReportsWorkspaceResponse;
};

export const ReportsWorkspace: React.FC<ReportsWorkspaceProps> = ({ workspace }) => {
  const [range, setRange] = useState<'Custom' | 'Q2' | 'Q3' | 'YTD'>('YTD');

  const maxRevenue = useMemo(
    () =>
      Math.max(
        ...workspace.revenueTrend.flatMap((point) => [point.currentRevenue, point.previousRevenue]),
        1
      ),
    [workspace.revenueTrend]
  );

  const handleExportCsv = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Collections', String(workspace.summary.totalCollections)],
      ['Client Conversion Rate', String(workspace.summary.clientConversionRate)],
      ['Refunds & Write-offs', String(workspace.summary.refundsWriteOffs)],
      ['Average Resolution Days', String(workspace.summary.averageResolutionDays)],
      ...workspace.revenueTrend.map((point) => [
        `Revenue ${point.month}`,
        `Current ${point.currentRevenue} | Previous ${point.previousRevenue}`,
      ]),
    ];

    const csv = `data:text/csv;charset=utf-8,${rows
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')}`;
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `glmg-firm-performance-${range.toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!workspace.revenueTrend.length && !workspace.stageMix.length) {
    return (
      <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm p-10">
        <EmptyState
          description="We need more billing, matter, and intake activity before performance reporting can render."
          icon={BarChart3}
          title="No Report Data Yet"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h2
            className="text-3xl font-medium text-[#2C2B29]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Firm Performance
          </h2>
          <p className="text-sm text-[#8C8981] mt-1">
            Strategic reporting across collections, intake conversion, matter throughput, and delivery pressure.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-[#E6E4DD] rounded-lg p-1 shadow-sm">
            {(['YTD', 'Q3', 'Q2', 'Custom'] as const).map((value) => (
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  range === value ? 'bg-[#F4F1EA] text-[#2C2B29]' : 'text-[#8C8981] hover:text-[#2C2B29]'
                }`}
                key={value}
                onClick={() => setRange(value)}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
          <button className="px-4 py-2 bg-white border border-[#E6E4DD] rounded-lg shadow-sm text-sm font-medium text-[#2C2B29] hover:bg-[#F4F1EA] transition flex items-center gap-2" type="button">
            <Filter className="w-4 h-4 text-[#8C8981]" /> Filters
          </button>
          <button
            className="px-4 py-2 bg-white border border-[#E6E4DD] rounded-lg shadow-sm text-sm font-medium text-[#2C2B29] hover:bg-[#F4F1EA] transition flex items-center gap-2"
            onClick={handleExportCsv}
            type="button"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            className="px-4 py-2 bg-[#2C2B29] text-white rounded-lg shadow-sm text-sm font-medium hover:bg-[#4A4946] transition flex items-center gap-2"
            onClick={() => window.print()}
            type="button"
          >
            <Printer className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <ReportMetricCard
          accent="gold"
          icon={CreditCard}
          label="Total Collections"
          trend="up"
          trendLabel={`${workspace.summary.totalRequests} total requests`}
          value={formatCurrency(workspace.summary.totalCollections)}
        />
        <ReportMetricCard
          accent="blue"
          icon={Users}
          label="Client Conversion"
          trend="up"
          trendLabel="lead to matter"
          value={`${workspace.summary.clientConversionRate}%`}
        />
        <ReportMetricCard
          accent="rose"
          icon={FileText}
          label="Refunds & Write-offs"
          trend="down"
          trendLabel="risk exposure"
          value={formatCurrency(workspace.summary.refundsWriteOffs)}
        />
        <ReportMetricCard
          accent="violet"
          icon={Zap}
          label="Avg Resolution Time"
          trend="neutral"
          trendLabel="closed matters"
          value={`${workspace.summary.averageResolutionDays} days`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#E6E4DD]">
            <h3 className="font-medium text-[#2C2B29]">Revenue: Year-over-Year</h3>
            <p className="text-xs text-[#8C8981] mt-0.5">
              Current collections versus the same months one year earlier.
            </p>
          </div>
          <div className="p-5">
            <div className="h-[320px] rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-5">
              <div className="h-full grid grid-cols-4 md:grid-cols-8 gap-4 items-end">
                {workspace.revenueTrend.map((point) => (
                  <div className="flex flex-col items-center gap-3 min-w-0" key={point.month}>
                    <div className="w-full h-full flex items-end justify-center gap-2">
                      <div
                        className="w-5 rounded-t-md bg-[#D9D4C6]"
                        style={{ height: `${Math.max(14, (point.previousRevenue / maxRevenue) * 220)}px` }}
                        title={`Previous ${formatCurrency(point.previousRevenue)}`}
                      />
                      <div
                        className="w-5 rounded-t-md bg-[#C19A5B]"
                        style={{ height: `${Math.max(18, (point.currentRevenue / maxRevenue) * 220)}px` }}
                        title={`Current ${formatCurrency(point.currentRevenue)}`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-[#2C2B29]">{point.month}</p>
                      <p className="text-[11px] text-[#8C8981]">{formatCurrency(point.currentRevenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-[#8C8981]">
              <LegendSwatch color="bg-[#C19A5B]" label="Current" />
              <LegendSwatch color="bg-[#D9D4C6]" label="Previous Year" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#E6E4DD]">
            <h3 className="font-medium text-[#2C2B29]">Stage Mix</h3>
            <p className="text-xs text-[#8C8981] mt-0.5">Where active matters are accumulating.</p>
          </div>
          <div className="p-5 space-y-4">
            {workspace.stageMix.map((entry) => (
              <div key={entry.label}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[#2C2B29]">{entry.label}</span>
                  <span className="text-[#8C8981]">{entry.value}</span>
                </div>
                <div className="h-3 rounded-full bg-[#F4F1EA] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#5A7C96]"
                    style={{
                      width: `${Math.min(
                        100,
                        (entry.value /
                          Math.max(...workspace.stageMix.map((item) => item.value), 1)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#E6E4DD]">
            <h3 className="font-medium text-[#2C2B29]">Intake Conversion Trend</h3>
            <p className="text-xs text-[#8C8981] mt-0.5">New leads versus request-to-matter conversions.</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 items-end h-[240px]">
              {workspace.intakeTrend.map((entry) => {
                const maxValue = Math.max(
                  ...workspace.intakeTrend.flatMap((item) => [item.leads, item.converted]),
                  1
                );

                return (
                  <div className="flex flex-col items-center gap-3" key={entry.month}>
                    <div className="w-full h-full flex items-end justify-center gap-2">
                      <div
                        className="w-5 rounded-t-md bg-[#D6E4EE]"
                        style={{ height: `${Math.max(16, (entry.leads / maxValue) * 160)}px` }}
                      />
                      <div
                        className="w-5 rounded-t-md bg-[#5A7C96]"
                        style={{ height: `${Math.max(12, (entry.converted / maxValue) * 160)}px` }}
                      />
                    </div>
                    <div className="text-center text-xs">
                      <p className="font-medium text-[#2C2B29]">{entry.month}</p>
                      <p className="text-[#8C8981]">{entry.converted}/{entry.leads}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#E6E4DD]">
            <h3 className="font-medium text-[#2C2B29]">Accounts Receivable Aging</h3>
            <p className="text-xs text-[#8C8981] mt-0.5">Outstanding invoice exposure by aging bucket.</p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            {workspace.invoiceAging.map((entry) => (
              <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={entry.bucket}>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#A8A69F]">{entry.bucket}</p>
                <p
                  className="text-xl mt-3 text-[#2C2B29]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {formatCurrency(entry.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#E6E4DD]">
            <h3 className="font-medium text-[#2C2B29]">Document Review Activity</h3>
            <p className="text-xs text-[#8C8981] mt-0.5">Current split of review state across documents.</p>
          </div>
          <div className="p-5 space-y-4">
            {workspace.documentActivity.map((entry) => (
              <div className="flex items-center justify-between rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] px-4 py-3" key={entry.label}>
                <span className="text-sm text-[#2C2B29]">{entry.label}</span>
                <span className="text-sm font-medium text-[#5A7C96]">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden xl:col-span-2">
          <div className="p-5 border-b border-[#E6E4DD]">
            <h3 className="font-medium text-[#2C2B29]">Team Utilization</h3>
            <p className="text-xs text-[#8C8981] mt-0.5">Matter load and waiting-thread pressure by assignee.</p>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspace.workloadByAssignee.map((entry) => (
              <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={entry.label}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#2C2B29]">{entry.label}</p>
                    <p className="text-xs text-[#8C8981] mt-1">
                      {entry.activeMatters} active matters • {entry.waitingThreads} waiting threads
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-[#2C2B29]">{entry.utilizationRate}%</p>
                    <p className="text-[11px] text-[#8C8981] uppercase tracking-[0.18em]">utilization</p>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-white border border-[#E6E4DD] overflow-hidden mt-4">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#C19A5B] to-[#5A7C96]"
                    style={{ width: `${Math.min(100, entry.utilizationRate)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#E6E4DD]">
          <h3 className="font-medium text-[#2C2B29]">Resolution Time by Practice</h3>
          <p className="text-xs text-[#8C8981] mt-0.5">Average matter close time for completed work.</p>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {workspace.resolutionTimes.map((entry) => (
            <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={entry.label}>
              <p className="text-sm font-medium text-[#2C2B29]">{entry.label}</p>
              <p
                className="text-2xl mt-3 text-[#2C2B29]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {entry.days}
              </p>
              <p className="text-xs text-[#8C8981] mt-1">average days</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ReportMetricCard = ({
  accent,
  icon: Icon,
  label,
  trend,
  trendLabel,
  value,
}: {
  accent: 'blue' | 'gold' | 'rose' | 'violet';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  trend: 'down' | 'neutral' | 'up';
  trendLabel: string;
  value: string;
}) => {
  const accentClasses = {
    blue: 'bg-[#EFF3F6] text-[#5A7C96]',
    gold: 'bg-[#FDF8EF] text-[#C19A5B]',
    rose: 'bg-[#FDE8EC] text-[#d4183d]',
    violet: 'bg-[#F3F0FF] text-[#7C3AED]',
  }[accent];

  const trendNode =
    trend === 'up' ? (
      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
    ) : trend === 'down' ? (
      <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
    ) : (
      <Layers className="w-3.5 h-3.5 text-[#8C8981]" />
    );

  return (
    <div className="bg-white border border-[#E6E4DD] p-5 rounded-xl shadow-sm">
      <div className="flex justify-between items-start gap-3 mb-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentClasses}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-[#8C8981]">
          {trendNode}
          {trendLabel}
        </span>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#A8A69F]">{label}</p>
      <p
        className="text-2xl mt-3 text-[#2C2B29]"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {value}
      </p>
    </div>
  );
};

const LegendSwatch = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-2">
    <span className={`w-3 h-3 rounded-full ${color}`} />
    {label}
  </span>
);
