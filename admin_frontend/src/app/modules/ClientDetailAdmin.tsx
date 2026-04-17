import React, { useState } from 'react';
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, Clock, 
  FileText, Folder, CreditCard, Shield, Activity as ActivityIcon,
  CheckCircle, AlertCircle, Edit2, User, Globe, MessageSquare, Briefcase, Plus, ChevronRight, Video, History, Download
} from 'lucide-react';
import { 
  formatCurrency, formatDate, formatDateTime,
  type PlatformUser, type Matter, type Invoice, type PlatformDocument, type PlatformEvent,
  type MessageThread, type AuditEntry
} from '../data/seedData';
import { StatusBadge, UrgencyDot } from '../components/dashboard/StatusBadge';
import { EmptyState } from './EmptyState';

interface ClientDetailAdminProps {
  client: PlatformUser;
  matters: Matter[];
  invoices: Invoice[];
  documents: PlatformDocument[];
  events: PlatformEvent[];
  threads?: MessageThread[];
  auditEntries?: AuditEntry[];
  onBack: () => void;
  onViewMatter: (matter: Matter) => void;
}

export const ClientDetailAdmin: React.FC<ClientDetailAdminProps> = ({
  client, matters, invoices, documents, events, threads = [], auditEntries = [], onBack, onViewMatter
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'matters' | 'billing' | 'documents' | 'messages' | 'meetings' | 'activity'>('overview');

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalDue = totalBilled - totalPaid;
  
  const clientThreads = threads.filter(t => t.clientId === client.id);
  const upcomingMeetings = events
    .filter((event) => event.status === 'upcoming')
    .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`));
  const clientAudit = auditEntries.slice(0, 5);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Directory
      </button>

      {/* Client Header (Original Design Restored) */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-medium">
            {client.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>{client.name}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5"/> {client.email}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5"/> {client.phone}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition">
            Edit Profile
          </button>
          <button className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition">
            New Matter
          </button>
        </div>
      </div>

      {/* Tabs (Original Design Restored + new tabs) */}
      <div className="flex gap-6 border-b border-gray-200 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Client 360 Overview' },
          { id: 'matters', label: `Matters (${matters.length})` },
          { id: 'messages', label: `Messages` },
          { id: 'documents', label: `Vault (${documents.length})` },
          { id: 'billing', label: `Billing & Ledger` },
          { id: 'meetings', label: `Meetings` },
          { id: 'activity', label: `Activity` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-sm font-medium transition border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="py-2">
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Original Active Matters */}
              <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Active Matters</h3>
                <div className="space-y-3">
                  {matters.filter(m => m.operationalStatus !== 'completed').map(m => (
                    <div key={m.id} onClick={() => onViewMatter(m)} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{m.title}</p>
                        <p className="text-xs text-gray-500">{m.referenceCode} • Stage: {m.lifecycleStage.replace(/-/g, ' ')}</p>
                      </div>
                      <StatusBadge status={m.operationalStatus} size="sm" />
                    </div>
                  ))}
                  {matters.filter(m => m.operationalStatus !== 'completed').length === 0 && (
                    <div className="py-8">
                      <EmptyState 
                        icon={Briefcase} 
                        title="No active matters" 
                        description="This client currently has no active matters."
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Added Recent Messages & Documents Grid below */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Messages */}
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                      <MessageSquare className="w-4 h-4 text-blue-500" /> Recent Messages
                    </h3>
                  </div>
                  <div className="p-4 flex-1">
                    <div className="space-y-4">
                      {clientThreads.slice(0, 3).map(thread => (
                        <div key={thread.id} className="flex gap-3 group cursor-pointer">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                            {thread.unreadCount > 0 ? <Mail className="w-4 h-4 text-red-500" /> : <MessageSquare className="w-4 h-4 text-gray-500" />}
                          </div>
                          <div>
                            <div className="flex justify-between items-start mb-0.5">
                              <p className={`text-sm ${thread.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{thread.matterTitle || 'General Support'}</p>
                              <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">{formatDate(thread.lastMessageAt)}</span>
                            </div>
                            <p className={`text-xs line-clamp-2 ${thread.unreadCount > 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                              {thread.lastMessage}
                            </p>
                          </div>
                        </div>
                      ))}
                      {clientThreads.length === 0 && (
                        <div className="py-6">
                          <EmptyState 
                            icon={MessageSquare} 
                            title="No messages" 
                            description="There are no recent messages for this client."
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
                    <button onClick={() => setActiveTab('messages')} className="text-xs font-medium text-blue-600 hover:text-blue-700">View all messages &rarr;</button>
                  </div>
                </div>

                {/* Recent Documents */}
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-amber-500" /> Recent Documents
                    </h3>
                  </div>
                  <div className="p-4 flex-1">
                    <div className="space-y-4">
                      {documents.slice(0, 3).map(doc => (
                        <div key={doc.id} className="flex gap-3 group cursor-pointer items-start">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                            <FileText className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">{doc.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                              <span>{formatDate(doc.uploadedAt)}</span>
                              <span>•</span>
                              <span className="uppercase">{doc.name.split('.').pop() || 'DOC'}</span>
                            </div>
                          </div>
                          <button className="p-1 text-gray-400 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {documents.length === 0 && (
                        <div className="py-6">
                          <EmptyState 
                            icon={FileText} 
                            title="No documents" 
                            description="There are no documents stored for this client."
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
                    <button onClick={() => setActiveTab('documents')} className="text-xs font-medium text-amber-600 hover:text-amber-700">Open Vault &rarr;</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Financial Snapshot, Meetings, Activity */}
            <div className="space-y-6">
              
              {/* Financial Snapshot */}
              <div className="bg-gray-900 text-white rounded-xl p-6 shadow-md">
                <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Financial Snapshot
                </h3>
                
                <div className="mb-6">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Outstanding</p>
                  <p className="text-3xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {formatCurrency(totalDue)}
                  </p>
                  {totalDue > 0 && (
                    <button onClick={() => setActiveTab('billing')} className="mt-3 px-4 py-2 text-xs font-medium bg-white text-gray-900 rounded hover:bg-gray-100 transition-colors shadow-sm w-full">
                      Send Payment Reminder
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-800 pt-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Billed</p>
                    <p className="font-medium text-gray-200">{formatCurrency(totalBilled)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Paid</p>
                    <p className="font-medium text-green-400">{formatCurrency(totalPaid)}</p>
                  </div>
                </div>
              </div>

              {/* Upcoming Meetings */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500" /> Upcoming Meetings
                </h3>
                <div className="space-y-3">
                  {upcomingMeetings.length > 0 ? upcomingMeetings.slice(0, 2).map(meeting => (
                    <div key={meeting.id} className="p-3 border border-gray-100 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <UrgencyDot urgency="standard" />
                        <span className="text-sm font-medium text-gray-900">{meeting.title}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDateTime(`${meeting.date}T${meeting.time}`)}</span>
                        <span className="flex items-center gap-1"><Video className="w-3 h-3" /> {meeting.mode}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg text-center">No upcoming meetings</p>
                  )}
                  <button className="w-full py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors mt-2">
                    Schedule Meeting
                  </button>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4 text-sm">
                  <History className="w-4 h-4 text-gray-500" /> Recent Activity
                </h3>
                <div className="relative before:absolute before:inset-0 before:ml-[9px] before:w-px before:bg-gray-200 space-y-4">
                  {clientAudit.map((entry, idx) => (
                    <div key={idx} className="relative flex gap-4">
                      <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-300 shrink-0 z-10" />
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-sm text-gray-900 font-medium">{entry.action.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{entry.details}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{formatDate(entry.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setActiveTab('activity')} className="mt-4 w-full text-center text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
                  View Full Timeline
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Placeholders for other tabs */}
        {activeTab !== 'overview' && (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Folder className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Workspace
            </h3>
            <p className="text-sm text-gray-500 max-w-md">
              This section is dedicated to {activeTab} for {client.name}.
            </p>
            <button onClick={() => setActiveTab('overview')} className="mt-6 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors">
              Return to Overview
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
