import React, { useState } from 'react';
import { 
  Search, Filter, ChevronDown, Check, User, Briefcase, Plus, MoreVertical,
  Clock, AlertCircle, MessageSquare, CreditCard, Activity, ArrowRight
} from 'lucide-react';
import { MATTERS, PLATFORM_USERS, formatCurrency, formatDate, type Matter } from '../data/seedData';
import { StatusBadge, UrgencyDot } from '../components/dashboard/StatusBadge';

export const MatterDesk = ({ 
  onSelectMatter 
}: { 
  onSelectMatter: (matter: Matter) => void 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'priority'>('list');

  const filteredMatters = MATTERS.filter(m => 
    !searchQuery || 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.referenceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getClientStatus = (clientId: string) => {
    return PLATFORM_USERS.find(u => u.id === clientId)?.accountStatus || 'unknown';
  };

  const renderListView = () => (
    <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-[#FCFBF8] text-[#8C8981] border-b border-[#E6E4DD]">
            <th className="font-medium px-4 py-3">Matter Details</th>
            <th className="font-medium px-4 py-3">Client</th>
            <th className="font-medium px-4 py-3">Stage & Status</th>
            <th className="font-medium px-4 py-3">Financials</th>
            <th className="font-medium px-4 py-3">Last Updated</th>
            <th className="font-medium px-4 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {filteredMatters.map(matter => (
            <tr 
              key={matter.id} 
              onClick={() => onSelectMatter(matter)}
              className="border-b border-[#F4F1EA] last:border-0 hover:bg-[#FCFBF8] transition cursor-pointer group"
            >
              <td className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <UrgencyDot urgency={matter.urgency} className="mt-1.5" />
                  <div>
                    <p className="font-medium text-[#2C2B29] group-hover:text-[#C19A5B] transition-colors">{matter.title}</p>
                    <p className="text-xs text-[#8C8981] font-mono mt-0.5">{matter.referenceCode}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <p className="text-[#2C2B29]">{matter.clientName}</p>
                <p className={`text-xs ${getClientStatus(matter.clientId) === 'active' ? 'text-[#5A7C96]' : 'text-[#d4183d]'}`}>
                  {getClientStatus(matter.clientId) === 'active' ? 'Portal Active' : 'Portal Inactive'}
                </p>
              </td>
              <td className="px-4 py-4">
                <div className="space-y-1">
                  <StatusBadge status={matter.operationalStatus} size="sm" />
                  <p className="text-xs text-[#8C8981] capitalize">{matter.lifecycleStage.replace(/-/g, ' ')}</p>
                </div>
              </td>
              <td className="px-4 py-4">
                <p className="text-[#2C2B29]">{formatCurrency(matter.totalFee)}</p>
                {matter.dueAmount > 0 ? (
                  <p className="text-xs font-medium text-[#d4183d]">{formatCurrency(matter.dueAmount)} due</p>
                ) : (
                  <p className="text-xs text-[#8C8981]">Paid in full</p>
                )}
              </td>
              <td className="px-4 py-4 text-[#8C8981] text-xs">
                {formatDate(matter.lastUpdatedAt)}
              </td>
              <td className="px-4 py-4">
                <button className="p-1.5 text-[#8C8981] hover:text-[#2C2B29] rounded hover:bg-[#E6E4DD] transition opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
          {filteredMatters.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-[#8C8981]">
                <Briefcase className="w-12 h-12 text-[#E6E4DD] mx-auto mb-3" />
                <p className="font-medium text-[#2C2B29]">No matters found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderBoardView = () => {
    const stages = ['intake', 'review', 'drafting', 'filing', 'closing'];
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
        {stages.map(stage => {
          const stageMatters = filteredMatters.filter(m => m.lifecycleStage === stage);
          return (
            <div key={stage} className="flex-1 min-w-[300px] bg-[#FCFBF8] border border-[#E6E4DD] rounded-xl p-4 flex flex-col h-[calc(100vh-250px)]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-[#2C2B29] uppercase tracking-wider text-xs">{stage.replace(/-/g, ' ')}</h3>
                <span className="text-xs font-semibold text-[#8C8981] bg-[#E6E4DD] px-2 py-0.5 rounded-full">{stageMatters.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {stageMatters.map(m => (
                  <div key={m.id} onClick={() => onSelectMatter(m)} className="bg-white border border-[#E6E4DD] rounded-lg p-4 shadow-sm hover:border-[#C19A5B] cursor-pointer transition group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono text-[#8C8981]">{m.referenceCode}</span>
                      <UrgencyDot urgency={m.urgency} />
                    </div>
                    <p className="font-medium text-[#2C2B29] text-sm leading-tight mb-2 group-hover:text-[#997A48]">{m.title}</p>
                    <p className="text-xs text-[#8C8981] mb-3">{m.clientName}</p>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#F4F1EA]">
                      <StatusBadge status={m.operationalStatus} size="sm" />
                      {m.dueAmount > 0 && <CreditCard className="w-3.5 h-3.5 text-[#d4183d]" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPriorityQueue = () => {
    const urgentMatters = filteredMatters.filter(m => m.urgency === 'high' || m.operationalStatus === 'blocked');
    const staleMatters = filteredMatters.filter(m => m.operationalStatus === 'pending'); // Mock stale
    
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#F5C2C7] rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-250px)]">
          <div className="bg-[#FDE8EC] p-4 border-b border-[#F5C2C7] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#d4183d]" />
              <h3 className="font-medium text-[#d4183d]">Action Required / Blocked</h3>
            </div>
            <span className="text-xs font-semibold text-[#d4183d] bg-white px-2 py-0.5 rounded-full">{urgentMatters.length}</span>
          </div>
          <div className="p-2 flex-1 overflow-y-auto space-y-2">
            {urgentMatters.map(m => (
              <div key={m.id} onClick={() => onSelectMatter(m)} className="p-3 hover:bg-[#FCFBF8] border border-transparent hover:border-[#E6E4DD] rounded-lg cursor-pointer transition flex items-start gap-3 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-[#2C2B29] truncate group-hover:text-[#d4183d]">{m.title}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FDE8EC] text-[#d4183d] border border-[#F5C2C7]">
                      {m.operationalStatus === 'blocked' ? 'Financially Blocked' : 'Urgent Timeline'}
                    </span>
                  </div>
                  <p className="text-xs text-[#8C8981] truncate">{m.clientName} • {m.lifecycleStage}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#A8A69F] group-hover:text-[#d4183d]" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#EAD2A8] rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-250px)]">
          <div className="bg-[#FDF8EF] p-4 border-b border-[#EAD2A8] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#C19A5B]" />
              <h3 className="font-medium text-[#997A48]">Stale / Waiting on Client</h3>
            </div>
            <span className="text-xs font-semibold text-[#997A48] bg-white px-2 py-0.5 rounded-full">{staleMatters.length}</span>
          </div>
          <div className="p-2 flex-1 overflow-y-auto space-y-2">
            {staleMatters.map(m => (
              <div key={m.id} onClick={() => onSelectMatter(m)} className="p-3 hover:bg-[#FCFBF8] border border-transparent hover:border-[#E6E4DD] rounded-lg cursor-pointer transition flex items-start gap-3 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-[#2C2B29] truncate group-hover:text-[#997A48]">{m.title}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FDF8EF] text-[#997A48] border border-[#EAD2A8]">
                      Inactive &gt; 7 days
                    </span>
                  </div>
                  <p className="text-xs text-[#8C8981] truncate">{m.clientName} • {m.lifecycleStage}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#A8A69F] group-hover:text-[#997A48]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-medium text-[#2C2B29]" style={{ fontFamily: "'Playfair Display', serif" }}>Matter Desk</h2>
          <p className="text-sm text-[#8C8981] mt-1">Operational workspace for all active engagements.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8981]" />
            <input 
              type="text" 
              placeholder="Search matters..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-[#E6E4DD] rounded-lg focus:outline-none focus:border-[#C19A5B] bg-white w-64 shadow-sm"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-[#E6E4DD] text-[#2C2B29] rounded-lg shadow-sm hover:bg-[#FCFBF8] transition">
            <Filter className="w-4 h-4 text-[#8C8981]" /> Filter
          </button>
          <div className="flex bg-white border border-[#E6E4DD] rounded-lg p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${viewMode === 'list' ? 'bg-[#F4F1EA] text-[#2C2B29]' : 'text-[#8C8981] hover:text-[#2C2B29]'}`}
            >
              List
            </button>
            <button 
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${viewMode === 'board' ? 'bg-[#F4F1EA] text-[#2C2B29]' : 'text-[#8C8981] hover:text-[#2C2B29]'}`}
            >
              Board
            </button>
            <button 
              onClick={() => setViewMode('priority')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${viewMode === 'priority' ? 'bg-[#F4F1EA] text-[#2C2B29]' : 'text-[#8C8981] hover:text-[#2C2B29]'}`}
            >
              Priority Queue
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm bg-[#2C2B29] text-[#F4F1EA] rounded-lg shadow-sm hover:bg-[#4A4946] transition">
            <Plus className="w-4 h-4" /> New Matter
          </button>
        </div>
      </div>

      {viewMode === 'list' && renderListView()}
      {viewMode === 'board' && renderBoardView()}
      {viewMode === 'priority' && renderPriorityQueue()}
    </div>
  );
};