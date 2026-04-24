import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, Video, MessageSquare, FileText, Download, 
  Edit2, Clock, Check,
  Package, Save, Calendar
} from 'lucide-react';
import { StatusBadge, UrgencyDot } from '../components/dashboard/StatusBadge';
import { LifecycleStepper } from '../components/dashboard/LifecycleStepper';
import { 
  formatCurrency, formatDate, getServiceName, SERVICES, LIFECYCLE_STAGES,
  type Matter, type Invoice, type PlatformEvent, type PlatformDocument, type MessageThread 
} from '../data/seedData';
import type { MatterPackageProposalsResponse } from '../lib/api/contracts';
import { PackageBuilder, type PackageTier } from './PackageBuilder';

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface MatterDetailAdminProps {
  assignmentOptions?: {
    counsel: Array<{ id: string; name: string }>;
    staff: Array<{ id: string; name: string }>;
  };
  matter: Matter;
  isPackageLoading?: boolean;
  packageErrorMessage?: string | null;
  packageWorkspace?: MatterPackageProposalsResponse | null;
  onAddMatterNote?: (payload: { bodyText: string; title: string; visibleToClient?: boolean }) => Promise<void>;
  onArchiveProposal?: (proposalVersion: number) => Promise<void>;
  onAssignMatter?: (payload: {
    assignmentRoleCode: string;
    counselPartnerId?: string;
    internalUserId?: string;
    isPrimary?: boolean;
    notes?: string;
  }) => Promise<void>;
  onBack: () => void;
  onChat: (threadId: string | null) => void;
  onCreateEvent?: (payload: {
    clientAccountId?: string;
    date: string;
    durationMinutes?: number;
    matterId?: string;
    meetLink?: string;
    mode: string;
    notes?: string;
    time: string;
    title: string;
    type: string;
    visibleToClient?: boolean;
  }) => Promise<void>;
  onSaveMatterDetails?: (payload: {
    issueSummary?: string;
    operationalStatusCode?: string;
    quotedTotalAmount?: number;
    selectedServices?: string[];
  }) => Promise<void>;
  onSavePackageDraft?: (packages: PackageTier[]) => Promise<void>;
  onOverridePackageSelection?: (matterPackageId: string, reasonText: string) => Promise<void>;
  onPublishProposal?: (proposalVersion: number) => Promise<void>;
  onUpdateStage?: (payload: {
    changeNote?: string;
    operationalStatusCode?: string;
    stageCode: string;
    visibleToClient?: boolean;
  }) => Promise<void>;
  myInvoices: Invoice[];
  myDocs: PlatformDocument[];
  myEvents: PlatformEvent[];
  myThreads: MessageThread[];
  onUpdateFee: (matterId: string, newFee: number) => Promise<void> | void;
}

export const MatterDetailAdmin: React.FC<MatterDetailAdminProps> = ({ 
  assignmentOptions,
  isPackageLoading = false,
  matter: initialMatter,
  onAddMatterNote,
  onArchiveProposal,
  onAssignMatter,
  onBack,
  onChat,
  onCreateEvent,
  onOverridePackageSelection,
  onPublishProposal,
  onSaveMatterDetails,
  onSavePackageDraft,
  onUpdateFee,
  onUpdateStage,
  packageErrorMessage,
  packageWorkspace,
  myInvoices,
  myDocs,
  myEvents: initialEvents,
  myThreads,
}) => {
  const [matter, setMatter] = useState(initialMatter);
  const [localEvents, setLocalEvents] = useState<PlatformEvent[]>(initialEvents);
  
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [editedFee, setEditedFee] = useState(matter.totalFee.toString());
  const [isSavingPackageDraft, setIsSavingPackageDraft] = useState(false);
  const [isPublishingProposal, setIsPublishingProposal] = useState(false);
  const [isOverridingPackage, setIsOverridingPackage] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'documents'>('overview');
  
  const [showEventForm, setShowEventForm] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState(matter.issueSummary);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [editedServices, setEditedServices] = useState<string[]>(matter.selectedServices);
  
  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const [isEditingMatter, setIsEditingMatter] = useState(false);
  const [isSavingMatter, setIsSavingMatter] = useState(false);
  const [assignmentDraft, setAssignmentDraft] = useState({
    counselPartnerId: '',
    internalUserId: '',
  });
  
  // Add Event state
  const [newEvent, setNewEvent] = useState({
    title: '', date: '', time: '', type: 'meeting', location: ''
  });

  useEffect(() => {
    setMatter(initialMatter);
    setLocalEvents(initialEvents);
    setEditedFee(initialMatter.totalFee.toString());
    setEditedSummary(initialMatter.issueSummary);
    setEditedServices(initialMatter.selectedServices);
  }, [initialEvents, initialMatter]);

  const handleSaveFee = async () => {
    const fee = parseInt(editedFee.replace(/,/g, '')) || 0;
    await onUpdateFee(matter.id, fee);
    setMatter({ ...matter, totalFee: fee });
    setIsEditingFee(false);
  };

  const handleSavePackages = async (packages: PackageTier[]) => {
    if (!onSavePackageDraft) {
      return;
    }

    setIsSavingPackageDraft(true);
    try {
      await onSavePackageDraft(packages);
    } finally {
      setIsSavingPackageDraft(false);
    }
  };

  const handlePublishPackages = async () => {
    if (!packageWorkspace?.draft || !onPublishProposal) {
      return;
    }

    setIsPublishingProposal(true);
    try {
      await onPublishProposal(packageWorkspace.draft.proposalVersion);
    } finally {
      setIsPublishingProposal(false);
    }
  };

  const handleArchivePackages = async (proposalVersion: number) => {
    if (!onArchiveProposal) {
      return;
    }

    if (!window.confirm(`Archive proposal version ${proposalVersion}?`)) {
      return;
    }

    await onArchiveProposal(proposalVersion);
  };

  const handleOverridePackage = async (matterPackageId: string, packageName: string) => {
    if (!onOverridePackageSelection) {
      return;
    }

    const reasonText = window.prompt(`Why are you overriding the selection to "${packageName}"?`);
    if (!reasonText?.trim()) {
      return;
    }

    setIsOverridingPackage(true);
    try {
      await onOverridePackageSelection(matterPackageId, reasonText.trim());
    } finally {
      setIsOverridingPackage(false);
    }
  };

  const handleAddEvent = async () => {
    if (!onCreateEvent) {
      return;
    }

    const isMeeting = newEvent.type === 'meeting';
    await onCreateEvent({
      date: newEvent.date || new Date().toISOString().split('T')[0],
      durationMinutes: isMeeting ? 60 : 30,
      meetLink: isMeeting ? newEvent.location || undefined : undefined,
      mode: isMeeting ? 'video' : 'court',
      notes: '',
      time: newEvent.time || '10:00',
      title: newEvent.title || (isMeeting ? 'Scheduled Meeting' : 'New Event'),
      type: isMeeting ? 'consultation' : 'hearing',
      visibleToClient: true,
    });
    setShowEventForm(false);
    setNewEvent({ title: '', date: '', time: '', type: 'meeting', location: '' });
  };

  const handleStageUpdate = async (stageId: string) => {
    if (!onUpdateStage) {
      return;
    }

    const idx = LIFECYCLE_STAGES.findIndex(s => s.id === stageId);
    const newStages = LIFECYCLE_STAGES.map((s, i) => ({
      id: s.id as any,
      label: s.label,
      completed: i <= idx
    }));
    await onUpdateStage({
      operationalStatusCode: matter.operationalStatus,
      stageCode: stageId,
      visibleToClient: true,
    });
    setMatter({ ...matter, lifecycleStage: stageId as any, stages: newStages });
    setShowStageDropdown(false);
  };

  const handleSaveMatter = async () => {
    if (!onSaveMatterDetails) {
      setIsEditingMatter(false);
      return;
    }

    setIsSavingMatter(true);
    try {
      await onSaveMatterDetails({
        issueSummary: matter.issueSummary,
        operationalStatusCode: matter.operationalStatus,
        quotedTotalAmount: matter.totalFee,
        selectedServices: matter.selectedServices,
      });
      setIsEditingMatter(false);
    } finally {
      setIsSavingMatter(false);
    }
  };

  const STAGES_LIST = LIFECYCLE_STAGES.map(s => ({
    id: s.id, label: s.label
  }));
  const editorPackages: PackageTier[] =
    packageWorkspace?.draft?.packages?.map((pkg) => ({
      description: pkg.description,
      id: pkg.id,
      isRecommended: pkg.isRecommended,
      name: pkg.name,
      points: pkg.featurePoints,
      price: pkg.price,
    })) ||
    packageWorkspace?.active?.packages?.map((pkg) => ({
      description: pkg.description,
      id: pkg.id,
      isRecommended: pkg.isRecommended,
      name: pkg.name,
      points: pkg.featurePoints,
      price: pkg.price,
    })) ||
    [];
  const selectedPackage =
    packageWorkspace?.active?.packages.find((pkg) => pkg.isSelected) ||
    packageWorkspace?.history.flatMap((proposal) => proposal.packages).find((pkg) => pkg.isSelected) ||
    null;
  const selectedPackageVersion =
    packageWorkspace?.active?.packages.some((pkg) => pkg.isSelected)
      ? packageWorkspace.active.proposalVersion
      : packageWorkspace?.history.find((proposal) => proposal.packages.some((pkg) => pkg.isSelected))
          ?.proposalVersion;
  const linkedPackageInvoice =
    packageWorkspace?.linkedInvoiceSummary || packageWorkspace?.active?.linkedInvoice || null;

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
              <button
                onClick={() => void handleSaveMatter()}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 transition disabled:opacity-50"
                disabled={isSavingMatter}
              >
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
                    <div className="flex items-center gap-2">
                      {packageWorkspace?.draft && onArchiveProposal ? (
                        <button
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                          onClick={() => void handleArchivePackages(packageWorkspace.draft!.proposalVersion)}
                          type="button"
                        >
                          Archive Draft
                        </button>
                      ) : null}
                      {packageWorkspace?.draft && onPublishProposal ? (
                        <button
                          className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
                          disabled={isPublishingProposal}
                          onClick={() => void handlePublishPackages()}
                          type="button"
                        >
                          {isPublishingProposal ? 'Publishing...' : 'Publish to Client'}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {packageErrorMessage ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {packageErrorMessage}
                    </p>
                  ) : isPackageLoading && !packageWorkspace ? (
                    <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                      Loading package proposal workspace...
                    </p>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                            Draft Workspace
                          </p>
                          <p className="mt-2 text-sm text-gray-700">
                            {packageWorkspace?.draft
                              ? `Version ${packageWorkspace.draft.proposalVersion} ready for final edits.`
                              : 'No draft exists yet. Save the package builder to create one.'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                            Active Proposal
                          </p>
                          <p className="mt-2 text-sm text-gray-700">
                            {packageWorkspace?.active
                              ? `Version ${packageWorkspace.active.proposalVersion} is ${packageWorkspace.active.status}.`
                              : 'No proposal has been published to the client yet.'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                            Invoice Link
                          </p>
                          <p className="mt-2 text-sm text-gray-700">
                            {linkedPackageInvoice
                              ? `${linkedPackageInvoice.invoiceNumber} is ${linkedPackageInvoice.statusCode}.`
                              : 'A package invoice will auto-generate after client selection.'}
                          </p>
                        </div>
                      </div>

                      <PackageBuilder
                        existingPackages={editorPackages}
                        isSaving={isSavingPackageDraft}
                        matterId={matter.id}
                        onSave={(packages) => void handleSavePackages(packages)}
                        saveLabel={packageWorkspace?.draft ? 'Update Draft' : 'Save Draft'}
                      />

                      {packageWorkspace?.active ? (
                        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h4 className="text-base font-medium text-gray-900">Client-Facing Proposal</h4>
                              <p className="text-sm text-gray-500">
                                Version {packageWorkspace.active.proposalVersion} · {packageWorkspace.active.status}
                              </p>
                            </div>
                            {packageWorkspace.active.linkedInvoice ? (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                                Invoice {packageWorkspace.active.linkedInvoice.invoiceNumber}
                              </span>
                            ) : (
                              <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                                Client review open
                              </span>
                            )}
                          </div>

                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {packageWorkspace.active.packages.map((pkg) => (
                              <div
                                key={pkg.id}
                                className={`flex flex-col rounded-xl border p-5 shadow-sm ${
                                  pkg.isRecommended ? 'border-gray-900 ring-1 ring-gray-900/10' : 'border-gray-200'
                                }`}
                              >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                  <div>
                                    <h5 className="font-medium text-gray-900">{pkg.name}</h5>
                                    <p className="mt-1 text-sm text-gray-500">
                                      {pkg.description || 'Client-facing package description pending.'}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    {pkg.isRecommended ? (
                                      <span className="rounded-full bg-gray-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                                        Recommended
                                      </span>
                                    ) : null}
                                    {pkg.isSelected ? (
                                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                                        Selected
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                <p className="mb-4 text-2xl font-semibold text-gray-900">
                                  {formatCurrency(pkg.price)}
                                </p>

                                <div className="flex-1 space-y-2">
                                  {pkg.featurePoints.map((point, index) => (
                                    <div key={`${pkg.id}-${index}`} className="flex items-start gap-2 text-sm text-gray-700">
                                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                                      <span>{point}</span>
                                    </div>
                                  ))}
                                </div>

                                {!pkg.isSelected && packageWorkspace.active?.status === 'selected' && onOverridePackageSelection ? (
                                  <button
                                    className="mt-5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                                    disabled={isOverridingPackage}
                                    onClick={() => void handleOverridePackage(pkg.id, pkg.name)}
                                    type="button"
                                  >
                                    {isOverridingPackage ? 'Updating...' : 'Override Selection'}
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {packageWorkspace?.history.length ? (
                        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-base font-medium text-gray-900">Proposal History</h4>
                            <span className="text-xs uppercase tracking-wider text-gray-400">
                              {packageWorkspace.history.length} archived record(s)
                            </span>
                          </div>
                          <div className="space-y-3">
                            {packageWorkspace.history.map((proposal) => (
                              <div
                                key={proposal.proposalVersion}
                                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
                              >
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    Version {proposal.proposalVersion}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {proposal.status} · {proposal.packages.length} package option(s)
                                  </p>
                                </div>
                                {proposal.status === 'superseded' && onArchiveProposal ? (
                                  <button
                                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                                    onClick={() => void handleArchivePackages(proposal.proposalVersion)}
                                    type="button"
                                  >
                                    Archive
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
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
                  {isEditingMatter && (
                    <button
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => {
                        if (!onAddMatterNote) {
                          return;
                        }

                        const bodyText = window.prompt('Add a client-visible update');
                        if (!bodyText?.trim()) {
                          return;
                        }

                        void onAddMatterNote({
                          bodyText: bodyText.trim(),
                          title: 'Matter update',
                          visibleToClient: true,
                        });
                      }}
                      type="button"
                    >
                      + Add Update
                    </button>
                  )}
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
                  {isEditingMatter && (
                    <button
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => {
                        if (!onAddMatterNote) {
                          return;
                        }

                        const bodyText = window.prompt('Add an internal note');
                        if (!bodyText?.trim()) {
                          return;
                        }

                        void onAddMatterNote({
                          bodyText: bodyText.trim(),
                          title: 'Internal note',
                          visibleToClient: false,
                        });
                      }}
                      type="button"
                    >
                      + Add Note
                    </button>
                  )}
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
                  <button className="bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2 cursor-not-allowed">
                    Upload Later
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
              {linkedPackageInvoice ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Latest package invoice: <span className="font-semibold">{linkedPackageInvoice.invoiceNumber}</span>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500">
                  Invoice will generate automatically after the client confirms a package.
                </div>
              )}
            </div>

            {selectedPackage ? (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Selected Package</h3>
                <p className="text-sm font-medium text-gray-900">{selectedPackage.name}</p>
                <p className="text-xs text-gray-500">
                  {selectedPackageVersion ? `Proposal v${selectedPackageVersion} · ` : ''}
                  {formatCurrency(selectedPackage.price)}
                </p>
              </div>
            ) : null}

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Internal Details</h3>
                <button className="text-xs text-blue-600 hover:underline" onClick={() => setIsEditingMatter(true)} type="button">
                  Edit Details
                </button>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between"><span className="text-gray-400">Expertise:</span> <span>{matter.expertiseArea}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Mode:</span> <span className="capitalize">{matter.consultationMode}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Created:</span> <span>{formatDate(matter.createdAt)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Updated:</span> <span>{formatDate(matter.lastUpdated)}</span></div>
              </div>
              {isEditingMatter && assignmentOptions ? (
                <div className="pt-3 border-t border-gray-200 space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Assigned Staff</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                      onChange={(event) =>
                        setAssignmentDraft((current) => ({
                          ...current,
                          internalUserId: event.target.value,
                        }))
                      }
                      value={assignmentDraft.internalUserId}
                    >
                      <option value="">Keep current</option>
                      {assignmentOptions.staff.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Assigned Counsel</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                      onChange={(event) =>
                        setAssignmentDraft((current) => ({
                          ...current,
                          counselPartnerId: event.target.value,
                        }))
                      }
                      value={assignmentDraft.counselPartnerId}
                    >
                      <option value="">Keep current</option>
                      {assignmentOptions.counsel.map((counsel) => (
                        <option key={counsel.id} value={counsel.id}>
                          {counsel.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="w-full text-xs font-medium bg-white border border-gray-200 rounded-lg py-2 text-gray-700 disabled:opacity-50"
                    disabled={!assignmentDraft.counselPartnerId && !assignmentDraft.internalUserId}
                    onClick={() => {
                      if (!onAssignMatter) {
                        return;
                      }

                      if (assignmentDraft.internalUserId) {
                        void onAssignMatter({
                          assignmentRoleCode: 'internal_owner',
                          internalUserId: assignmentDraft.internalUserId,
                          isPrimary: true,
                        }).then(() =>
                          setAssignmentDraft((current) => ({ ...current, internalUserId: '' }))
                        );
                      }

                      if (assignmentDraft.counselPartnerId) {
                        void onAssignMatter({
                          assignmentRoleCode: 'lead_counsel',
                          counselPartnerId: assignmentDraft.counselPartnerId,
                          isPrimary: true,
                        }).then(() =>
                          setAssignmentDraft((current) => ({ ...current, counselPartnerId: '' }))
                        );
                      }
                    }}
                    type="button"
                  >
                    Save Assignments
                  </button>
                </div>
              ) : null}
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
    </div>
  );
};
