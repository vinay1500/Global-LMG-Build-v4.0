import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Filter, List, Trello, AlertCircle, Clock, 
  CheckCircle, Briefcase, User, MoreVertical, ChevronDown, 
  ArrowDownToLine, ArrowUpToLine, DollarSign, Calendar
} from 'lucide-react';
import { type Matter, PLATFORM_USERS, type PlatformUser } from '../data/seedData';
import { StatusBadge, UrgencyDot } from '../components/dashboard/StatusBadge';
import { EmptyState } from './EmptyState';

interface MatterDeskAdminProps {
  matters: Matter[];
  clients?: PlatformUser[];
  onViewMatter: (matter: Matter) => void;
}

type ViewMode = 'list' | 'board' | 'queue';
type FilterState = {
  stage: string | null;
  urgency: string | null;
  status: string | null;
  clientId: string | null;
  counsel: string | null;
  billing: string | null;
};

export const MatterDeskAdmin: React.FC<MatterDeskAdminProps> = ({
  matters,
  clients: providedClients,
  onViewMatter,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    stage: null,
    urgency: null,
    status: null,
    clientId: null,
    counsel: null,
    billing: null
  });

  const clients = useMemo(
    () => providedClients || PLATFORM_USERS.filter(u => u.lifecycle === 'client'),
    [providedClients]
  );

  const filteredMatters = useMemo(() => {
    return matters.filter(m => {
      if (searchQuery && !m.title.toLowerCase().includes(searchQuery.toLowerCase()) && !m.referenceCode.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (filters.stage && m.lifecycleStage !== filters.stage) return false;
      if (filters.urgency && m.urgency !== filters.urgency) return false;
      if (filters.status && m.operationalStatus !== filters.status) return false;
      if (filters.clientId && m.clientId !== filters.clientId) return false;
      if (filters.billing) {
        // Mock billing state logic based on paidAmount/totalFee
        const isOverdue = m.paidAmount === 0 && m.totalFee > 0;
        const isUnbilled = m.totalFee === 0;
        const isCurrent = m.paidAmount >= m.totalFee && m.totalFee > 0;
        
        if (filters.billing === 'overdue' && !isOverdue) return false;
        if (filters.billing === 'unbilled' && !isUnbilled) return false;
        if (filters.billing === 'current' && !isCurrent) return false;
      }
      return true;
    });
  }, [matters, searchQuery, filters]);

  const stages = Array.from(new Set(matters.map(m => m.lifecycleStage)));
  
  const getStageColor = (stage: string) => {
    switch(stage) {
      case 'discovery': return 'border-blue-200 bg-blue-50';
      case 'drafting': return 'border-amber-200 bg-amber-50';
      case 'review': return 'border-purple-200 bg-purple-50';
      case 'negotiation': return 'border-indigo-200 bg-indigo-50';
      case 'execution': return 'border-green-200 bg-green-50';
      case 'completed': return 'border-gray-200 bg-gray-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusBg = (status: string) => {
    switch(status) {
      case 'awaiting-client': return 'bg-amber-100 text-amber-800';
      case 'awaiting-internal': return 'bg-blue-100 text-blue-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      case 'stale': return 'bg-gray-200 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-medium text-[#2C2B29]" style={{ fontFamily: "'Playfair Display', serif" }}>Matter Desk</h2>
          <p className="text-sm text-[#8C8981]">Operational control tower for all active and pending matters.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#F9F8F6] p-1 rounded-lg border border-[#E6E4DD]">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-[#2C2B29]' : 'text-[#8C8981] hover:text-[#2C2B29]'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'board' ? 'bg-white shadow-sm text-[#2C2B29]' : 'text-[#8C8981] hover:text-[#2C2B29]'}`}
              title="Board View"
            >
              <Trello className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('queue')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'queue' ? 'bg-white shadow-sm text-[#2C2B29]' : 'text-[#8C8981] hover:text-[#2C2B29]'}`}
              title="Priority Queue"
            >
              <ArrowDownToLine className="w-4 h-4" />
            </button>
          </div>
          <button className="bg-[#2C2B29] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-[#4A4946] transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Matter
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E6E4DD] rounded-xl p-3 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative min-w-[200px] flex-1">
          <Search className="w-4 h-4 text-[#8C8981] absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search matters by name or ID..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-[#E6E4DD] rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#C19A5B] focus:border-[#C19A5B]"
          />
        </div>
        
        <select 
          className="px-3 py-2 text-sm border border-[#E6E4DD] rounded-lg bg-white text-[#2C2B29] focus:outline-none focus:border-[#C19A5B]"
          value={filters.clientId || ''}
          onChange={e => setFilters({...filters, clientId: e.target.value || null})}
        >
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select 
          className="px-3 py-2 text-sm border border-[#E6E4DD] rounded-lg bg-white text-[#2C2B29] focus:outline-none focus:border-[#C19A5B]"
          value={filters.stage || ''}
          onChange={e => setFilters({...filters, stage: e.target.value || null})}
        >
          <option value="">All Stages</option>
          {stages.map(s => <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>)}
        </select>

        <select 
          className="px-3 py-2 text-sm border border-[#E6E4DD] rounded-lg bg-white text-[#2C2B29] focus:outline-none focus:border-[#C19A5B]"
          value={filters.urgency || ''}
          onChange={e => setFilters({...filters, urgency: e.target.value || null})}
        >
          <option value="">All Priorities</option>
          <option value="high">Urgent</option>
          <option value="standard">Standard</option>
          <option value="low">Low</option>
        </select>

        <select 
          className="px-3 py-2 text-sm border border-[#E6E4DD] rounded-lg bg-white text-[#2C2B29] focus:outline-none focus:border-[#C19A5B]"
          value={filters.status || ''}
          onChange={e => setFilters({...filters, status: e.target.value || null})}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="awaiting-client">Awaiting Client</option>
          <option value="awaiting-internal">Awaiting Internal</option>
          <option value="blocked">Blocked</option>
          <option value="stale">Stale</option>
        </select>

        <select 
          className="px-3 py-2 text-sm border border-[#E6E4DD] rounded-lg bg-white text-[#2C2B29] focus:outline-none focus:border-[#C19A5B]"
          value={filters.counsel || ''}
          onChange={e => setFilters({...filters, counsel: e.target.value || null})}
        >
          <option value="">Any Counsel</option>
          <option value="unassigned">Unassigned</option>
          <option value="counsel-1">Sarah Jenkins</option>
          <option value="counsel-2">Michael Chang</option>
        </select>
        
        <select 
          className="px-3 py-2 text-sm border border-[#E6E4DD] rounded-lg bg-white text-[#2C2B29] focus:outline-none focus:border-[#C19A5B]"
          value={filters.billing || ''}
          onChange={e => setFilters({...filters, billing: e.target.value || null})}
        >
          <option value="">Any Billing State</option>
          <option value="current">Current</option>
          <option value="overdue">Overdue</option>
          <option value="unbilled">Unbilled</option>
        </select>
        
        <button 
          onClick={() => setFilters({stage: null, urgency: null, status: null, clientId: null, counsel: null, billing: null})}
          className="px-3 py-2 text-xs font-medium text-[#C19A5B] hover:text-[#997A48]"
        >
          Clear
        </button>
      </div>

      {/* Main Content Area */}
      {viewMode === 'list' && (
        <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F9F8F6] border-b border-[#E6E4DD] text-[11px] uppercase tracking-wider text-[#8C8981] font-bold">
                  <th className="p-4 w-10"></th>
                  <th className="p-4">Matter</th>
                  <th className="p-4">Client & Counsel</th>
                  <th className="p-4">Stage</th>
                  <th className="p-4">Status & Billing</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E4DD]">
                {filteredMatters.map(m => (
                  <tr key={m.id} onClick={() => onViewMatter(m)} className="hover:bg-[#FCFBF8] cursor-pointer transition group">
                    <td className="p-4">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.urgency === 'high' ? '#d4183d' : m.urgency === 'standard' ? '#5A7C96' : '#E6E4DD' }} />
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-medium text-[#2C2B29] mb-1">{m.title}</p>
                      <p className="text-xs text-[#8C8981] font-mono">{m.referenceCode}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-[#2C2B29]">{m.clientName}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-[#8C8981]">
                        <User className="w-3 h-3" /> Unassigned
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-medium text-[#2C2B29] capitalize px-2 py-1 rounded bg-[#F4F1EA]">{m.lifecycleStage.replace(/-/g, ' ')}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <StatusBadge status={m.operationalStatus} size="sm" />
                        {m.operationalStatus === 'blocked' && (
                          <span className="text-[10px] flex items-center gap-1 text-[#d4183d] font-medium"><AlertCircle className="w-3 h-3"/> Billing Hold</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-[#8C8981] hover:text-[#2C2B29] p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {matters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12">
                      <EmptyState 
                        icon={Briefcase} 
                        title="No matters yet" 
                        description="Get started by creating your first matter."
                        action={{ label: "New Matter", onClick: () => {} }}
                      />
                    </td>
                  </tr>
                ) : filteredMatters.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12">
                      <EmptyState 
                        icon={Search} 
                        title="No matters found" 
                        description="There are no matters matching your current search or filters."
                        action={{ label: "Clear Filters", onClick: () => { setSearchQuery(''); setFilters({ stage: null, urgency: null, status: null, clientId: null, counsel: null, billing: null }); } }}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
          {stages.map(stage => {
            const stageMatters = filteredMatters.filter(m => m.lifecycleStage === stage);
            return (
              <div key={stage} className="shrink-0 w-80 flex flex-col snap-start">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold text-[#2C2B29] uppercase tracking-wider">{stage.replace(/-/g, ' ')}</h3>
                  <span className="bg-[#E6E4DD] text-[#5A7C96] text-xs font-medium px-2 py-0.5 rounded-full">{stageMatters.length}</span>
                </div>
                <div className="bg-[#F9F8F6] border border-[#E6E4DD] rounded-xl p-3 flex-1 flex flex-col gap-3 min-h-[500px]">
                  {stageMatters.map(m => (
                    <div 
                      key={m.id} 
                      onClick={() => onViewMatter(m)}
                      className={`bg-white border p-3 rounded-lg shadow-sm cursor-pointer hover:border-[#C19A5B] transition-colors relative overflow-hidden ${
                        m.urgency === 'high' ? 'border-l-4 border-l-[#d4183d]' : 'border-[#E6E4DD]'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono text-[#8C8981]">{m.referenceCode}</span>
                        {m.urgency === 'high' && <AlertCircle className="w-3.5 h-3.5 text-[#d4183d]" />}
                      </div>
                      <p className="text-sm font-medium text-[#2C2B29] leading-tight mb-2">{m.title}</p>
                      <p className="text-xs text-[#8C8981] mb-3">{m.clientName}</p>
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#F4F1EA]">
                        <StatusBadge status={m.operationalStatus} size="sm" />
                        <div className="w-6 h-6 rounded-full bg-[#F4F1EA] border border-[#E6E4DD] flex items-center justify-center text-[9px] font-bold text-[#8C8981]" title="Unassigned">
                          ?
                        </div>
                      </div>
                    </div>
                  ))}
                  {stageMatters.length === 0 && (
                    <div className="text-center p-4 border-2 border-dashed border-[#E6E4DD] rounded-lg text-[#8C8981] text-xs mt-2">
                      Empty Queue
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'queue' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-[#FFF8F8] border border-[#FAD6D6] rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-[#d4183d] flex items-center gap-2 mb-4 text-sm">
              <AlertCircle className="w-4 h-4" /> Urgent / Blocked
            </h3>
            <div className="space-y-3">
              {filteredMatters.filter(m => m.urgency === 'high' || m.operationalStatus === 'blocked').map(m => (
                <div key={m.id} onClick={() => onViewMatter(m)} className="bg-white p-3 rounded-lg border border-[#FAD6D6] shadow-sm cursor-pointer hover:shadow-md transition">
                  <p className="text-sm font-medium text-[#2C2B29]">{m.title}</p>
                  <p className="text-xs text-[#8C8981] mt-1">{m.clientName}</p>
                  <div className="mt-2 flex gap-2">
                    <StatusBadge status={m.operationalStatus} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-[#F8FBFF] border border-[#D6E6FA] rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-[#5A7C96] flex items-center gap-2 mb-4 text-sm">
              <Clock className="w-4 h-4" /> Awaiting Client / Stale
            </h3>
            <div className="space-y-3">
              {filteredMatters.filter(m => m.operationalStatus === 'awaiting-client' || m.operationalStatus === 'stale').map(m => (
                <div key={m.id} onClick={() => onViewMatter(m)} className="bg-white p-3 rounded-lg border border-[#D6E6FA] shadow-sm cursor-pointer hover:shadow-md transition">
                  <p className="text-sm font-medium text-[#2C2B29]">{m.title}</p>
                  <p className="text-xs text-[#8C8981] mt-1">{m.clientName}</p>
                  <div className="mt-2 flex gap-2">
                    <StatusBadge status={m.operationalStatus} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#F9FFF8] border border-[#D6FAD9] rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-[#2A7E3B] flex items-center gap-2 mb-4 text-sm">
              <CheckCircle className="w-4 h-4" /> Awaiting Internal
            </h3>
            <div className="space-y-3">
              {filteredMatters.filter(m => m.operationalStatus === 'awaiting-internal' || m.operationalStatus === 'active').map(m => (
                <div key={m.id} onClick={() => onViewMatter(m)} className="bg-white p-3 rounded-lg border border-[#D6FAD9] shadow-sm cursor-pointer hover:shadow-md transition">
                  <p className="text-sm font-medium text-[#2C2B29]">{m.title}</p>
                  <p className="text-xs text-[#8C8981] mt-1">{m.clientName}</p>
                  <div className="mt-2 flex gap-2">
                    <StatusBadge status={m.operationalStatus} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
