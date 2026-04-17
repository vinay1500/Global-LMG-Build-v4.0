import React, { useState } from 'react';
import { 
  ArrowLeft, Video, MessageSquare, FileText, Download, 
  ExternalLink, Edit2, CheckCircle, Clock, Trash2, Check,
  Package, IndianRupee, Save, Calendar, Users, AlertCircle, Phone, X
} from 'lucide-react';
import { StatusBadge, UrgencyDot } from '../components/dashboard/StatusBadge';
import { LifecycleStepper } from '../components/dashboard/LifecycleStepper';
import { 
  formatCurrency, formatDate, getServiceName, SERVICES, LIFECYCLE_STAGES,
  type Matter, type Invoice, type PlatformEvent, type PlatformDocument, type MessageThread 
} from '../data/seedData';
import { PackageBuilder, type PackageTier } from './PackageBuilder';

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface MatterDetailAdminProps {
  matter: Matter;
  onBack: () => void;
  onChat: (threadId: string | null) => void;
  myInvoices: Invoice[];
  myDocs: PlatformDocument[];
  myEvents: PlatformEvent[];
  myThreads: MessageThread[];
  onUpdateFee: (matterId: string, newFee: number) => void;
}

export const MatterDetailAdmin: React.FC<MatterDetailAdminProps> = ({ 
  matter: initialMatter, onBack, onChat, myInvoices, myDocs, myEvents: initialEvents, myThreads, onUpdateFee 
}) => {
  const [matter, setMatter] = useState(initialMatter);
  const [localEvents, setLocalEvents] = useState<PlatformEvent[]>(initialEvents);
  
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [editedFee, setEditedFee] = useState(matter.totalFee.toString());
  const [showPackageBuilder, setShowPackageBuilder] = useState(false);
  const [matterPackages, setMatterPackages] = useState<PackageTier[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'documents'>('overview');
  
  const [showEventForm, setShowEventForm] = useState(false);
  const [showClientSimulation, setShowClientSimulation] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState(matter.issueSummary);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [editedServices, setEditedServices] = useState<string[]>(matter.selectedServices);
  
  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const [isEditingMatter, setIsEditingMatter] = useState(false);
  
  // Add Event state
  const [newEvent, setNewEvent] = useState({
    title: '', date: '', time: '', type: 'meeting', location: ''
  });

  const handleSaveFee = () => {
    const fee = parseInt(editedFee.replace(/,/g, '')) || 0;
    onUpdateFee(matter.id, fee);
    setMatter({ ...matter, totalFee: fee });
    setIsEditingFee(false);
  };

  const handleSavePackages = (packages: PackageTier[]) => {
    setMatterPackages(packages);
    alert('Packages published to client view.');
  };

  const applyPackageFee = (price: number) => {
    onUpdateFee(matter.id, price);
    setMatter({ ...matter, totalFee: price });
    alert(`Total fee updated to ${formatCurrency(price)} based on package selection.`);
  };
  
  const handleGenerateInvoice = () => {
    if (matterPackages.length === 0) {
      alert('Please create service packages first so the client has options to choose from.');
      setShowPackageBuilder(true);
      return;
    }
    setShowClientSimulation(true);
  };

  const handleAddEvent = () => {
    const isMeeting = newEvent.type === 'meeting';
    const createdEvent: PlatformEvent = {
      id: `EVT-${Date.now()}`,
      title: newEvent.title || (isMeeting ? 'Scheduled Meeting' : 'New Event'),
      type: isMeeting ? 'consultation' : 'hearing',
      clientId: matter.clientId,
      clientName: matter.clientName,
      matterId: matter.id,
      matterTitle: matter.title,
      date: newEvent.date || new Date().toISOString().split('T')[0],
      time: newEvent.time || '10:00 AM',
      duration: isMeeting ? 60 : 0,
      mode: isMeeting ? 'video' : 'court',
      location: newEvent.location || (isMeeting ? 'Video Conference' : ''),
      visibleToClient: true,
      meetLink: isMeeting ? (newEvent.location || 'https://meet.google.com/abc-defg-hij') : undefined,
      status: 'upcoming'
    };
    setLocalEvents([...localEvents, createdEvent]);
    setShowEventForm(false);
    if (isMeeting) {
      alert('Meeting scheduled and Google Meet link generated!');
    } else {
      alert('Event added successfully!');
    }
  };

  const handleStageUpdate = (stageId: string) => {
    const idx = LIFECYCLE_STAGES.findIndex(s => s.id === stageId);
    const newStages = LIFECYCLE_STAGES.map((s, i) => ({
      id: s.id as any,
      label: s.label,
      completed: i <= idx
    }));
    setMatter({ ...matter, lifecycleStage: stageId as any, stages: newStages });
    setShowStageDropdown(false);
  };

  const STAGES_LIST = LIFECYCLE_STAGES.map(s => ({
    id: s.id, label: s.label
  }));

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Matter List
      </button>

      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>{matter.title}</h1>
              <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded">{matter.referenceCode}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-sm text-gray-500 mb-3">
              <span>Client: <span className="font-medium text-gray-900">{matter.clientName}</span></span>
              <span>•</span>
              <span>Counsel: <span className="font-medium text-gray-900">{matter.assignedCounsel || 'Unassigned'}</span></span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select 
                className={`bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-full px-3 py-1 outline-none appearance-none capitalize ${isEditingMatter ? 'cursor-pointer hover:border-gray-300' : 'opacity-80 cursor-default'}`}
                value={matter.operationalStatus}
                onChange={(e) => setMatter({...matter, operationalStatus: e.target.value as any})}
                disabled={!isEditingMatter}
              >
                {[
                  'new-lead', 'awaiting-verification', 'verification-scheduled', 'verification-done',
                  'consultation-scheduled', 'consultation-completed', 'fee-pending', 'package-ready',
                  'invoice-sent', 'awaiting-payment', 'paid', 'work-in-progress', 'awaiting-client',
                  'awaiting-team', 'immediate', 'completed', 'archived', 'lost-closed'
                ].map(status => (
                  <option key={status} value={status}>{status.replace(/-/g, ' ')}</option>
                ))}
              </select>

              <select 
                className={`bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-full px-3 py-1 outline-none appearance-none capitalize ${isEditingMatter ? 'cursor-pointer hover:border-gray-300' : 'opacity-80 cursor-default'}`}
                value={matter.priority}
                onChange={(e) => setMatter({...matter, priority: e.target.value as any})}
                disabled={!isEditingMatter}
              >
                {[
                  'in-progress', 'immediate-6h', 'awaiting-client', 'awaiting-team', 'completed', 'on-hold'
                ].map(priority => (
                  <option key={priority} value={priority}>{priority.replace(/-/g, ' ')}</option>
                ))}
              </select>

              <UrgencyDot urgency={matter.urgency} />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {localEvents.some(e => e.type === 'consultation' && e.meetLink) && (
              <a 
                href={localEvents.find(e => e.type === 'consultation' && e.meetLink)?.meetLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-2 transition"
              >
                <Video className="w-4 h-4" /> Join Call
              </a>
            )}
            <button onClick={() => onChat(myThreads.find(t => t.matterId === matter.id)?.id || null)} className="px-4 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition">
              <MessageSquare className="w-4 h-4" /> Open Chat
            </button>
            {isEditingMatter ? (
              <button onClick={() => setIsEditingMatter(false)} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 transition">
                <Save className="w-4 h-4" /> Save Changes
              </button>
            ) : (
              <button onClick={() => setIsEditingMatter(true)} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2 transition">
                <Edit2 className="w-4 h-4" /> Edit Matter
              </button>
            )}
          </div>
        </div>

        {/* Stepper */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 relative">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Lifecycle Stage</h3>
            <div className="relative">
              {isEditingMatter && (
                <button 
                  onClick={() => setShowStageDropdown(!showStageDropdown)} 
                  className="text-xs text-blue-600 hover:underline"
                >
                  Update Stage
                </button>
              )}
              {showStageDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-10">
                  {STAGES_LIST.map(s => (
                    <button 
                      key={s.id} 
                      onClick={() => handleStageUpdate(s.id)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <LifecycleStepper stages={matter.stages} />
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-8">
          {[
            { id: 'overview', label: 'Matter Overview' },
            { id: 'events', label: `Events & Meetings (${localEvents.length})` },
            { id: 'documents', label: `Documents (${myDocs.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-sm font-medium transition border-b-2 ${activeTab === tab.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {activeTab === 'overview' && (
              <>
                {/* Package Builder Section */}
                <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                  <Package className="w-5 h-5 text-gray-400" />
                  Service Packages & Quoting
                </h3>
                {!showPackageBuilder && (
                  <button 
                    onClick={() => setShowPackageBuilder(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {matterPackages.length > 0 ? 'Edit Packages' : '+ Create Package Tiers'}
                  </button>
                )}
              </div>
              
              {showPackageBuilder ? (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <PackageBuilder 
                    matterId={matter.id} 
                    existingPackages={matterPackages}
                    onSave={(pkgs) => { handleSavePackages(pkgs); setShowPackageBuilder(false); }} 
                  />
                  <button onClick={() => setShowPackageBuilder(false)} className="mt-4 text-sm text-gray-500 hover:text-gray-700">Close without saving</button>
                </div>
              ) : matterPackages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {matterPackages.map(pkg => (
                    <div key={pkg.id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col relative group">
                      <h4 className="font-medium text-gray-900">{pkg.name}</h4>
                      <p className="text-xl font-semibold text-gray-900 mt-1 mb-3">{formatCurrency(pkg.price)}</p>
                      <ul className="text-sm text-gray-600 space-y-1.5 flex-1 mb-4">
                        {pkg.points.map((pt, i) => (
                          <li key={i} className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0"/> {pt}</li>
                        ))}
                      </ul>
                      <button 
                        onClick={() => applyPackageFee(pkg.price)}
                        className="w-full py-1.5 text-sm border border-gray-200 rounded text-gray-700 hover:bg-gray-50 transition"
                      >
                        Apply this fee
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  No packages created for this matter yet. Create custom service tiers to present to the client.
                </p>
              )}
            </div>

            {/* Matter Details */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm text-gray-500 font-medium">Issue Summary</h3>
                  {isEditingSummary ? (
                    <button onClick={() => { setMatter({...matter, issueSummary: editedSummary}); setIsEditingSummary(false); }} className="text-xs text-emerald-600 font-medium">Save Summary</button>
                  ) : isEditingMatter && (
                    <button onClick={() => setIsEditingSummary(true)} className="text-xs text-blue-600 hover:underline">Edit Summary</button>
                  )}
                </div>
                {isEditingSummary ? (
                  <textarea 
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    className="w-full text-sm text-gray-700 bg-white border border-gray-300 rounded-lg px-4 py-3 min-h-[100px] outline-none focus:border-gray-500"
                  />
                ) : (
                  <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">{matter.issueSummary}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm text-gray-500 font-medium">Selected Services</h3>
                  {isEditingServices ? (
                    <button onClick={() => { setMatter({...matter, selectedServices: editedServices}); setIsEditingServices(false); }} className="text-xs text-emerald-600 font-medium">Save Services</button>
                  ) : isEditingMatter && (
                    <button onClick={() => setIsEditingServices(true)} className="text-xs text-blue-600 hover:underline">Edit Services</button>
                  )}
                </div>
                
                {isEditingServices ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                    {SERVICES.map(s => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={editedServices.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) setEditedServices([...editedServices, s.id]);
                            else setEditedServices(editedServices.filter(id => id !== s.id));
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{s.name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {matter.selectedServices.map(sId => (
                      <span key={sId} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">{getServiceName(sId)}</span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm text-gray-500 font-medium">Client-Visible Updates</h3>
                  {isEditingMatter && <button className="text-xs text-blue-600 hover:underline">+ Add Update</button>}
                </div>
                {matter.clientVisibleNotes.length > 0 ? (
                  <div className="space-y-2">
                    {matter.clientVisibleNotes.map((note, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                        {note}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No updates shared with client.</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm text-gray-500 font-medium">Internal Notes</h3>
                  {isEditingMatter && <button className="text-xs text-blue-600 hover:underline">+ Add Note</button>}
                </div>
                {matter.internalNotes && matter.internalNotes.length > 0 ? (
                  <div className="space-y-2">
                    {matter.internalNotes.map((note, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700 bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                        {note}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No internal notes.</p>
                )}
              </div>
            </div>
            </>
            )}

            {activeTab === 'events' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>Events & Meetings</h3>
                    <p className="text-sm text-gray-500">Manage case deadlines, hearings, and Google Meet calls.</p>
                  </div>
                  <button onClick={() => setShowEventForm(true)} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-800 transition">
                    + Add Event/Meeting
                  </button>
                </div>

                {showEventForm && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                    <h4 className="font-medium text-gray-900">New Event or Meeting</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Type</label>
                        <select 
                          value={newEvent.type}
                          onChange={e => setNewEvent({...newEvent, type: e.target.value})}
                          className="w-full text-sm border border-gray-200 rounded px-3 py-2 outline-none"
                        >
                          <option value="meeting">Video Meeting (Google Meet)</option>
                          <option value="event">General Event (Hearing, Deadline, etc.)</option>
                        </select>
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Title</label>
                        <input type="text" placeholder={newEvent.type === 'meeting' ? "e.g. Case Strategy Session" : "e.g. Court Hearing"} value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full text-sm border border-gray-200 rounded px-3 py-2 outline-none" />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Date</label>
                        <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full text-sm border border-gray-200 rounded px-3 py-2 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Time</label>
                        <input type="time" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} className="w-full text-sm border border-gray-200 rounded px-3 py-2 outline-none" />
                      </div>
                      
                      {newEvent.type === 'event' && (
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Location / Details</label>
                          <input type="text" placeholder="e.g. High Court, Room 3" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} className="w-full text-sm border border-gray-200 rounded px-3 py-2 outline-none" />
                        </div>
                      )}

                      {newEvent.type === 'meeting' && (
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Meeting Link</label>
                          <input type="url" placeholder="https://meet.google.com/..." value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} className="w-full text-sm border border-gray-200 rounded px-3 py-2 outline-none" />
                          <div className="flex items-center gap-2 mt-3">
                            <input type="checkbox" id="send-invite" defaultChecked className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <label htmlFor="send-invite" className="text-sm text-gray-700">Send email invitation with Meet link to client</label>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                      <button onClick={() => setShowEventForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
                      <button onClick={handleAddEvent} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-2">
                        {newEvent.type === 'meeting' ? <><Video className="w-4 h-4" /> Schedule Meet</> : <><Calendar className="w-4 h-4"/> Add Event</>}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {localEvents.map(evt => (
                    <div key={evt.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold">{evt.date.split('-')[2] || 'TBD'}</span>
                          <span className="text-[10px] uppercase">{evt.date ? new Date(evt.date).toLocaleString('default', { month: 'short' }) : ''}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{evt.title}</p>
                            <StatusBadge status={evt.type} />
                          </div>
                          <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3.5 h-3.5"/> {evt.time} {evt.duration ? `(${evt.duration}m)` : ''} {evt.location ? `• ${evt.location}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {evt.meetLink && evt.type === 'consultation' && (
                          <a href={evt.meetLink} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded flex items-center gap-1.5 transition">
                            <Video className="w-3.5 h-3.5" /> Join Meet
                          </a>
                        )}
                        <button className="p-1.5 text-gray-400 hover:text-gray-900 transition"><Edit2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                  {localEvents.length === 0 && <p className="text-sm text-gray-500 italic">No events or meetings scheduled for this matter.</p>}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>Matter Documents</h3>
                    <p className="text-sm text-gray-500">Manage case files and adjust client visibility.</p>
                  </div>
                  <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-800 transition">
                    + Upload File
                  </button>
                </div>

                <div className="space-y-3">
                  {myDocs.map(doc => (
                    <div key={doc.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-4">
                      <div className="p-2 bg-gray-50 rounded text-gray-400"><FileText className="w-5 h-5" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          <span>{formatSize(doc.size)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.uploadedAt)}</span>
                          <span>•</span>
                          <span className={`${doc.visibility === 'client' ? 'text-blue-600' : 'text-amber-600'}`}>{doc.visibility === 'client' ? 'Visible to Client' : 'Internal Only'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 text-gray-400 hover:text-gray-900 transition"><Edit2 className="w-4 h-4" /></button>
                        <button className="p-1.5 text-gray-400 hover:text-blue-600 transition"><Download className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                  {myDocs.length === 0 && <p className="text-sm text-gray-500 italic">No documents uploaded for this matter.</p>}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-900" />
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fee & Billing Summary</h3>
                {isEditingFee ? (
                  <button onClick={handleSaveFee} className="text-emerald-600 hover:text-emerald-700 p-1"><Save className="w-4 h-4"/></button>
                ) : (
                  <button onClick={() => setIsEditingFee(true)} className="text-gray-400 hover:text-gray-900 p-1"><Edit2 className="w-3.5 h-3.5"/></button>
                )}
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span className="text-gray-500 font-medium">Total Fee</span>
                  {isEditingFee ? (
                    <div className="flex items-center gap-1 bg-white border border-gray-300 rounded px-2 py-1 w-24">
                      <span className="text-gray-500">₹</span>
                      <input 
                        type="text" 
                        value={editedFee} 
                        onChange={e => setEditedFee(e.target.value)}
                        className="w-full outline-none text-right font-medium"
                      />
                    </div>
                  ) : (
                    <span className="font-semibold text-gray-900">{formatCurrency(matter.totalFee)}</span>
                  )}
                </div>
                <div className="flex justify-between px-2"><span className="text-gray-500">Paid</span><span className="text-emerald-600 font-medium">{formatCurrency(matter.paidAmount)}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-3 px-2"><span className="text-gray-500 font-medium">Due Balance</span><span className={`font-bold ${matter.dueAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatCurrency(matter.dueAmount)}</span></div>
              </div>
              <button onClick={handleGenerateInvoice} className="w-full bg-white border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Generate Invoice</button>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Internal Details</h3>
                <button className="text-xs text-blue-600 hover:underline">Edit Details</button>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between"><span className="text-gray-400">Expertise:</span> <span>{matter.expertiseArea}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Mode:</span> <span className="capitalize">{matter.consultationMode}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Created:</span> <span>{formatDate(matter.createdAt)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Updated:</span> <span>{formatDate(matter.lastUpdated)}</span></div>
              </div>
            </div>

            {myInvoices.length > 0 && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Recent Invoices</h3>
                <div className="space-y-2">
                  {myInvoices.slice(0, 3).map(inv => (
                    <div key={inv.id} className="flex items-center justify-between bg-white p-2 rounded border border-gray-100 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{formatCurrency(inv.totalAmount)}</p>
                        <p className="text-xs text-gray-400">{inv.id}</p>
                      </div>
                      <StatusBadge status={inv.status} size="sm" />
                    </div>
                  ))}
                </div>
                <button className="w-full text-xs text-gray-500 hover:text-gray-900 font-medium pt-2">View All Invoices</button>
              </div>
            )}

            {myThreads.length > 0 && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Linked Messages</h3>
                <div className="space-y-2">
                  {myThreads.slice(0, 3).map(thread => (
                    <div key={thread.id} onClick={() => onChat(thread.id)} className="cursor-pointer group flex items-start gap-3 bg-white p-3 rounded border border-gray-100 text-sm hover:border-blue-200 transition">
                      <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="font-medium text-gray-900 truncate">{thread.matterTitle || 'General'}</p>
                          {thread.unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500" />}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1">{thread.lastMessage}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => onChat(myThreads[0].id)} className="w-full text-xs text-gray-500 hover:text-gray-900 font-medium pt-2">Open Messages Desk</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {showClientSimulation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>Client View Simulation</h2>
              <button onClick={() => setShowClientSimulation(false)} className="text-gray-400 hover:text-gray-900 transition"><X className="w-5 h-5"/></button>
            </div>
            <p className="text-sm text-gray-500 mb-6">This simulates the client experience. When the client selects a package below, it confirms the service tier and automatically updates the matter fee structure.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matterPackages.map(pkg => (
                <div key={pkg.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex flex-col hover:border-gray-900 transition cursor-pointer group" onClick={() => {
                  applyPackageFee(pkg.price);
                  setShowClientSimulation(false);
                  
                  const packageEvent: PlatformEvent = {
                    id: `EVT-${Date.now()}`,
                    title: `Package Selected: ${pkg.name}`,
                    type: 'package_selection',
                    clientId: matter.clientId,
                    clientName: matter.clientName,
                    matterId: matter.id,
                    matterTitle: matter.title,
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    duration: 0,
                    mode: 'office',
                    visibleToClient: true,
                    actionCTA: '',
                    notes: `Client selected the ${pkg.name} package for ${formatCurrency(pkg.price)}`,
                    status: 'completed'
                  };
                  setLocalEvents([...localEvents, packageEvent]);
                }}>
                  <h4 className="font-medium text-gray-900">{pkg.name}</h4>
                  <p className="text-2xl font-semibold text-gray-900 mt-2 mb-4">{formatCurrency(pkg.price)}</p>
                  <ul className="text-sm text-gray-600 space-y-2 flex-1 mb-6">
                    {pkg.points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0"/> {pt}</li>
                    ))}
                  </ul>
                  <div className="w-full py-2 text-center text-sm font-medium border border-gray-900 text-gray-900 rounded group-hover:bg-gray-900 group-hover:text-white transition">
                    Simulate Client Selection
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
