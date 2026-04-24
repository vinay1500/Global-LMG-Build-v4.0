import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CalendarClock,
  FileText,
  Mail,
  Phone,
  Search,
} from 'lucide-react';
import { StatusBadge, UrgencyDot } from '../components/dashboard/StatusBadge';
import { formatCurrency, formatDate, formatDateTime } from '../data/seedData';
import type { AdminRequestRecord, RequestsWorkspaceResponse } from '../lib/api/contracts';
import { EmptyState } from './EmptyState';

type RequestsWorkspaceProps = {
  metrics?: RequestsWorkspaceResponse['metrics'];
  onOpenClient?: (clientId: string) => void;
  onOpenMatter?: (matterId: string) => void;
  requests?: AdminRequestRecord[];
};

const matchesSearch = (request: AdminRequestRecord, query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    request.requestNumber,
    request.title,
    request.clientName,
    request.clientEmail,
    request.ownerName,
    request.issueSummary,
    request.selectedServices.join(' '),
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalized);
};

export const RequestsWorkspace: React.FC<RequestsWorkspaceProps> = ({
  metrics,
  onOpenClient,
  onOpenMatter,
  requests = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [queueFilter, setQueueFilter] = useState<'all' | 'converted' | 'open' | 'scheduled' | 'urgent'>('all');
  const [consultationFilter, setConsultationFilter] = useState<'all' | 'in-person' | 'phone' | 'video'>('all');

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      if (!matchesSearch(request, searchQuery)) {
        return false;
      }

      if (queueFilter === 'urgent' && !['within-2hrs', 'within-6hrs'].includes(request.urgencyCode)) {
        return false;
      }

      if (queueFilter === 'scheduled' && !request.preferredStartAt) {
        return false;
      }

      if (queueFilter === 'converted' && !request.matterId) {
        return false;
      }

      if (queueFilter === 'open' && ['converted', 'lost-closed'].includes(request.statusCode)) {
        return false;
      }

      if (consultationFilter !== 'all' && request.consultationMode !== consultationFilter) {
        return false;
      }

      return true;
    });
  }, [consultationFilter, queueFilter, requests, searchQuery]);

  const serviceDemand = useMemo(() => {
    const counts = new Map<string, number>();

    requests.forEach((request) => {
      request.selectedServices.forEach((serviceCode) => {
        counts.set(serviceCode, (counts.get(serviceCode) || 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 6);
  }, [requests]);

  const statusMix = useMemo(() => {
    const counts = new Map<string, number>();

    requests.forEach((request) => {
      counts.set(request.statusCode, (counts.get(request.statusCode) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);
  }, [requests]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2
            className="text-2xl font-medium text-[#2C2B29]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Requests Intake
          </h2>
          <p className="text-sm text-[#8C8981] mt-1">
            Live intake queue from shared request records, consultation preferences, and conversion state.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'open', label: 'Open Queue' },
            { id: 'urgent', label: 'Urgent' },
            { id: 'scheduled', label: 'Scheduled' },
            { id: 'converted', label: 'Converted' },
          ].map((filter) => (
            <button
              className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                queueFilter === filter.id
                  ? 'bg-[#2C2B29] text-white border-[#2C2B29]'
                  : 'bg-white text-[#5A7C96] border-[#E6E4DD] hover:text-[#2C2B29] hover:bg-[#F4F1EA]'
              }`}
              key={filter.id}
              onClick={() => setQueueFilter(filter.id as typeof queueFilter)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Open Requests"
          tone="blue"
          value={metrics?.openRequests || requests.length}
        />
        <MetricCard
          label="Urgent Intake"
          tone="rose"
          value={metrics?.urgentRequests || 0}
        />
        <MetricCard
          label="Consultations Scheduled"
          tone="amber"
          value={metrics?.scheduledConsultations || 0}
        />
        <MetricCard
          label="Converted This Month"
          tone="emerald"
          value={metrics?.convertedThisMonth || 0}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[300px,minmax(0,1fr)] gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm p-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A69F]" />
              <input
                className="w-full rounded-lg border border-[#E6E4DD] bg-[#FCFBF8] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#C19A5B]"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search requests, clients, services..."
                type="text"
                value={searchQuery}
              />
            </div>

            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#A8A69F] mb-3">
                Consultation Mode
              </p>
              <div className="flex flex-wrap gap-2">
                {(['all', 'video', 'phone', 'in-person'] as const).map((mode) => (
                  <button
                    className={`px-3 py-1.5 rounded-full border text-xs transition ${
                      consultationFilter === mode
                        ? 'bg-[#FDF8EF] text-[#997A48] border-[#EAD2A8]'
                        : 'bg-white text-[#8C8981] border-[#E6E4DD] hover:text-[#2C2B29]'
                    }`}
                    key={mode}
                    onClick={() => setConsultationFilter(mode)}
                    type="button"
                  >
                    {mode === 'all' ? 'Any Mode' : mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#A8A69F] mb-4">
              Status Mix
            </p>
            <div className="space-y-3">
              {statusMix.map((entry) => (
                <div key={entry.code}>
                  <div className="flex items-center justify-between text-xs text-[#8C8981] mb-1">
                    <span>{entry.code.replace(/[-_]/g, ' ')}</span>
                    <span>{entry.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#F4F1EA] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#5A7C96]"
                      style={{
                        width: `${Math.min(
                          100,
                          (entry.count /
                            Math.max(...statusMix.map((item) => item.count), 1)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#A8A69F] mb-4">
              Service Demand
            </p>
            <div className="space-y-3">
              {serviceDemand.length ? (
                serviceDemand.map((service) => (
                  <div
                    className="flex items-center justify-between rounded-lg border border-[#E6E4DD] bg-[#FCFBF8] px-3 py-2"
                    key={service.code}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#2C2B29] truncate">{service.code}</p>
                    </div>
                    <span className="text-xs text-[#8C8981]">{service.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#8C8981]">No service selections yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm p-10">
              <EmptyState
                action={{ label: 'Clear Filters', onClick: () => {
                  setConsultationFilter('all');
                  setQueueFilter('all');
                  setSearchQuery('');
                } }}
                description="No requests match the current queue or consultation filters."
                icon={Search}
                title="No Requests Found"
              />
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div
                className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm p-5 hover:border-[#D8C7A4] transition"
                key={request.id}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#A8A69F]">
                        {request.requestNumber}
                      </span>
                      <StatusBadge status={request.statusCode} />
                      <UrgencyDot urgency={request.urgencyCode} />
                    </div>
                    <h3
                      className="text-xl text-[#2C2B29]"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {request.title}
                    </h3>
                    <p className="text-sm text-[#5A7C96] mt-2 max-w-3xl">{request.issueSummary}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="px-3 py-2 rounded-lg border border-[#E6E4DD] bg-white text-sm text-[#2C2B29] hover:bg-[#F4F1EA] transition"
                      onClick={() => onOpenClient?.(request.clientId)}
                      type="button"
                    >
                      Open Client
                    </button>
                    <button
                      className="px-3 py-2 rounded-lg bg-[#2C2B29] text-white text-sm hover:bg-[#4A4946] transition disabled:opacity-60"
                      disabled={!request.matterId}
                      onClick={() => request.matterId && onOpenMatter?.(request.matterId)}
                      type="button"
                    >
                      {request.matterId ? 'Open Matter' : 'Awaiting Matter'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
                  <InfoTile
                    icon={Mail}
                    label="Client"
                    primary={request.clientName}
                    secondary={request.clientEmail}
                  />
                  <InfoTile
                    icon={Phone}
                    label="Contact"
                    primary={request.clientPhone}
                    secondary={`Owner: ${request.ownerName}`}
                  />
                  <InfoTile
                    icon={CalendarClock}
                    label="Consultation"
                    primary={
                      request.preferredStartAt ? formatDateTime(request.preferredStartAt) : 'Not scheduled yet'
                    }
                    secondary={request.consultationMode}
                  />
                  <InfoTile
                    icon={Briefcase}
                    label="Commercials"
                    primary={formatCurrency(request.quoteTotalAmount)}
                    secondary={request.matterNumber ? `Matter ${request.matterNumber}` : 'Lead stage'}
                  />
                </div>

                <div className="mt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr),220px] gap-4">
                  <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-[#8C8981]" />
                      <p className="text-sm font-medium text-[#2C2B29]">Requested Services</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {request.selectedServices.length ? (
                        request.selectedServices.map((serviceCode) => (
                          <span
                            className="inline-flex items-center rounded-full border border-[#E6E4DD] bg-white px-3 py-1 text-xs text-[#5A7C96]"
                            key={serviceCode}
                          >
                            {serviceCode}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-[#8C8981]">No service selection captured.</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#E6E4DD] bg-[#FDF8EF] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#A8A69F] mb-2">
                      Timeline
                    </p>
                    <p className="text-sm font-medium text-[#2C2B29]">{formatDate(request.createdAt)}</p>
                    <p className="text-xs text-[#8C8981] mt-1">{request.expertiseArea}</p>
                    {request.preferredEndAt ? (
                      <p className="text-xs text-[#997A48] mt-3">
                        Window closes {formatDateTime(request.preferredEndAt)}
                      </p>
                    ) : null}
                    {request.urgencyCode === 'within-2hrs' ? (
                      <div className="mt-3 flex items-center gap-2 text-xs text-[#d4183d]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Immediate handling needed
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'amber' | 'blue' | 'emerald' | 'rose';
  value: number;
}) => {
  const toneClasses: Record<typeof tone, string> = {
    amber: 'bg-[#FDF8EF] border-[#EAD2A8]',
    blue: 'bg-[#EFF3F6] border-[#D6E4EE]',
    emerald: 'bg-[#EEF9F1] border-[#CFE8D5]',
    rose: 'bg-[#FDE8EC] border-[#F5C2C7]',
  };

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8C8981]">{label}</p>
      <p
        className="text-3xl mt-3 text-[#2C2B29]"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {value}
      </p>
    </div>
  );
};

const InfoTile = ({
  icon: Icon,
  label,
  primary,
  secondary,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary: string;
  secondary: string;
}) => (
  <div className="rounded-xl border border-[#E6E4DD] bg-white p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4 text-[#8C8981]" />
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#A8A69F]">{label}</p>
    </div>
    <p className="text-sm font-medium text-[#2C2B29]">{primary}</p>
    <p className="text-xs text-[#8C8981] mt-1">{secondary}</p>
  </div>
);
