// Shared admin view types.
// Historical sample records were removed so routed production pages cannot fall back to fake data.

// ---- ENUMS & TYPES ----

export type LifecycleStage = 'request-received' | 'verification-call' | 'consultation' | 'action-plan' | 'resolution';
export type OperationalStatus = 'new-lead' | 'awaiting-verification' | 'verification-scheduled' | 'verification-done' |
  'consultation-scheduled' | 'consultation-completed' | 'fee-pending' | 'package-ready' | 'invoice-sent' |
  'awaiting-payment' | 'paid' | 'work-in-progress' | 'awaiting-client' | 'awaiting-team' | 'immediate' |
  'completed' | 'archived' | 'lost-closed' | 'active' | 'awaiting-internal' | 'blocked' | 'stale';
export type PriorityBadge = 'in-progress' | 'immediate-6h' | 'awaiting-client' | 'awaiting-team' | 'completed' | 'on-hold';
export type UserLifecycle = 'registered' | 'lead' | 'consultation-scheduled' | 'consultation-completed' | 'fee-pending' | 'client' | 'archived';
export type InvoiceStatus = 'draft' | 'sent' | 'pending' | 'paid' | 'overdue' | 'failed' | 'refunded' | 'void';
export type EventType = 'verification-call' | 'consultation' | 'hearing' | 'field-visit' | 'deadline' | 'reminder' | 'package_selection' | 'proposal';

export interface PackageTier {
  id: string;
  name: string;
  price: number;
  description: string;
  deliverables: string[];
  isRecommended?: boolean;
}

export type ConsultationMode = 'video' | 'phone' | 'in-person';
export type AdminRole = 'super-admin' | 'management' | 'billing-admin' | 'case-manager' | 'messaging-desk' | 'team-coordinator';
export type DocReviewState = 'unreviewed' | 'reviewed' | 'requires-revision';

export const LIFECYCLE_STAGES: { id: LifecycleStage; label: string }[] = [
  { id: 'request-received', label: 'Request Received' },
  { id: 'verification-call', label: 'Verification Call' },
  { id: 'consultation', label: 'Consultation' },
  { id: 'action-plan', label: 'Action Plan' },
  { id: 'resolution', label: 'Resolution' },
];

export const SERVICES: Array<{ baseFee: number; description: string; icon: string; id: string; name: string }> = [];
export const EXPERTISE_AREAS: string[] = [];
export const PRICING_TIERS: Array<{ count: number; fee: number }> = [];
export const calculateFee = (n: number) => PRICING_TIERS.find(t => t.count === n)?.fee ?? 0;
export const TIME_SLOTS: string[] = [];

// ---- INTERFACES ----

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  accountStatus?: string;
  companyName?: string;
  lifecycle: UserLifecycle;
  joinedAt: string;
  lastActiveAt: string;
  owner?: string;
  region?: string;
}

export interface Lead {
  id: string;
  userId: string;
  status: 'new-lead' | 'awaiting-verification' | 'consultation-scheduled' | 'consultation-completed' | 'fee-pending' | 'converted' | 'lost-closed';
  selectedServices: string[];
  expertiseArea: string;
  urgency: 'standard' | 'within-6hrs' | 'within-2hrs' | 'high';
  consultationMode: ConsultationMode;
  preferredSlot: string;
  issueSummary: string;
  createdAt: string;
  assignedOwner: string;
  paymentStatus: 'none' | 'invoice-sent' | 'paid' | 'overdue';
  consultationStatus: 'not-scheduled' | 'scheduled' | 'completed' | 'cancelled';
  notes: string;
}

export interface StageItem { id: LifecycleStage; label: string; completed: boolean }

export interface Matter {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  referenceCode: string;
  lifecycleStage: LifecycleStage;
  stages: StageItem[];
  operationalStatus: OperationalStatus;
  priority: PriorityBadge;
  selectedServices: string[];
  expertiseArea: string;
  issueSummary: string;
  urgency: 'standard' | 'within-6hrs' | 'within-2hrs' | 'high';
  consultationMode: ConsultationMode;
  assignedCounsel?: string;
  assignedStaff?: string;
  assignments?: Array<{
    id: string;
    name: string;
    type: 'external_counsel' | 'field_partner' | 'internal_staff';
    visibleToClient: boolean;
  }>;
  packageId?: string;
  totalFee: number;
  paidAmount: number;
  dueAmount: number;
  meetingLink?: string;
  createdAt: string;
  lastUpdated: string;
  clientVisibleNotes: string[];
  internalNotes: string[];
}

export interface MatterPackage {
  id: string;
  matterId: string;
  name: string;
  description: string;
  services: string[];
  price: number;
  createdBy: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  matterId: string;
  matterRef: string;
  matterTitle: string;
  clientId: string;
  clientName: string;
  currencyCode?: string;
  amount: number;
  tax: number;
  discount: number;
  totalAmount: number;
  status: InvoiceStatus;
  template?: {
    body: string | null;
    footer: string | null;
    id: string | null;
    subject: string | null;
    terms: string | null;
    version: number | null;
  };
  business?: {
    address: string | null;
    email: string | null;
    gstin: string | null;
    name: string | null;
    paymentInstructions: string | null;
    phone: string | null;
    state: string | null;
    website: string | null;
  };
  billingSnapshot?: {
    addressLine1: string | null;
    addressLine2: string | null;
    billingEmail: string | null;
    billingName: string | null;
    billingPhone: string | null;
    city: string | null;
    countryCode: string | null;
    gstin: string | null;
    postalCode: string | null;
    state: string | null;
  } | null;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  items: Array<{
    amount: number;
    description: string;
    quantity: number;
    rate: number;
    taxes?: Array<{
      amount: number;
      code: string;
      name: string;
      percent: number;
      taxableAmount: number;
    }>;
  }>;
  clientNote?: string;
  internalNote?: string;
  lastReminder?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  matterId: string;
  clientId: string;
  clientName: string;
  amount: number;
  method: 'online' | 'bank-transfer' | 'cash' | 'cheque';
  status: 'success' | 'failed' | 'refunded';
  timestamp: string;
  recordedBy: string;
  reference: string;
}

export interface PlatformEvent {
  id: string;
  title: string;
  type: EventType;
  calendarSyncError?: string;
  calendarSyncStatus?: 'cancelled' | 'disabled' | 'failed' | 'local' | 'pending' | 'synced';
  calendarSyncedAt?: string;
  calendarOwnerEmail?: string;
  clientId: string;
  clientName: string;
  googleAttendeeStatus?: string;
  matterId: string;
  matterTitle: string;
  meetConferenceId?: string;
  date: string;
  time: string;
  duration: number;
  mode: ConsultationMode | 'court' | 'office';
  location?: string;
  meetLink?: string;
  visibleToClient: boolean;
  actionCTA: string;
  notes: string;
  reminderCount?: number;
  reminderStatus?: 'cancelled' | 'none' | 'scheduled';
  status: 'upcoming' | 'completed' | 'cancelled' | 'rescheduled';
  packages?: PackageTier[];
}

export interface PlatformDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  matterId: string;
  matterTitle: string;
  clientId: string;
  clientName: string;
  uploadedBy: string;
  uploadedAt: string;
  visibility: 'client' | 'internal';
  reviewState: DocReviewState;
  virusStatus?: string;
  docCategory: string;
  note?: string;
}

export interface MessageThread {
  id: string;
  clientId: string;
  clientName: string;
  matterId: string;
  matterTitle: string;
  matterRef: string;
  stage: LifecycleStage;
  urgency: 'standard' | 'within-6hrs' | 'within-2hrs' | 'high';
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  assignedTo: string;
  status: 'active' | 'waiting' | 'resolved';
}

export interface MessageAttachment {
  documentId: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: 'client' | 'admin' | 'system';
  content: string;
  timestamp: string;
  read: boolean;
  attachments?: MessageAttachment[];
}

export interface SystemNotification {
  id: string;
  title: string;
  body: string;
  type: 'billing' | 'document' | 'event' | 'matter' | 'message' | 'proposal' | 'system';
  date: string;
  source?: string;
  read: boolean;
  dismissed?: boolean;
  actionUrl?: string;
  clientId?: string;
  clientName?: string;
  matterId?: string;
  matterTitle?: string;
}

export interface Advocate {
  id: string;
  name: string;
  location: string;
  expertise: string[];
  yearsExperience: number;
  activeAssignments: number;
  workload: 'light' | 'moderate' | 'heavy';
  availability: 'available' | 'busy' | 'unavailable';
  feeAgreed: number;
  feePaid: number;
  feePending: number;
  avatar: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  assignedMatters: number;
  workload: 'light' | 'moderate' | 'heavy';
  status: 'active' | 'on-leave' | 'inactive';
  teamLead: string;
  avatar: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: AdminRole | 'client' | 'system';
  entityType: 'matter' | 'invoice' | 'payment' | 'document' | 'event' | 'user' | 'lead' | 'message';
  entityId: string;
  action: string;
  details?: string;
  oldValue?: string;
  newValue?: string;
  sourceModule: string;
}

// ---- EMPTY COMPATIBILITY EXPORTS ----
// Compatibility exports are intentionally empty. Routed admin pages must render API-backed data or empty states.
export const CURRENT_CLIENT: PlatformUser | null = null;
export const PLATFORM_USERS: PlatformUser[] = [];
export const MATTERS: Matter[] = [];
export const LEADS: Lead[] = [];
export const PACKAGES: MatterPackage[] = [];
export const INVOICES: Invoice[] = [];
export const PAYMENTS: Payment[] = [];
export const NOTIFICATIONS: SystemNotification[] = [];
export const EVENTS: PlatformEvent[] = [];
export const DOCUMENTS: PlatformDocument[] = [];
export const MESSAGE_THREADS: MessageThread[] = [];
export const CHAT_MESSAGES: ChatMessage[] = [];
export const ADVOCATES: Advocate[] = [];
export const STAFF_MEMBERS: StaffMember[] = [];
export const AUDIT_ENTRIES: AuditEntry[] = [];

export { formatCurrency, formatDate, formatDateTime } from './formatters';
export { getServiceName } from './referenceData';

export const getUserById = (id: string) => PLATFORM_USERS.find(u => u.id === id);
