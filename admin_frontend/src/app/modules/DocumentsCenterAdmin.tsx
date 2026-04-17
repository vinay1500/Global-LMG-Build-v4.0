import React, { useState, useMemo } from 'react';
import { 
  FileText, File, Image as ImageIcon, Package, Search, Filter, 
  Download, Eye, EyeOff, MoreVertical, CheckCircle, Clock, 
  MessageSquare, ChevronDown, ChevronRight, X, AlertCircle, Share2
} from 'lucide-react';
import { PlatformDocument } from '../data/seedData';
import { EmptyState } from './EmptyState';

interface DocumentsCenterAdminProps {
  documents: PlatformDocument[];
  searchQuery: string;
}

type GroupBy = 'none' | 'matter' | 'client' | 'category' | 'visibility' | 'uploadDate';

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

const getFileIcon = (type: string, className = "w-5 h-5") => {
  switch (type.toUpperCase()) {
    case 'PDF': return <FileText className={`text-red-500 ${className}`} />;
    case 'DOCX':
    case 'DOC': return <File className={`text-blue-500 ${className}`} />;
    case 'JPG':
    case 'PNG': return <ImageIcon className={`text-emerald-500 ${className}`} />;
    case 'ZIP': return <Package className={`text-amber-500 ${className}`} />;
    case 'XLSX': return <File className={`text-green-600 ${className}`} />;
    default: return <File className={`text-gray-400 ${className}`} />;
  }
};

export const DocumentsCenterAdmin: React.FC<DocumentsCenterAdminProps> = ({ documents, searchQuery: globalSearch }) => {
  const [localSearch, setLocalSearch] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [selectedDoc, setSelectedDoc] = useState<PlatformDocument | null>(documents[0] || null);
  
  // Filters
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'client' | 'internal'>('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'reviewed' | 'unreviewed'>('all');

  const filteredDocs = useMemo(() => {
    let result = documents;
    
    // Search
    const search = localSearch || globalSearch;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(d => 
        d.name.toLowerCase().includes(s) ||
        d.matterTitle.toLowerCase().includes(s) ||
        d.clientName.toLowerCase().includes(s)
      );
    }
    
    // Filters
    if (visibilityFilter !== 'all') {
      result = result.filter(d => d.visibility === visibilityFilter);
    }
    if (reviewFilter !== 'all') {
      result = result.filter(d => d.reviewState === reviewFilter);
    }
    
    return result;
  }, [documents, localSearch, globalSearch, visibilityFilter, reviewFilter]);

  const groupedDocs = useMemo(() => {
    if (groupBy === 'none') return { 'All Documents': filteredDocs };
    
    return filteredDocs.reduce((acc, doc) => {
      let key = 'Other';
      if (groupBy === 'matter') key = doc.matterTitle || 'No Matter';
      if (groupBy === 'client') key = doc.clientName || 'No Client';
      if (groupBy === 'category') key = doc.docCategory || 'Uncategorized';
      if (groupBy === 'visibility') key = doc.visibility === 'client' ? 'Client Visible' : 'Internal Only';
      if (groupBy === 'uploadDate') {
        const d = new Date(doc.uploadedAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - d.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) key = 'Last 7 Days';
        else if (diffDays <= 30) key = 'Last 30 Days';
        else key = 'Older';
      }
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(doc);
      return acc;
    }, {} as Record<string, PlatformDocument[]>);
  }, [filteredDocs, groupBy]);

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col -m-6 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>Documents Center</h1>
          <p className="text-sm text-gray-500 mt-1">Manage files, adjust visibility, and review uploads.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition">
            + Upload Document
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-6">
        {/* Left List Column */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-4 bg-gray-50/50">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Search documents..."
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 bg-white"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={groupBy}
                onChange={e => setGroupBy(e.target.value as GroupBy)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white min-w-[120px]"
              >
                <option value="none">No Grouping</option>
                <option value="matter">Group by Matter</option>
                <option value="client">Group by Client</option>
                <option value="category">Group by Category</option>
                <option value="visibility">Group by Visibility</option>
                <option value="uploadDate">Group by Upload Date</option>
              </select>

              <select
                value={visibilityFilter}
                onChange={e => setVisibilityFilter(e.target.value as any)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white min-w-[120px]"
              >
                <option value="all">All Visibility</option>
                <option value="client">Client Visible</option>
                <option value="internal">Internal Only</option>
              </select>
            </div>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {Object.entries(groupedDocs).map(([groupName, docs]) => (
              <div key={groupName} className="mb-6 last:mb-0">
                {groupBy !== 'none' && (
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                    <ChevronDown className="w-3.5 h-3.5" /> {groupName} <span className="bg-gray-100 text-gray-500 px-1.5 rounded-full">{docs.length}</span>
                  </h3>
                )}
                <div className="space-y-2">
                  {docs.map(doc => (
                    <div 
                      key={doc.id} 
                      onClick={() => setSelectedDoc(doc)}
                      className={`flex items-center gap-4 p-3 rounded-xl border transition cursor-pointer group ${selectedDoc?.id === doc.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm'}`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                        {getFileIcon(doc.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className={`font-medium truncate ${selectedDoc?.id === doc.id ? 'text-blue-900' : 'text-gray-900'}`}>
                            {doc.name}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            {doc.visibility === 'client' ? (
                              <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                <Eye className="w-3 h-3" /> Client
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                <EyeOff className="w-3 h-3" /> Internal
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {doc.matterTitle && (
                            <span className="truncate max-w-[150px]" title={doc.matterTitle}>{doc.matterTitle}</span>
                          )}
                          {doc.matterTitle && <span className="text-gray-300">•</span>}
                          <span>{formatDate(doc.uploadedAt)}</span>
                          <span className="text-gray-300">•</span>
                          <span>{formatSize(doc.size)}</span>
                          <span className="text-gray-300">•</span>
                          {doc.reviewState === 'reviewed' ? (
                            <span className="flex items-center gap-1 text-emerald-600"><CheckCircle className="w-3 h-3" /> Reviewed</span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-600"><Clock className="w-3 h-3" /> Needs Review</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {filteredDocs.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <EmptyState 
                  icon={Search} 
                  title="No documents found" 
                  description="Try adjusting your search query, or clear your filters to see more results."
                  action={{ label: "Clear Filters", onClick: () => { setLocalSearch(''); setVisibilityFilter('all'); setReviewFilter('all'); } }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Preview/Detail Column */}
        {selectedDoc ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden h-full">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  {getFileIcon(selectedDoc.type, "w-6 h-6")}
                </div>
                <div className="min-w-0">
                  <h2 className="font-medium text-gray-900 leading-tight break-words">{selectedDoc.name}</h2>
                  <p className="text-xs text-gray-500 mt-1">Uploaded by <span className="font-medium text-gray-700">{selectedDoc.uploadedBy}</span> on {formatDate(selectedDoc.uploadedAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Download className="w-4 h-4" /></button>
                <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"><Share2 className="w-4 h-4" /></button>
                <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"><MoreVertical className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Properties */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Matter</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDoc.matterTitle || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Client</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDoc.clientName || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">File Size</p>
                  <p className="text-sm font-medium text-gray-900">{formatSize(selectedDoc.size)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Category</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDoc.docCategory}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Client Visibility</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Can the client see this document?</p>
                  </div>
                  <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${selectedDoc.visibility === 'client' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${selectedDoc.visibility === 'client' ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Review Status</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Has this been verified by counsel?</p>
                  </div>
                  <select 
                    className="text-sm border border-gray-300 rounded-md px-2 py-1 outline-none font-medium bg-white"
                    defaultValue={selectedDoc.reviewState}
                  >
                    <option value="unreviewed">Needs Review</option>
                    <option value="reviewed">Reviewed & Approved</option>
                  </select>
                </div>
              </div>

              {/* Version History (Mock) */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Version History</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-xs font-bold">v2</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Current Version</p>
                      <p className="text-xs text-gray-500">Uploaded {formatDate(selectedDoc.uploadedAt)} by {selectedDoc.uploadedBy}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 opacity-50 hover:opacity-100 transition">
                    <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 text-xs font-bold">v1</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Previous Draft</p>
                      <p className="text-xs text-gray-500">Uploaded 3 days earlier by {selectedDoc.uploadedBy}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Internal Notes</h3>
                  <button className="text-xs text-blue-600 hover:underline">+ Add Note</button>
                </div>
                {selectedDoc.note ? (
                  <div className="bg-amber-50 border border-amber-100 text-sm text-gray-700 p-3 rounded-lg">
                    {selectedDoc.note}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No internal notes for this document.</p>
                )}
              </div>
            </div>

            {/* Simulated Workspace Viewer Placeholder */}
            <div className="h-40 bg-gray-900 m-4 rounded-xl flex flex-col items-center justify-center text-gray-400 relative overflow-hidden shadow-inner shrink-0">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
              {getFileIcon(selectedDoc.type, "w-8 h-8 mb-2 opacity-50")}
              <p className="text-sm font-medium">Document Preview Viewer</p>
              <button className="mt-3 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-medium backdrop-blur-sm transition">
                Open Fullscreen
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col items-center justify-center p-8 h-full text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <File className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No Document Selected</h3>
            <p className="text-sm text-gray-500 max-w-xs mt-1">Select a document from the list to view its details, manage visibility, and access preview.</p>
          </div>
        )}
      </div>
    </div>
  );
};
