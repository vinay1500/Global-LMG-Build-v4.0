import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Command, CornerDownLeft, ArrowDown, ArrowUp, X, History,
  User, Briefcase, FileText, MessageSquare, CreditCard, Inbox, Check, ChevronRight,
  Filter, Star, Calendar, Mail, Phone, MapPin, Tag, Shield, Download, FileUp, Scale,
  AlertCircle, ChevronDown, Clock
} from 'lucide-react';
import {
  PLATFORM_USERS, MATTERS, DOCUMENTS, MESSAGE_THREADS, INVOICES, LEADS,
  formatCurrency, formatDate, formatDateTime
} from '../data/seedData';
import { StatusBadge, UrgencyDot } from '../components/dashboard/StatusBadge';
import { EmptyState } from './EmptyState';

interface GlobalFinderProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: any) => void;
}

const RECENT_SEARCHES = [
  "Acme Corp Litigation",
  "type:invoice status:overdue",
  "John Smith",
  "Q3 Tax Documents"
];

const SAVED_VIEWS = [
  { name: "My Active Matters", query: "type:matter is:active" },
  { name: "Unread Client Messages", query: "type:message is:unread" },
  { name: "Overdue Invoices >$5k", query: "type:invoice status:overdue min:5000" },
  { name: "Pending Onboarding", query: "type:client status:pending" }
];

export const GlobalFinder = ({ isOpen, onClose, onSelect }: GlobalFinderProps) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const results = useMemo(() => {
    if (!query.trim() && activeFilter === 'all') {
      // Show some default recent items if empty
      const items: any[] = [];
      MATTERS.slice(0, 3).forEach(m => items.push({ id: m.id, type: 'matter', icon: Briefcase, title: m.title, subtitle: `${m.referenceCode} • ${m.clientName}`, status: m.operationalStatus, statusType: m.operationalStatus === 'active' ? 'primary' : 'neutral', meta: 'Matter', data: m }));
      INVOICES.filter(i => i.status === 'overdue').slice(0, 2).forEach(i => items.push({ id: i.id, type: 'invoice', icon: CreditCard, title: `${i.invoiceNumber} - $${(i.amount/100).toLocaleString()}`, subtitle: `${i.clientName} • Overdue`, status: i.status, statusType: 'error', meta: 'Invoice', data: i }));
      return items;
    }

    const lowerQuery = query.toLowerCase();
    let textQuery = lowerQuery;
    let typeFilter = activeFilter === 'all' ? null : activeFilter;

    // Parse query for tokens
    if (lowerQuery.includes('type:')) {
      const match = lowerQuery.match(/type:(\w+)/);
      if (match) {
        typeFilter = match[1];
        textQuery = textQuery.replace(/type:\w+/, '').trim();
      }
    }

    const items: any[] = [];

    // Clients
    if (!typeFilter || typeFilter === 'client') {
      PLATFORM_USERS.filter(u => u.lifecycle === 'client').forEach(u => {
        if (!textQuery || u.name.toLowerCase().includes(textQuery) || u.email.toLowerCase().includes(textQuery)) {
          items.push({
            id: u.id, type: 'client', icon: User,
            title: u.name, subtitle: u.email,
            status: u.accountStatus, statusType: u.accountStatus === 'active' ? 'success' : 'warning',
            meta: 'Client',
            data: u
          });
        }
      });
    }

    // Matters
    if (!typeFilter || typeFilter === 'matter') {
      MATTERS.forEach(m => {
        if (!textQuery || m.title.toLowerCase().includes(textQuery) || m.referenceCode.toLowerCase().includes(textQuery) || m.clientName.toLowerCase().includes(textQuery)) {
          items.push({
            id: m.id, type: 'matter', icon: Briefcase,
            title: m.title, subtitle: `${m.referenceCode} • ${m.clientName}`,
            status: m.operationalStatus, statusType: m.operationalStatus === 'active' ? 'primary' : 'neutral',
            meta: 'Matter',
            data: m
          });
        }
      });
    }

    // Documents
    if (!typeFilter || typeFilter === 'document') {
      DOCUMENTS.forEach(d => {
        if (!textQuery || d.name.toLowerCase().includes(textQuery) || d.clientName.toLowerCase().includes(textQuery)) {
          items.push({
            id: d.id, type: 'document', icon: FileText,
            title: d.name, subtitle: `${d.clientName} ${d.matterTitle ? `• ${d.matterTitle}` : ''}`,
            status: d.status, statusType: d.status === 'approved' ? 'success' : d.status === 'needs_review' ? 'warning' : 'neutral',
            meta: 'Document',
            data: d
          });
        }
      });
    }

    // Invoices
    if (!typeFilter || typeFilter === 'invoice') {
      INVOICES.forEach(i => {
        if (!textQuery || i.clientName.toLowerCase().includes(textQuery) || i.invoiceNumber.toLowerCase().includes(textQuery)) {
          items.push({
            id: i.id, type: 'invoice', icon: CreditCard,
            title: `${i.invoiceNumber} - $${(i.amount/100).toLocaleString()}`, subtitle: `${i.clientName} • Due ${new Date(i.dueDate).toLocaleDateString()}`,
            status: i.status, statusType: i.status === 'paid' ? 'success' : i.status === 'overdue' ? 'error' : 'warning',
            meta: 'Invoice',
            data: i
          });
        }
      });
    }

    // Messages
    if (!typeFilter || typeFilter === 'message') {
      MESSAGE_THREADS.forEach(m => {
        if (!textQuery || m.clientName.toLowerCase().includes(textQuery) || m.matterTitle?.toLowerCase().includes(textQuery)) {
          items.push({
            id: m.id, type: 'message', icon: MessageSquare,
            title: m.clientName, subtitle: m.matterTitle || 'General Discussion',
            status: m.status, statusType: m.status === 'open' ? 'warning' : 'neutral',
            meta: 'Message',
            data: m
          });
        }
      });
    }

    // Requests
    if (!typeFilter || typeFilter === 'request') {
      LEADS.forEach(l => {
        if (!textQuery || l.firstName.toLowerCase().includes(textQuery) || l.lastName.toLowerCase().includes(textQuery) || l.companyName?.toLowerCase().includes(textQuery)) {
          items.push({
            id: l.id, type: 'request', icon: Inbox,
            title: `${l.firstName} ${l.lastName}`, subtitle: l.companyName || 'Individual Request',
            status: l.status, statusType: l.status === 'new-lead' ? 'error' : 'warning',
            meta: 'Request',
            data: l
          });
        }
      });
    }

    return items.slice(0, 50);
  }, [query, activeFilter]);

  // Group results
  const groupedResults = useMemo(() => {
    const groups: Record<string, any[]> = {
      matter: [],
      client: [],
      document: [],
      invoice: [],
      message: [],
      request: []
    };
    results.forEach(r => {
      if (groups[r.type]) groups[r.type].push(r);
    });
    Object.keys(groups).forEach(k => {
      if (groups[k].length === 0) delete groups[k];
    });
    return groups;
  }, [results]);

  const flatGroupedResults = useMemo(() => {
    const flat: any[] = [];
    Object.entries(groupedResults).forEach(([type, items]) => {
      items.forEach(item => flat.push(item));
    });
    return flat;
  }, [groupedResults]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeFilter, flatGroupedResults.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatGroupedResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatGroupedResults.length > 0 && flatGroupedResults[selectedIndex]) {
          onSelect(flatGroupedResults[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatGroupedResults, selectedIndex, onSelect, onClose]);

  const selectedItem = flatGroupedResults[selectedIndex];

  const renderPreview = () => {
    if (!selectedItem) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-[#8C8981] p-8 text-center">
          <div className="w-16 h-16 bg-[#F4F1EA] rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-[#A8A69F]" />
          </div>
          <p className="text-lg font-medium text-[#2C2B29] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Global Finder</p>
          <p className="text-sm max-w-[240px]">Search across all clients, matters, documents, invoices, and communications instantly.</p>
          
          <div className="mt-8 flex gap-4">
            <div className="flex flex-col items-center gap-2">
              <kbd className="px-2 py-1 bg-white border border-[#E6E4DD] rounded-md text-xs font-bold text-[#5A7C96] shadow-sm">⌘ K</kbd>
              <span className="text-[10px] uppercase tracking-wider">Open</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <kbd className="px-2 py-1 bg-white border border-[#E6E4DD] rounded-md text-xs font-bold text-[#5A7C96] shadow-sm">↑ ↓</kbd>
              <span className="text-[10px] uppercase tracking-wider">Navigate</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <kbd className="px-2 py-1 bg-white border border-[#E6E4DD] rounded-md text-xs font-bold text-[#5A7C96] shadow-sm">↵</kbd>
              <span className="text-[10px] uppercase tracking-wider">Select</span>
            </div>
          </div>
        </div>
      );
    }

    const { type, data } = selectedItem;

    if (type === 'matter') {
      const matter = data;
      return (
        <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-[#E6E4DD] bg-white">
            <div className="w-12 h-12 rounded-xl bg-[#FDF8EF] text-[#C19A5B] flex items-center justify-center mb-4 border border-[#EAD2A8]">
              <Briefcase className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-medium text-[#2C2B29] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>{matter.title}</h2>
            <div className="flex items-center gap-3 text-sm text-[#8C8981] mb-4">
              <span className="font-mono bg-[#F4F1EA] px-1.5 py-0.5 rounded text-xs text-[#2C2B29]">{matter.referenceCode}</span>
              <span>•</span>
              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {matter.clientName}</span>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={matter.operationalStatus} />
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F4F1EA] text-[#2C2B29] border border-[#E6E4DD]">
                <Scale className="w-3 h-3 text-[#C19A5B]" /> {matter.expertiseArea || 'General'}
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-[#FCFBF8]">
             <div>
               <h4 className="text-xs font-semibold text-[#8C8981] uppercase tracking-wider mb-2">Matter Summary</h4>
               <p className="text-sm text-[#2C2B29] leading-relaxed bg-white p-4 rounded-xl border border-[#E6E4DD]">
                 {matter.issueSummary || 'No summary provided for this matter.'}
               </p>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-4 rounded-xl border border-[#E6E4DD]">
                 <span className="block text-xs font-medium text-[#8C8981] mb-1">Financials</span>
                 <p className="text-lg font-medium text-[#2C2B29]">{formatCurrency(matter.totalFee || 0)}</p>
                 <p className="text-xs text-[#5A7C96] mt-1">{formatCurrency(matter.paidAmount || 0)} paid</p>
               </div>
               <div className="bg-white p-4 rounded-xl border border-[#E6E4DD]">
                 <span className="block text-xs font-medium text-[#8C8981] mb-1">Urgency</span>
                 <div className="flex items-center gap-2 mt-1">
                   <UrgencyDot urgency={matter.urgency} />
                   <span className="text-sm font-medium text-[#2C2B29] capitalize">{matter.urgency?.replace(/-/g, ' ')}</span>
                 </div>
               </div>
             </div>

             <div>
               <h4 className="text-xs font-semibold text-[#8C8981] uppercase tracking-wider mb-3">Lifecycle Stage</h4>
               <div className="space-y-3">
                 {matter.stages?.slice(0, 3).map((stage: any, i: number) => (
                   <div key={i} className="flex items-start gap-3">
                     <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${stage.completed ? 'bg-[#5A7C96] text-white' : 'bg-[#F4F1EA] text-[#A8A69F] border border-[#E6E4DD]'}`}>
                       {stage.completed && <Check className="w-3 h-3" />}
                     </div>
                     <div>
                       <p className={`text-sm font-medium ${stage.completed ? 'text-[#2C2B29]' : 'text-[#8C8981]'}`}>{stage.label}</p>
                     </div>
                   </div>
                 ))}
                 <button className="text-xs text-[#C19A5B] font-medium hover:underline mt-2">View full timeline &rarr;</button>
               </div>
             </div>
          </div>
          <div className="p-4 border-t border-[#E6E4DD] bg-white flex justify-end gap-3 shrink-0">
             <button className="px-4 py-2 text-sm font-medium text-[#2C2B29] border border-[#E6E4DD] rounded-lg hover:bg-[#F4F1EA] transition-colors">
               Open Workspace
             </button>
             <button onClick={() => onSelect(selectedItem)} className="px-4 py-2 text-sm font-medium text-white bg-[#2C2B29] rounded-lg hover:bg-[#4A4946] transition-colors flex items-center gap-2 shadow-sm">
               View Matter Detail <ChevronRight className="w-4 h-4" />
             </button>
          </div>
        </div>
      );
    }

    if (type === 'client') {
      const client = data;
      return (
        <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-200">
           <div className="p-6 border-b border-[#E6E4DD] bg-white flex items-start gap-5">
             <div className="w-16 h-16 rounded-full bg-[#EFF3F6] text-[#5A7C96] flex items-center justify-center text-2xl font-medium shrink-0 border-2 border-white shadow-sm">
               {client.name.charAt(0)}
             </div>
             <div className="flex-1">
               <h2 className="text-xl font-medium text-[#2C2B29] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>{client.name}</h2>
               <div className="flex items-center gap-3 text-sm text-[#8C8981] mb-3">
                 <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {client.email}</span>
               </div>
               <StatusBadge status={client.lifecycle} type="neutral" />
             </div>
           </div>

           <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-[#FCFBF8]">
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-4 rounded-xl border border-[#E6E4DD] flex items-center gap-3">
                   <Phone className="w-5 h-5 text-[#A8A69F]" />
                   <div>
                     <span className="block text-[10px] font-bold text-[#8C8981] uppercase tracking-wider">Phone</span>
                     <p className="text-sm font-medium text-[#2C2B29]">{client.phone}</p>
                   </div>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-[#E6E4DD] flex items-center gap-3">
                   <MapPin className="w-5 h-5 text-[#A8A69F]" />
                   <div>
                     <span className="block text-[10px] font-bold text-[#8C8981] uppercase tracking-wider">Region</span>
                     <p className="text-sm font-medium text-[#2C2B29]">{client.region || 'Not specified'}</p>
                   </div>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-[#E6E4DD] flex items-center gap-3">
                   <Calendar className="w-5 h-5 text-[#A8A69F]" />
                   <div>
                     <span className="block text-[10px] font-bold text-[#8C8981] uppercase tracking-wider">Joined</span>
                     <p className="text-sm font-medium text-[#2C2B29]">{formatDate(client.joinedAt)}</p>
                   </div>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-[#E6E4DD] flex items-center gap-3">
                   <Briefcase className="w-5 h-5 text-[#A8A69F]" />
                   <div>
                     <span className="block text-[10px] font-bold text-[#8C8981] uppercase tracking-wider">Active Matters</span>
                     <p className="text-sm font-medium text-[#2C2B29]">{MATTERS.filter(m => m.clientId === client.id && m.operationalStatus !== 'completed').length}</p>
                   </div>
                 </div>
              </div>

              <div>
                 <h4 className="text-xs font-semibold text-[#8C8981] uppercase tracking-wider mb-3">Recent Activity</h4>
                 <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#E6E4DD] before:to-transparent">
                    {/* Placeholder timeline */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-[#C19A5B] text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10">
                        <Check className="w-3 h-3" />
                      </div>
                      <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded-lg border border-[#E6E4DD] shadow-sm ml-4 md:ml-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm text-[#2C2B29]">Sent message</p>
                          <time className="text-[10px] text-[#8C8981]">2 days ago</time>
                        </div>
                        <p className="text-xs text-[#5A7C96] truncate">Regarding "Acme Corp Litigation"</p>
                      </div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="p-4 border-t border-[#E6E4DD] bg-white flex justify-end gap-3 shrink-0">
             <button onClick={() => onSelect(selectedItem)} className="px-4 py-2 text-sm font-medium text-white bg-[#2C2B29] rounded-lg hover:bg-[#4A4946] transition-colors flex items-center gap-2 shadow-sm w-full justify-center">
               View Full Client 360 <ChevronRight className="w-4 h-4" />
             </button>
          </div>
        </div>
      );
    }

    if (type === 'invoice') {
      const invoice = data;
      return (
         <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-[#E6E4DD] bg-white">
            <div className="w-12 h-12 rounded-xl bg-[#FDE8EC] text-[#d4183d] flex items-center justify-center mb-4 border border-[#F5C2C7]">
              <CreditCard className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-medium text-[#2C2B29] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>{formatCurrency(invoice.amount)}</h2>
            <div className="flex items-center gap-3 text-sm text-[#8C8981] mb-4">
              <span className="font-mono bg-[#F4F1EA] px-1.5 py-0.5 rounded text-xs text-[#2C2B29]">{invoice.invoiceNumber}</span>
              <span>•</span>
              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {invoice.clientName}</span>
            </div>
            <StatusBadge status={invoice.status} type={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'error' : 'warning'} />
          </div>
          <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-[#FCFBF8]">
             <div className="bg-white rounded-xl border border-[#E6E4DD] overflow-hidden">
                <div className="p-4 border-b border-[#E6E4DD] flex justify-between items-center bg-[#F9F8F6]">
                  <span className="text-xs font-semibold text-[#8C8981] uppercase tracking-wider">Line Items</span>
                  <span className="text-xs font-medium text-[#5A7C96]">Due {formatDate(invoice.dueDate)}</span>
                </div>
                <div className="p-4 space-y-3">
                  {invoice.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-[#2C2B29]">{item.description}</span>
                      <span className="font-medium text-[#2C2B29]">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#2C2B29]">Legal Services Retainer</span>
                    <span className="font-medium text-[#2C2B29]">{formatCurrency(invoice.amount)}</span>
                  </div>
                </div>
                <div className="p-4 border-t border-[#E6E4DD] flex justify-between items-center bg-[#FDF8EF]">
                  <span className="text-sm font-bold text-[#997A48]">Total Due</span>
                  <span className="text-lg font-bold text-[#997A48]">{formatCurrency(invoice.amount)}</span>
                </div>
             </div>
          </div>
          <div className="p-4 border-t border-[#E6E4DD] bg-white flex justify-end gap-3 shrink-0">
             <button className="px-4 py-2 text-sm font-medium text-[#2C2B29] border border-[#E6E4DD] rounded-lg hover:bg-[#F4F1EA] transition-colors flex items-center gap-2">
               <Download className="w-4 h-4" /> PDF
             </button>
             <button onClick={() => onSelect(selectedItem)} className="px-4 py-2 text-sm font-medium text-white bg-[#2C2B29] rounded-lg hover:bg-[#4A4946] transition-colors shadow-sm">
               View Ledger
             </button>
          </div>
         </div>
      );
    }

    if (type === 'document') {
      const doc = data;
      return (
         <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-200">
           <div className="p-6 border-b border-[#E6E4DD] bg-white flex flex-col items-center justify-center text-center">
             <div className="w-20 h-24 bg-gradient-to-br from-[#E6E4DD] to-[#F4F1EA] rounded-lg border border-[#A8A69F] flex items-center justify-center shadow-inner mb-6 relative">
                <FileText className="w-10 h-10 text-[#5A7C96]" />
                <div className="absolute -bottom-3 -right-3 bg-white p-1 rounded-full shadow-sm border border-[#E6E4DD]">
                  <StatusBadge status={doc.status} type={doc.status === 'approved' ? 'success' : doc.status === 'needs_review' ? 'warning' : 'neutral'} size="sm" />
                </div>
             </div>
             <h2 className="text-xl font-medium text-[#2C2B29] mb-2">{doc.name}</h2>
             <p className="text-sm text-[#8C8981]">{doc.clientName} {doc.matterTitle && `• ${doc.matterTitle}`}</p>
           </div>
           
           <div className="p-6 space-y-4 flex-1 overflow-y-auto bg-[#FCFBF8]">
              <h4 className="text-xs font-semibold text-[#8C8981] uppercase tracking-wider mb-2">Metadata</h4>
              <div className="bg-white rounded-xl border border-[#E6E4DD] divide-y divide-[#F4F1EA]">
                 <div className="flex justify-between items-center p-3 text-sm">
                   <span className="text-[#8C8981]">Uploaded</span>
                   <span className="font-medium text-[#2C2B29]">{formatDate(doc.uploadedAt)}</span>
                 </div>
                 <div className="flex justify-between items-center p-3 text-sm">
                   <span className="text-[#8C8981]">Format</span>
                   <span className="font-medium text-[#2C2B29] uppercase">{doc.name.split('.').pop() || 'PDF'}</span>
                 </div>
                 <div className="flex justify-between items-center p-3 text-sm">
                   <span className="text-[#8C8981]">Size</span>
                   <span className="font-medium text-[#2C2B29]">2.4 MB</span>
                 </div>
                 <div className="flex justify-between items-center p-3 text-sm">
                   <span className="text-[#8C8981]">Uploader</span>
                   <div className="flex items-center gap-2">
                     <div className="w-5 h-5 rounded-full bg-[#EAD2A8] flex items-center justify-center text-[10px] text-[#997A48]">S</div>
                     <span className="font-medium text-[#2C2B29]">System</span>
                   </div>
                 </div>
              </div>
           </div>

           <div className="p-4 border-t border-[#E6E4DD] bg-white flex justify-end gap-3 shrink-0">
             <button className="flex-1 px-4 py-2 text-sm font-medium text-[#2C2B29] border border-[#E6E4DD] rounded-lg hover:bg-[#F4F1EA] transition-colors flex items-center justify-center gap-2">
               <Download className="w-4 h-4" /> Download
             </button>
             <button onClick={() => onSelect(selectedItem)} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#2C2B29] rounded-lg hover:bg-[#4A4946] transition-colors shadow-sm">
               Open Viewer
             </button>
          </div>
         </div>
      );
    }

    // Default fallback preview
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-[#FCFBF8] text-center animate-in fade-in">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-[#E6E4DD] flex items-center justify-center mb-6">
          <selectedItem.icon className="w-8 h-8 text-[#C19A5B]" />
        </div>
        <h2 className="text-xl font-medium text-[#2C2B29] mb-2">{selectedItem.title}</h2>
        <p className="text-sm text-[#8C8981] mb-6">{selectedItem.subtitle}</p>
        <button onClick={() => onSelect(selectedItem)} className="px-6 py-2.5 text-sm font-medium text-white bg-[#2C2B29] rounded-lg hover:bg-[#4A4946] transition-colors shadow-sm flex items-center gap-2">
          Open Record <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[6vh] px-4 font-sans">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 bg-[#2C2B29]/40 backdrop-blur-[2px]"
          onClick={onClose}
        />
        <motion.div 
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-[1100px] h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#E6E4DD] flex flex-col"
        >
          {/* Top Command Search */}
          <div className="flex items-center px-6 h-[72px] border-b border-[#E6E4DD] shrink-0 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] z-10 relative">
            <Search className="w-6 h-6 text-[#A8A69F] mr-4 shrink-0" />
            <input 
              autoFocus
              type="text"
              placeholder="Search clients, matters, documents, or use syntax 'type:invoice'"
              className="flex-1 bg-transparent border-none outline-none text-xl text-[#2C2B29] placeholder:text-[#A8A69F] font-medium"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1.5 hover:bg-[#F4F1EA] rounded-md mr-4 text-[#8C8981] transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2 border-l border-[#E6E4DD] pl-5">
              <kbd className="text-[11px] font-bold text-[#8C8981] bg-[#F4F1EA] px-2 py-1 rounded-md border border-[#E6E4DD] shadow-sm">ESC</kbd>
            </div>
          </div>

          <div className="flex flex-1 min-h-0 bg-[#FCFBF8]">
            {/* Left Filter Rail */}
            <div className="w-56 border-r border-[#E6E4DD] bg-[#F9F8F6] p-4 flex flex-col gap-6 shrink-0 overflow-y-auto">
              
              <div>
                <h4 className="text-[10px] font-bold text-[#8C8981] uppercase tracking-wider mb-3 px-2">Filters</h4>
                <div className="space-y-1">
                  {[
                    { id: 'all', label: 'All Results', icon: Search },
                    { id: 'client', label: 'Clients', icon: User },
                    { id: 'matter', label: 'Matters', icon: Briefcase },
                    { id: 'document', label: 'Documents', icon: FileText },
                    { id: 'invoice', label: 'Invoices', icon: CreditCard },
                    { id: 'message', label: 'Messages', icon: MessageSquare },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => { setActiveFilter(f.id); setQuery(''); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        activeFilter === f.id 
                          ? 'bg-white border border-[#E6E4DD] text-[#2C2B29] font-medium shadow-sm' 
                          : 'text-[#5A7C96] border border-transparent hover:bg-white/60 hover:text-[#2C2B29]'
                      }`}
                    >
                      <f.icon className={`w-4 h-4 ${activeFilter === f.id ? 'text-[#C19A5B]' : ''}`} />
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {!query && (
                <>
                  <div className="border-t border-[#E6E4DD] pt-6">
                    <h4 className="text-[10px] font-bold text-[#8C8981] uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                      <Star className="w-3 h-3" /> Saved Views
                    </h4>
                    <div className="space-y-1">
                      {SAVED_VIEWS.map((view, idx) => (
                        <button
                          key={idx}
                          onClick={() => setQuery(view.query)}
                          className="w-full text-left px-3 py-2 text-xs text-[#5A7C96] hover:text-[#2C2B29] hover:bg-white rounded-lg transition-colors truncate"
                        >
                          {view.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-[#E6E4DD] pt-6">
                    <h4 className="text-[10px] font-bold text-[#8C8981] uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                      <History className="w-3 h-3" /> Recent
                    </h4>
                    <div className="space-y-1">
                      {RECENT_SEARCHES.map((search, idx) => (
                        <button
                          key={idx}
                          onClick={() => setQuery(search)}
                          className="w-full text-left px-3 py-2 text-xs text-[#8C8981] hover:text-[#2C2B29] hover:bg-white rounded-lg transition-colors truncate"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Middle: Results List */}
            <div className="w-[360px] border-r border-[#E6E4DD] bg-white flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {flatGroupedResults.length === 0 ? (
                   <div className="py-12">
                     <EmptyState 
                       icon={Search} 
                       title="No results found" 
                       description="We couldn't find anything matching your search query or filters. Please try again."
                       action={{ label: "Clear Search", onClick: () => { setQuery(''); setFilters([]); } }}
                     />
                   </div>
                ) : (
                  <div className="p-3 space-y-6">
                    {Object.entries(groupedResults).map(([type, items]) => {
                      if (items.length === 0) return null;
                      return (
                        <div key={type} className="animate-in fade-in duration-300">
                          <h3 className="text-[10px] font-bold text-[#A8A69F] uppercase tracking-widest mb-2 px-3 flex items-center justify-between">
                            <span>{type}s</span>
                            <span className="bg-[#F4F1EA] text-[#5A7C96] px-1.5 py-0.5 rounded text-[9px]">{items.length}</span>
                          </h3>
                          <div className="flex flex-col gap-1">
                            {items.map((item) => {
                              const globalIndex = flatGroupedResults.findIndex(r => r.id === item.id && r.type === item.type);
                              const isSelected = globalIndex === selectedIndex;
                              return (
                                <div
                                  key={item.id}
                                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                                  onClick={() => onSelect(item)}
                                  className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                    isSelected 
                                      ? 'bg-[#2C2B29] text-white shadow-md' 
                                      : 'hover:bg-[#F9F8F6] text-[#2C2B29]'
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'bg-white/20 text-white' : 'bg-[#F4F1EA] text-[#5A7C96]'}`}>
                                    <item.icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-[#2C2B29]'}`}>{item.title}</p>
                                    <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-white/70' : 'text-[#8C8981]'}`}>{item.subtitle}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Rich Preview Panel */}
            <div className="flex-1 bg-[#F9F8F6] min-h-0 relative">
               {renderPreview()}
            </div>
          </div>
          
          <div className="bg-white px-6 py-3 border-t border-[#E6E4DD] flex items-center justify-between text-xs text-[#8C8981] shrink-0">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5 font-medium"><kbd className="bg-[#F4F1EA] px-1.5 rounded border border-[#E6E4DD] text-[#5A7C96]">⌘</kbd> <kbd className="bg-[#F4F1EA] px-1.5 rounded border border-[#E6E4DD] text-[#5A7C96]">K</kbd> <span className="ml-1">Search</span></span>
              <span className="flex items-center gap-1.5 font-medium"><kbd className="bg-[#F4F1EA] px-1.5 rounded border border-[#E6E4DD] text-[#5A7C96]">↑</kbd> <kbd className="bg-[#F4F1EA] px-1.5 rounded border border-[#E6E4DD] text-[#5A7C96]">↓</kbd> <span className="ml-1">Navigate</span></span>
              <span className="flex items-center gap-1.5 font-medium"><kbd className="bg-[#F4F1EA] px-1.5 rounded border border-[#E6E4DD] text-[#5A7C96]">↵</kbd> <span className="ml-1">Open</span></span>
            </div>
            {flatGroupedResults.length > 0 && (
              <span className="font-medium text-[#5A7C96] bg-[#EFF3F6] px-2.5 py-1 rounded-full">Showing {flatGroupedResults.length} results</span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
