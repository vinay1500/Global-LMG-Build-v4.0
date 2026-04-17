import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Inbox, Folder, CreditCard, MessageSquare, Users, UserCheck, FileText,
  Calendar as CalendarIcon, Shield, Settings, Search, Bell, Menu, Home, Plus, X, ChevronRight,
  ArrowRight, Clock, Video, Phone, MapPin, Send, Paperclip, Download, Upload, Eye, Edit2,
  Trash2, Check, CheckCircle, AlertCircle, Filter, MoreVertical, ExternalLink, ChevronDown,
  Link as LinkIcon, Package, DollarSign, FileUp, User, ArrowLeft, Columns3, List, BarChart3,
  Globe, Briefcase, Scale, Gavel, TrendingUp, Activity, History, Mail, LogOut, Command, CornerDownLeft, ArrowDown, ArrowUp
} from 'lucide-react';
import { StatusBadge, UrgencyDot } from '../components/dashboard/StatusBadge';
import { LifecycleStepper } from '../components/dashboard/LifecycleStepper';
import {
  PLATFORM_USERS, MATTERS, LEADS, PACKAGES, INVOICES, PAYMENTS, EVENTS, DOCUMENTS,
  MESSAGE_THREADS, CHAT_MESSAGES, ADVOCATES, STAFF_MEMBERS, AUDIT_ENTRIES,
  SERVICES, EXPERTISE_AREAS, LIFECYCLE_STAGES, PRICING_TIERS,
  formatCurrency, formatDate, formatDateTime, getServiceName, getUserById,
  type Matter, type Lead, type Invoice, type PlatformEvent, type PlatformDocument,
  type MessageThread, type Advocate, type StaffMember, type AuditEntry, type PlatformUser
} from '../data/seedData';
import { MatterDetailAdmin } from './MatterDetailAdmin';
import { ClientDetailAdmin } from './ClientDetailAdmin';
import { MatterDeskAdmin } from './MatterDeskAdmin';
import { DocumentsCenterAdmin } from './DocumentsCenterAdmin';
import { MessagesDeskAdmin } from './MessagesDeskAdmin';
import { MeetingsWorkspace } from './MeetingsWorkspace';
import { BillingWorkspace } from './BillingWorkspace';
import { NotificationsCenter } from './NotificationsCenter';
import { AuditExplorer } from './AuditExplorer';
import { ReportsWorkspace } from './ReportsWorkspace';
import { TasksWorkspace } from './TasksWorkspace';
import { EmptyState } from './EmptyState';
import { ClientDirectory } from './ClientDirectory';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend, Cell } from 'recharts';

const HighlightMatch = ({ text, highlight }: { text: string, highlight: string }) => {
  if (!highlight.trim()) return <>{text}</>;
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="bg-[#EAD2A8] text-[#2C2B29] font-medium">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

const ADMIN_TABS = [
  { id: 'command', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'requests', label: 'Requests', icon: Inbox },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'matters', label: 'Matters Desk', icon: Briefcase },
  { id: 'meetings', label: 'Meetings', icon: CalendarIcon },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'billing', label: 'Billing & Ledger', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'tasks', label: 'Tasks & Ops', icon: CheckCircle },
  { id: 'audit', label: 'Audit Log', icon: History },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);

  // Advanced Navigation with History Stack
  const [navHistory, setNavHistory] = useState<{tab: string; matterId: string | null; clientId: string | null; threadId: string | null}[]>([]);
  const [navState, setNavState] = useState({ tab: 'command', matterId: null as string | null, clientId: null as string | null, threadId: null as string | null });

  const activeTab = navState.tab;

  const navigateTo = (tab: string, params?: { matterId?: string | null, clientId?: string | null, threadId?: string | null }) => {
    setNavHistory(prev => [...prev, navState]);
    setNavState(current => {
      const isNewTab = tab !== current.tab;
      return {
        tab,
        matterId: params?.matterId !== undefined ? params.matterId : (isNewTab ? null : current.matterId),
        clientId: params?.clientId !== undefined ? params.clientId : (isNewTab ? null : current.clientId),
        threadId: params?.threadId !== undefined ? params.threadId : (isNewTab ? null : current.threadId),
      };
    });
  };

  const goBack = () => {
    if (navHistory.length === 0) return;
    const prev = navHistory[navHistory.length - 1];
    setNavHistory(h => h.slice(0, -1));
    setNavState(prev);
  };

  const resetToTab = (tab: string) => {
    setNavHistory([]);
    setNavState({ tab, matterId: null, clientId: null, threadId: null });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isSearchModalOpen) {
        setIsSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen]);

  const [mattersList, setMattersList] = useState(MATTERS);
  
  const selectedMatter = navState.matterId ? mattersList.find(m => m.id === navState.matterId) || null : null;
  const selectedClient = navState.clientId ? PLATFORM_USERS.find(c => c.id === navState.clientId) || null : null;
  const selectedThread = navState.threadId;

  // Helpers for backward compatibility with existing code
  const setSelectedMatter = (m: Matter | null) => {
    if (m) navigateTo(navState.tab, { matterId: m.id });
    else setNavState(prev => ({ ...prev, matterId: null }));
  };
  const setSelectedClient = (c: PlatformUser | null) => {
    if (c) navigateTo(navState.tab, { clientId: c.id });
    else setNavState(prev => ({ ...prev, clientId: null }));
  };
  const setSelectedThread = (tId: string | null) => {
    if (tId) navigateTo(navState.tab, { threadId: tId });
    else setNavState(prev => ({ ...prev, threadId: null }));
  };
  const setActiveTab = (tab: string) => navigateTo(tab);

  const activeMatters = mattersList.filter(m => m.operationalStatus !== 'completed' && m.operationalStatus !== 'archived');
  const pendingInvoices = INVOICES.filter(i => i.status === 'pending' || i.status === 'overdue');
  const unreadThreads = MESSAGE_THREADS.filter(t => t.unreadCount > 0);

  const filteredMatters = useMemo(() => {
    return mattersList.filter(m => {
      const matchSearch = !searchQuery || 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.referenceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [mattersList, searchQuery]);

  const handleUpdateFee = (matterId: string, newFee: number) => {
    setMattersList(prev => prev.map(m => m.id === matterId ? { ...m, totalFee: newFee, dueAmount: newFee - m.paidAmount } : m));
    if (selectedMatter && selectedMatter.id === matterId) {
      setSelectedMatter(prev => prev ? { ...prev, totalFee: newFee, dueAmount: newFee - prev.paidAmount } : null);
    }
  };

  const renderDashboard = () => {
    // Generate Mock Data for charts
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

    const staleMatters = mattersList.filter(m => m.operationalStatus === 'pending' || m.operationalStatus === 'blocked').slice(0, 4);
    const criticalActivity = AUDIT_ENTRIES.slice(0, 5);

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium text-[#2C2B29]" style={{ fontFamily: "'Playfair Display', serif" }}>Control Tower</h2>
            <p className="text-sm text-[#8C8981] mt-1">Operational overview and actionable queues.</p>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-sm bg-white border border-[#E6E4DD] text-[#2C2B29] rounded-md shadow-sm hover:bg-[#FCFBF8] transition flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#8C8981]" /> Last 30 Days
            </button>
            <button className="px-3 py-1.5 text-sm bg-[#2C2B29] text-[#F4F1EA] rounded-md shadow-sm hover:bg-[#4A4946] transition flex items-center gap-2">
              <Download className="w-4 h-4" /> Export Report
            </button>
          </div>
        </div>

        {/* Alert Banners */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-[#FDE8EC] border border-[#F5C2C7] p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#d4183d] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#d4183d]">3 Matters Stale (14+ Days)</p>
              <p className="text-xs text-[#d4183d]/80 mt-1">Awaiting internal review or client signatures.</p>
              <button onClick={() => setActiveTab('matters')} className="text-xs font-medium text-[#d4183d] mt-2 hover:underline">Review matters &rarr;</button>
            </div>
          </div>
          <div className="bg-[#FDF8EF] border border-[#EAD2A8] p-4 rounded-xl flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#C19A5B] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#997A48]">{pendingInvoices.length} Overdue Invoices</p>
              <p className="text-xs text-[#997A48]/80 mt-1">Total outstanding: {formatCurrency(pendingInvoices.reduce((a,b)=>a+b.totalAmount,0))}</p>
              <button onClick={() => setActiveTab('billing')} className="text-xs font-medium text-[#997A48] mt-2 hover:underline">Send reminders &rarr;</button>
            </div>
          </div>
          <div className="bg-[#EFF3F6] border border-[#D3DFE8] p-4 rounded-xl flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-[#5A7C96] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#46647A]">{unreadThreads.length} Unread Messages</p>
              <p className="text-xs text-[#46647A]/80 mt-1">Clients waiting on your reply.</p>
              <button onClick={() => setActiveTab('messages')} className="text-xs font-medium text-[#46647A] mt-2 hover:underline">Open desk &rarr;</button>
            </div>
          </div>
        </div>

        {/* Hero KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Active Matters', value: activeMatters.length, trend: '+12%', trendUp: true },
            { label: 'Client Conversion', value: '64%', trend: '+4%', trendUp: true },
            { label: 'Doc Backlog', value: DOCUMENTS.filter(d=>d.status==='pending').length || 14, trend: '-2%', trendUp: false },
            { label: 'Pending Revenue', value: formatCurrency(pendingInvoices.reduce((a,b)=>a+b.totalAmount,0)), trend: '+18%', trendUp: true },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-[#E6E4DD] p-5 rounded-xl shadow-sm group hover:border-[#C19A5B] transition cursor-pointer">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm text-[#8C8981] font-medium">{stat.label}</p>
                <ArrowRight className="w-4 h-4 text-[#E6E4DD] group-hover:text-[#C19A5B] transition-colors" />
              </div>
              <p className="text-3xl font-semibold text-[#2C2B29] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{stat.value}</p>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${stat.trendUp ? 'bg-[#EFF3F6] text-[#5A7C96]' : 'bg-[#FDF8EF] text-[#C19A5B]'}`}>
                  {stat.trend}
                </span>
                <span className="text-xs text-[#A8A69F]">vs last mo</span>
              </div>
            </div>
          ))}
        </div>

        {/* Analytical Grids */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Active Matters By Stage */}
          <div className="lg:col-span-2 bg-white border border-[#E6E4DD] rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium text-[#2C2B29]">Active Matters by Stage</h3>
              <button className="text-xs text-[#8C8981] hover:text-[#2C2B29]">View Funnel &rarr;</button>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E4DD" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C8981', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C8981', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#F4F1EA' }}
                    contentStyle={{ backgroundColor: '#2C2B29', color: '#FCFBF8', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#C19A5B' }}
                  />
                  <Bar dataKey="value" fill="#2C2B29" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Priority Queue (Stale / Unread) */}
          <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm flex flex-col">
            <div className="p-5 border-b border-[#E6E4DD] flex items-center justify-between">
              <h3 className="font-medium text-[#2C2B29]">Priority Queue</h3>
            </div>
            <div className="p-2 flex-1 overflow-y-auto max-h-[250px]">
              {staleMatters.map(m => (
                <div key={m.id} onClick={() => { navigateTo('matters', { matterId: m.id }); }} className="p-3 hover:bg-[#FCFBF8] rounded-lg cursor-pointer transition flex items-start gap-3 group">
                  <div className="w-2 h-2 rounded-full bg-[#d4183d] mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2C2B29] truncate">{m.title}</p>
                    <p className="text-xs text-[#8C8981] truncate">{m.clientName}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A8A69F] group-hover:text-[#2C2B29]" />
                </div>
              ))}
              {unreadThreads.slice(0, 2).map(t => (
                <div key={t.id} onClick={() => setActiveTab('messages')} className="p-3 hover:bg-[#FCFBF8] rounded-lg cursor-pointer transition flex items-start gap-3 group">
                  <div className="w-2 h-2 rounded-full bg-[#5A7C96] mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2C2B29] truncate">{t.matterTitle || t.clientName}</p>
                    <p className="text-xs text-[#8C8981] truncate">Unread client message</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A8A69F] group-hover:text-[#2C2B29]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Third Row: Analytics & Operations */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Revenue Trend */}
          <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm p-5">
            <h3 className="font-medium text-[#2C2B29] mb-6">Revenue Trend</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                  <defs key="defs">
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C19A5B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#C19A5B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E4DD" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8C8981', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C8981', fontSize: 12 }} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#2C2B29', color: '#FCFBF8', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#C19A5B' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#C19A5B" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Invoice Aging */}
          <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm p-5">
            <h3 className="font-medium text-[#2C2B29] mb-6">Invoice Aging</h3>
            <div className="space-y-4">
              {agingData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-[#8C8981] font-medium">{item.bucket}</div>
                  <div className="flex-1 h-2 bg-[#F4F1EA] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${idx === 3 ? 'bg-[#d4183d]' : idx === 2 ? 'bg-[#C19A5B]' : 'bg-[#5A7C96]'}`} 
                      style={{ width: `${Math.max(10, (item.amount / 4500) * 100)}%` }} 
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-medium text-[#2C2B29]">{formatCurrency(item.amount)}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-[#E6E4DD]">
              <button onClick={() => setActiveTab('billing')} className="text-sm font-medium text-[#2C2B29] hover:text-[#C19A5B] flex items-center gap-2">
                Open Ledger <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Critical Activity */}
          <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm flex flex-col">
            <div className="p-5 border-b border-[#E6E4DD]">
              <h3 className="font-medium text-[#2C2B29]">Audit & Activity</h3>
            </div>
            <div className="p-5 flex-1 space-y-5 overflow-y-auto max-h-[250px]">
              {criticalActivity.map((log, idx) => (
                <div key={idx} className="flex gap-4 relative">
                  {idx !== criticalActivity.length - 1 && (
                    <div className="absolute top-6 left-2 w-px h-[calc(100%-8px)] bg-[#E6E4DD]" />
                  )}
                  <div className="w-4 h-4 rounded-full border-2 border-[#C19A5B] bg-white z-10 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-sm text-[#2C2B29] font-medium leading-tight">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-[#8C8981] mt-1">{log.userName} • {formatDate(log.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const globalSearchResults = useMemo(() => {
    if (!globalSearchQuery.trim()) return [];
    
    const query = globalSearchQuery.toLowerCase();
    const results = [];

    let typeFilter = null;
    let textQuery = query;
    if (query.includes('type:')) {
      const match = query.match(/type:(\w+)/);
      if (match) {
        typeFilter = match[1];
        textQuery = query.replace(/type:\w+/, '').trim();
      }
    }
    const isActiveFilter = query.includes('is:active');
    if (isActiveFilter) {
      textQuery = textQuery.replace('is:active', '').trim();
    }

    if (!typeFilter || typeFilter === 'client') {
      PLATFORM_USERS.filter(u => u.lifecycle === 'client').forEach(u => {
        if (!textQuery || u.name.toLowerCase().includes(textQuery) || u.email.toLowerCase().includes(textQuery)) {
          if (isActiveFilter && u.accountStatus !== 'active') return;
          results.push({ id: u.id, type: 'Client', title: u.name, subtitle: u.email, icon: User, data: u });
        }
      });
    }

    if (!typeFilter || typeFilter === 'matter') {
      MATTERS.forEach(m => {
        if (!textQuery || m.title.toLowerCase().includes(textQuery) || m.referenceCode.toLowerCase().includes(textQuery)) {
          if (isActiveFilter && m.operationalStatus !== 'active') return;
          results.push({ id: m.id, type: 'Matter', title: m.title, subtitle: m.referenceCode + ' • ' + m.clientName, icon: Briefcase, data: m });
        }
      });
    }

    if (!typeFilter || typeFilter === 'document') {
      DOCUMENTS.forEach(d => {
        if (!textQuery || d.name.toLowerCase().includes(textQuery)) {
          if (isActiveFilter && d.status !== 'approved') return;
          results.push({ id: d.id, type: 'Document', title: d.name, subtitle: d.clientName + (d.matterTitle ? ` • ${d.matterTitle}` : ''), icon: FileText, data: d });
        }
      });
    }

    if (!typeFilter || typeFilter === 'message') {
      MESSAGE_THREADS.forEach(t => {
        if (!textQuery || t.clientName.toLowerCase().includes(textQuery) || t.matterTitle?.toLowerCase().includes(textQuery)) {
          if (isActiveFilter && t.status !== 'open') return;
          results.push({ id: t.id, type: 'Message', title: t.clientName, subtitle: t.matterTitle || 'General inquiry', icon: MessageSquare, data: t });
        }
      });
    }
    
    return results.slice(0, 15);
  }, [globalSearchQuery]);

  const handleGlobalSearchSelect = (result: any) => {
    setIsSearchModalOpen(false);
    setGlobalSearchQuery('');
    setSearchSelectedIndex(0);

    if (result.type === 'Client') {
      setActiveTab('clients');
    } else if (result.type === 'Matter') {
      setSelectedMatter(result.data);
      setActiveTab('matters');
    } else if (result.type === 'Document') {
      setActiveTab('documents');
    } else if (result.type === 'Message') {
      setActiveTab('messages');
      setSelectedThread(result.id);
    }
  };

  const renderSearchModal = () => {
    if (!isSearchModalOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 bg-[#2C2B29]/60 backdrop-blur-sm"
          onClick={() => setIsSearchModalOpen(false)}
        />
        <motion.div 
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-[#E6E4DD]"
        >
          <div className="flex items-center px-4 py-3 border-b border-[#E6E4DD]">
            <Search className="w-5 h-5 text-[#8C8981] mr-3" />
            <input 
              autoFocus
              type="text"
              placeholder="Search clients, matters, documents... (Try 'is:active' or 'type:invoice')"
              className="flex-1 bg-transparent border-none outline-none text-lg text-[#2C2B29] placeholder:text-[#A8A69F]"
              value={globalSearchQuery}
              onChange={e => {
                setGlobalSearchQuery(e.target.value);
                setSearchSelectedIndex(0);
              }}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSearchSelectedIndex(prev => Math.min(prev + 1, globalSearchResults.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSearchSelectedIndex(prev => Math.max(prev - 1, 0));
                } else if (e.key === 'Enter' && globalSearchResults.length > 0) {
                  e.preventDefault();
                  handleGlobalSearchSelect(globalSearchResults[searchSelectedIndex]);
                }
              }}
            />
            <span className="text-xs text-[#8C8981] bg-[#F4F1EA] px-2 py-1 rounded ml-2">ESC</span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {!globalSearchQuery.trim() ? (
              <div className="p-4">
                <h4 className="text-xs font-semibold text-[#8C8981] uppercase tracking-wider mb-2">Suggestions</h4>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setGlobalSearchQuery('type:client ')} className="text-xs bg-[#F4F1EA] hover:bg-[#E6E4DD] text-[#2C2B29] px-2.5 py-1.5 rounded transition">type:client</button>
                  <button onClick={() => setGlobalSearchQuery('type:matter ')} className="text-xs bg-[#F4F1EA] hover:bg-[#E6E4DD] text-[#2C2B29] px-2.5 py-1.5 rounded transition">type:matter</button>
                  <button onClick={() => setGlobalSearchQuery('type:document ')} className="text-xs bg-[#F4F1EA] hover:bg-[#E6E4DD] text-[#2C2B29] px-2.5 py-1.5 rounded transition">type:document</button>
                  <button onClick={() => setGlobalSearchQuery('is:active ')} className="text-xs bg-[#F4F1EA] hover:bg-[#E6E4DD] text-[#2C2B29] px-2.5 py-1.5 rounded transition">is:active</button>
                </div>
              </div>
            ) : globalSearchResults.length === 0 ? (
              <div className="py-4">
                <EmptyState 
                  icon={Search} 
                  title="No results found" 
                  description={`We couldn't find anything matching "${globalSearchQuery}". Try using different keywords or checking for typos.`}
                  action={{ label: "Clear Search", onClick: () => setGlobalSearchQuery('') }}
                />
              </div>
            ) : (
              <div className="p-2">
                {globalSearchResults.map((result, idx) => (
                  <div 
                    key={idx}
                    onMouseEnter={() => setSearchSelectedIndex(idx)}
                    onClick={() => handleGlobalSearchSelect(result)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${idx === searchSelectedIndex ? 'bg-[#FCFBF8] border border-[#C19A5B]' : 'border border-transparent hover:bg-[#F4F1EA]'}`}
                  >
                    <div className="w-8 h-8 rounded-md bg-[#F4F1EA] flex items-center justify-center text-[#5A7C96]">
                      <result.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#2C2B29] truncate">{result.title}</p>
                      <p className="text-xs text-[#8C8981] truncate">{result.subtitle}</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-[#A8A69F] tracking-wider">{result.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-[#F4F1EA] px-4 py-2 border-t border-[#E6E4DD] flex items-center justify-between text-xs text-[#8C8981]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Command className="w-3 h-3" /><ArrowDown className="w-3 h-3" /><ArrowUp className="w-3 h-3" /> to navigate</span>
              <span className="flex items-center gap-1"><CornerDownLeft className="w-3 h-3" /> to select</span>
            </div>
            <span>Results: {globalSearchResults.length}</span>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderContent = () => {
    return (
      <div className="h-full flex flex-col min-h-0 w-full relative">
        <div className={`absolute inset-0 z-20 bg-[#FCFBF8] ${selectedMatter ? 'block overflow-y-auto' : 'hidden'}`}>
          {selectedMatter && (
            <MatterDetailAdmin 
              matter={selectedMatter}
              onBack={goBack}
              onChat={(threadId) => navigateTo('messages', { threadId, matterId: null })}
              myInvoices={INVOICES.filter(i => i.matterId === selectedMatter.id)}
              myDocs={DOCUMENTS.filter(d => d.matterId === selectedMatter.id)}
              myEvents={EVENTS.filter(e => e.matterId === selectedMatter.id)}
              myThreads={MESSAGE_THREADS.filter(t => t.matterId === selectedMatter.id)}
              onUpdateFee={handleUpdateFee}
            />
          )}
        </div>

        <div className={`absolute inset-0 z-20 bg-[#FCFBF8] ${selectedClient ? 'block overflow-y-auto' : 'hidden'}`}>
          {selectedClient && (
            <ClientDetailAdmin 
              client={selectedClient}
              matters={mattersList.filter(m => m.clientId === selectedClient.id)}
              invoices={INVOICES.filter(i => i.clientId === selectedClient.id)}
              documents={DOCUMENTS.filter(d => d.clientId === selectedClient.id)}
              events={EVENTS.filter(e => e.clientId === selectedClient.id)}
              onBack={goBack}
              onViewMatter={(m) => navigateTo('matters', { matterId: m.id, clientId: null })}
            />
          )}
        </div>

        <div className={`absolute inset-0 ${(!selectedMatter && !selectedClient) ? 'block overflow-y-auto' : 'hidden'}`}>
          <div className={activeTab === 'command' ? 'block' : 'hidden'}>
            {renderDashboard()}
          </div>
          <div className={activeTab === 'matters' ? 'block' : 'hidden'}>
            <MatterDeskAdmin matters={mattersList} onViewMatter={(m) => navigateTo('matters', { matterId: m.id })} />
          </div>
          <div className={activeTab === 'clients' ? 'block h-full' : 'hidden'}>
            <ClientDirectory onSelectClient={(c) => navigateTo('clients', { clientId: c.id })} />
          </div>
          <div className={activeTab === 'billing' ? 'block' : 'hidden'}>
            <BillingWorkspace />
          </div>
          <div className={activeTab === 'messages' ? 'block' : 'hidden'}>
            <MessagesDeskAdmin searchQuery={searchQuery} />
          </div>
          <div className={activeTab === 'documents' ? 'block' : 'hidden'}>
            <DocumentsCenterAdmin documents={DOCUMENTS} searchQuery={searchQuery} />
          </div>
          <div className={activeTab === 'meetings' ? 'block' : 'hidden'}>
            <MeetingsWorkspace />
          </div>
          <div className={activeTab === 'notifications' ? 'block' : 'hidden'}>
            <NotificationsCenter />
          </div>
          <div className={activeTab === 'audit' ? 'block' : 'hidden'}>
            <AuditExplorer />
          </div>
          <div className={activeTab === 'reports' ? 'block' : 'hidden'}>
            <ReportsWorkspace />
          </div>
          <div className={activeTab === 'tasks' ? 'block' : 'hidden'}>
            <TasksWorkspace />
          </div>
          {(activeTab === 'requests' || activeTab === 'settings') && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-[#8C8981]">
              <div className="w-16 h-16 bg-[#F4F1EA] rounded-full flex items-center justify-center mb-4 border border-[#E6E4DD]">
                <Settings className="w-8 h-8 text-[#A8A69F]" />
              </div>
              <h2 className="text-xl font-medium text-[#2C2B29] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Under Construction</h2>
              <p className="text-sm">This module is currently being redesigned.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-[#2C2B29] font-sans selection:bg-[#2C2B29] selection:text-[#FCFBF8]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#F4F1EA] border-b border-[#E6E4DD] h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 -ml-2 text-[#8C8981] hover:text-[#2C2B29] hover:bg-[#E6E4DD] rounded-lg transition">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#2C2B29] rounded flex items-center justify-center shadow-sm">
              <Scale className="w-4.5 h-4.5 text-[#C19A5B]" />
            </div>
            <span className="font-bold text-xl tracking-tight text-[#2C2B29]" style={{ fontFamily: "'Playfair Display', serif" }}>LegalConnect</span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 bg-[#E6E4DD] text-[#4A4946] text-[10px] font-bold uppercase tracking-widest rounded">Admin</span>
          </div>
        </div>

        <div className="flex-1 max-w-xl mx-8 hidden md:block">
          <button 
            onClick={() => setIsSearchModalOpen(true)}
            className="relative w-full flex items-center text-left"
          >
            <Search className="w-4 h-4 text-[#8C8981] absolute left-3 top-1/2 -translate-y-1/2" />
            <div className="pl-9 pr-4 py-2 text-sm bg-white border border-[#E6E4DD] rounded-lg w-full text-[#A8A69F] hover:border-[#C19A5B] transition-colors cursor-text shadow-sm">
              Global search clients, matters, documents...
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
               <span className="text-[10px] text-[#A8A69F] border border-[#E6E4DD] rounded px-1.5 py-0.5 bg-[#FCFBF8]">⌘K</span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <button 
            onClick={() => setIsSearchModalOpen(true)}
            className="md:hidden p-2 text-[#8C8981] hover:text-[#2C2B29] hover:bg-[#E6E4DD] rounded-full transition"
          >
            <Search className="w-5 h-5" />
          </button>
          <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#2C2B29] bg-white border border-[#E6E4DD] rounded-lg hover:bg-[#FCFBF8] transition shadow-sm">
            <Plus className="w-4 h-4" /> New Action
          </button>
          <div className="h-6 w-px bg-[#E6E4DD] hidden sm:block" />
          <button className="p-2 text-[#8C8981] hover:text-[#2C2B29] hover:bg-[#E6E4DD] rounded-full transition relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C19A5B] rounded-full border-2 border-[#F4F1EA]" />
          </button>
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition">
            <div className="w-8 h-8 rounded-full bg-[#2C2B29] flex items-center justify-center text-[#F4F1EA] shadow-sm">
              <Shield className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-[#2C2B29]/20 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-16 left-0 h-[calc(100vh-64px)] w-64 bg-[#F4F1EA] border-r border-[#E6E4DD] z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
            <div>
              <h4 className="text-[10px] font-bold text-[#A8A69F] uppercase tracking-widest mb-3 px-3">Main Navigation</h4>
              <nav className="space-y-1">
                {ADMIN_TABS.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id && !selectedMatter;
                  return (
                    <button 
                      key={tab.id} 
                      onClick={() => { setActiveTab(tab.id); setSelectedMatter(null); setSidebarOpen(false); }} 
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-[#FCFBF8] text-[#2C2B29] shadow-sm border border-[#E6E4DD]' : 'text-[#8C8981] hover:bg-[#E6E4DD]/50 hover:text-[#2C2B29] border border-transparent'}`}
                    >
                      <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-[#C19A5B]' : 'text-[#A8A69F]'}`} />
                      {tab.label}
                      {tab.id === 'messages' && unreadThreads.length > 0 && (
                        <span className={`ml-auto w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-[#C19A5B] text-white' : 'bg-[#E6E4DD] text-[#8C8981]'}`}>
                          {unreadThreads.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
          
          <div className="p-4 border-t border-[#E6E4DD]">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#8C8981] hover:bg-[#FDF8EF] hover:text-[#C19A5B] transition">
              <LogOut className="w-4.5 h-4.5 text-[#A8A69F] group-hover:text-[#C19A5B]" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Breadcrumbs / Page Header Area (Optional, depends on view) */}
          <div className="h-12 bg-[#FCFBF8] border-b border-[#E6E4DD] flex items-center justify-between px-4 sm:px-6 lg:px-8 hidden md:flex">
            <div className="flex items-center gap-2 text-sm text-[#8C8981]">
              <Home className="w-3.5 h-3.5" />
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-medium text-[#2C2B29]">
                 {selectedMatter ? 'Matter Details' : ADMIN_TABS.find(t => t.id === activeTab)?.label || 'Dashboard'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                className={`p-1.5 rounded-md transition ${rightPanelOpen ? 'bg-[#E6E4DD] text-[#2C2B29]' : 'text-[#8C8981] hover:text-[#2C2B29] hover:bg-[#E6E4DD]/50'}`}
                title="Toggle Context Panel"
              >
                <Columns3 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex flex-1 min-h-0 overflow-hidden relative">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full max-w-[1400px] mx-auto">
              {renderContent()}
            </div>
            
            {/* Right Contextual Panel */}
            <AnimatePresence>
              {rightPanelOpen && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setRightPanelOpen(false)}
                    className="fixed inset-0 bg-[#2C2B29]/20 backdrop-blur-sm z-40 xl:hidden"
                  />
                  <motion.aside 
                    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed xl:static top-0 right-0 h-full w-80 bg-[#FCFBF8] border-l border-[#E6E4DD] overflow-y-auto z-50 xl:z-0 shadow-[-4px_0_24px_rgba(0,0,0,0.08)] xl:shadow-[-4px_0_12px_rgba(0,0,0,0.02)]"
                  >
                    <div className="p-5 mt-16 xl:mt-0">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-medium text-[#2C2B29]">Context & Quick Links</h3>
                        <button onClick={() => setRightPanelOpen(false)} className="text-[#8C8981] hover:text-[#2C2B29] p-1 rounded-md hover:bg-[#E6E4DD] transition"><X className="w-4 h-4" /></button>
                      </div>
                      
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-xs font-bold text-[#A8A69F] uppercase tracking-widest mb-3">Recent Activity</h4>
                          <div className="space-y-3">
                            <div className="flex gap-3">
                              <div className="w-2 h-2 rounded-full bg-[#C19A5B] mt-1.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm text-[#2C2B29]">New document uploaded</p>
                                <p className="text-xs text-[#8C8981]">By Client A • 2m ago</p>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <div className="w-2 h-2 rounded-full bg-[#5A7C96] mt-1.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm text-[#2C2B29]">Message received</p>
                                <p className="text-xs text-[#8C8981]">By Attorney B • 15m ago</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-xs font-bold text-[#A8A69F] uppercase tracking-widest mb-3">Quick Actions</h4>
                          <div className="space-y-2 text-sm text-[#5A7C96]">
                            <button className="flex items-center gap-2 w-full hover:underline"><LinkIcon className="w-3.5 h-3.5" /> Send Intake Form</button>
                            <button className="flex items-center gap-2 w-full hover:underline"><FileText className="w-3.5 h-3.5" /> Generate Report</button>
                            <button className="flex items-center gap-2 w-full hover:underline"><Mail className="w-3.5 h-3.5" /> Email Client</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.aside>
                </>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
      <AnimatePresence>
        {renderSearchModal()}
      </AnimatePresence>
    </div>
  );
};
