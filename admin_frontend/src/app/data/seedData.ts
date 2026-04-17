// ============================================================
// SEED DATA - Comprehensive entities for LegalConnect Platform
// ============================================================

// ---- ENUMS & TYPES ----

export type LifecycleStage = 'request-received' | 'verification-call' | 'consultation' | 'action-plan' | 'resolution';
export type OperationalStatus = 'new-lead' | 'awaiting-verification' | 'verification-scheduled' | 'verification-done' |
  'consultation-scheduled' | 'consultation-completed' | 'fee-pending' | 'package-ready' | 'invoice-sent' |
  'awaiting-payment' | 'paid' | 'work-in-progress' | 'awaiting-client' | 'awaiting-team' | 'immediate' |
  'completed' | 'archived' | 'lost-closed';
export type PriorityBadge = 'in-progress' | 'immediate-6h' | 'awaiting-client' | 'awaiting-team' | 'completed' | 'on-hold';
export type UserLifecycle = 'registered' | 'lead' | 'consultation-scheduled' | 'consultation-completed' | 'fee-pending' | 'client' | 'archived';
export type InvoiceStatus = 'draft' | 'sent' | 'pending' | 'paid' | 'overdue' | 'failed' | 'refunded';
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

export const SERVICES = [
  { id: 'get-counsel', name: 'Get Me a Counsel', description: 'Representation & Arguments', icon: 'Users', baseFee: 1000 },
  { id: 'document-review', name: 'Document Review and Compliance Check', description: 'Audit & Verification', icon: 'FileCheck', baseFee: 1000 },
  { id: 'legal-drafting', name: 'Legal Drafting', description: 'Contracts, Notices, Applications', icon: 'FileText', baseFee: 1000 },
  { id: 'case-assessment', name: 'Case Assessment and Strategy', description: 'Merit Analysis & Planning', icon: 'Target', baseFee: 1000 },
  { id: 'litigation-monitoring', name: 'Litigation Monitoring', description: 'Shadow Counsel & Case Tracking', icon: 'Eye', baseFee: 1000 },
  { id: 'liaison-support', name: 'Liaison and Field Support', description: 'Registry, Filing, Police Station', icon: 'Briefcase', baseFee: 1000 },
  { id: 'court-technology', name: 'Court Technology and Digital Support', description: 'Live Hearings, E-courts', icon: 'Monitor', baseFee: 1000 },
];

export const EXPERTISE_AREAS = [
  'Property and Real Estate', 'Family', 'Corporate', 'Civil', 'Criminal',
  'Compliance', 'Employment', 'NRI / International', 'Other'
];

export const PRICING_TIERS = [
  { count: 1, fee: 1000 }, { count: 2, fee: 1500 }, { count: 3, fee: 2000 },
  { count: 4, fee: 2400 }, { count: 5, fee: 2700 }, { count: 6, fee: 2900 }, { count: 7, fee: 3000 }
];
export const calculateFee = (n: number) => PRICING_TIERS.find(t => t.count === n)?.fee ?? 0;

export const TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
];

// ---- INTERFACES ----

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
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
  urgency: 'standard' | 'within-6hrs' | 'within-2hrs';
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
  urgency: 'standard' | 'within-6hrs' | 'within-2hrs';
  consultationMode: ConsultationMode;
  assignedCounsel?: string;
  assignedStaff?: string;
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
  amount: number;
  tax: number;
  discount: number;
  totalAmount: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  items: { description: string; quantity: number; rate: number; amount: number }[];
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
  clientId: string;
  clientName: string;
  matterId: string;
  matterTitle: string;
  date: string;
  time: string;
  duration: number;
  mode: ConsultationMode | 'court' | 'office';
  location?: string;
  meetLink?: string;
  visibleToClient: boolean;
  actionCTA: string;
  notes: string;
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
  urgency: 'standard' | 'within-6hrs' | 'within-2hrs';
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  assignedTo: string;
  status: 'active' | 'waiting' | 'resolved';
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
  attachments?: string[];
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
  oldValue?: string;
  newValue?: string;
  sourceModule: string;
}

// ---- SEED DATA ----

export const CURRENT_CLIENT: PlatformUser = {
  id: 'user-1', name: 'Arjun Mehta', email: 'arjun.m@example.com', phone: '+91 98765 43210',
  avatar: '', lifecycle: 'client', joinedAt: '2024-08-15', lastActiveAt: '2026-03-24', owner: 'Priya Sharma', region: 'Mumbai'
};

export const PLATFORM_USERS: PlatformUser[] = [
  CURRENT_CLIENT,
  { id: 'user-2', name: 'Sneha Kapoor', email: 'sneha.k@example.com', phone: '+91 98765 43211', avatar: '', lifecycle: 'client', joinedAt: '2024-07-20', lastActiveAt: '2026-03-23', owner: 'Rahul Verma', region: 'Delhi' },
  { id: 'user-3', name: 'Vikram Singh', email: 'vikram.s@example.com', phone: '+91 98765 43212', avatar: '', lifecycle: 'client', joinedAt: '2024-09-10', lastActiveAt: '2026-03-22', owner: 'Priya Sharma', region: 'Bangalore' },
  { id: 'user-4', name: 'Ananya Desai', email: 'ananya.d@example.com', phone: '+91 98765 43213', avatar: '', lifecycle: 'client', joinedAt: '2024-11-01', lastActiveAt: '2026-03-24', owner: 'Kavita Nair', region: 'Chennai' },
  { id: 'user-5', name: 'Rohan Gupta', email: 'rohan.g@example.com', phone: '+91 98765 43214', avatar: '', lifecycle: 'fee-pending', joinedAt: '2025-01-05', lastActiveAt: '2026-03-20', owner: 'Rahul Verma', region: 'Mumbai' },
  { id: 'user-6', name: 'Meera Joshi', email: 'meera.j@example.com', phone: '+91 98765 43215', avatar: '', lifecycle: 'consultation-completed', joinedAt: '2025-02-12', lastActiveAt: '2026-03-19', owner: 'Priya Sharma', region: 'Pune' },
  { id: 'user-7', name: 'Karan Malhotra', email: 'karan.m@example.com', phone: '+91 98765 43216', avatar: '', lifecycle: 'consultation-completed', joinedAt: '2025-02-28', lastActiveAt: '2026-03-18', owner: 'Kavita Nair', region: 'Delhi' },
  { id: 'user-8', name: 'Priti Banerjee', email: 'priti.b@example.com', phone: '+91 98765 43217', avatar: '', lifecycle: 'consultation-scheduled', joinedAt: '2025-03-01', lastActiveAt: '2026-03-17', owner: 'Rahul Verma', region: 'Kolkata' },
  { id: 'user-9', name: 'Amit Patel', email: 'amit.p@example.com', phone: '+91 98765 43218', avatar: '', lifecycle: 'consultation-scheduled', joinedAt: '2025-03-05', lastActiveAt: '2026-03-24', owner: 'Priya Sharma', region: 'Ahmedabad' },
  { id: 'user-10', name: 'Deepa Reddy', email: 'deepa.r@example.com', phone: '+91 98765 43219', avatar: '', lifecycle: 'consultation-scheduled', joinedAt: '2025-03-08', lastActiveAt: '2026-03-23', owner: 'Kavita Nair', region: 'Hyderabad' },
  { id: 'user-11', name: 'Suresh Iyer', email: 'suresh.i@example.com', phone: '+91 98765 43220', avatar: '', lifecycle: 'lead', joinedAt: '2025-03-10', lastActiveAt: '2026-03-22', owner: 'Rahul Verma', region: 'Mumbai' },
  { id: 'user-12', name: 'Nisha Agarwal', email: 'nisha.a@example.com', phone: '+91 98765 43221', avatar: '', lifecycle: 'lead', joinedAt: '2025-03-12', lastActiveAt: '2026-03-24', owner: 'Priya Sharma', region: 'Delhi' },
  { id: 'user-13', name: 'Rajesh Kumar', email: 'rajesh.k@example.com', phone: '+91 98765 43222', avatar: '', lifecycle: 'lead', joinedAt: '2025-03-14', lastActiveAt: '2026-03-21', owner: 'Kavita Nair', region: 'Jaipur' },
  { id: 'user-14', name: 'Pooja Sharma', email: 'pooja.s@example.com', phone: '+91 98765 43223', avatar: '', lifecycle: 'lead', joinedAt: '2025-03-15', lastActiveAt: '2026-03-20', region: 'Lucknow' },
  { id: 'user-15', name: 'Manoj Tiwari', email: 'manoj.t@example.com', phone: '+91 98765 43224', avatar: '', lifecycle: 'registered', joinedAt: '2025-03-18', lastActiveAt: '2026-03-24', region: 'Bhopal' },
  { id: 'user-16', name: 'Kavita Menon', email: 'kavita.men@example.com', phone: '+91 98765 43225', avatar: '', lifecycle: 'registered', joinedAt: '2025-03-19', lastActiveAt: '2026-03-23', region: 'Kochi' },
  { id: 'user-17', name: 'Arun Saxena', email: 'arun.s@example.com', phone: '+91 98765 43226', avatar: '', lifecycle: 'registered', joinedAt: '2025-03-20', lastActiveAt: '2026-03-22', region: 'Chandigarh' },
  { id: 'user-18', name: 'Ritu Khanna', email: 'ritu.k@example.com', phone: '+91 98765 43227', avatar: '', lifecycle: 'registered', joinedAt: '2025-03-21', lastActiveAt: '2026-03-21', region: 'Gurgaon' },
  { id: 'user-19', name: 'Sanjay Mishra', email: 'sanjay.m@example.com', phone: '+91 98765 43228', avatar: '', lifecycle: 'registered', joinedAt: '2025-03-22', lastActiveAt: '2026-03-20', region: 'Noida' },
  { id: 'user-20', name: 'Lakshmi Rao', email: 'lakshmi.r@example.com', phone: '+91 98765 43229', avatar: '', lifecycle: 'registered', joinedAt: '2025-03-23', lastActiveAt: '2026-03-24', region: 'Bangalore' },
];

const makeStages = (current: LifecycleStage): StageItem[] => {
  const idx = LIFECYCLE_STAGES.findIndex(s => s.id === current);
  return LIFECYCLE_STAGES.map((s, i) => ({ id: s.id, label: s.label, completed: i <= idx }));
};

export const MATTERS: Matter[] = [
  {
    id: 'MTR-001', clientId: 'user-1', clientName: 'Arjun Mehta', title: 'RERA Dispute - Property Handover Delay',
    referenceCode: 'LC-2024-001', lifecycleStage: 'action-plan', stages: makeStages('action-plan'),
    operationalStatus: 'work-in-progress', priority: 'in-progress',
    selectedServices: ['get-counsel', 'case-assessment'], expertiseArea: 'Property and Real Estate',
    issueSummary: 'Delayed handover of residential flat by 18 months. Developer not responding to notices.',
    urgency: 'standard', consultationMode: 'video', assignedCounsel: 'Adv. Rajan Mehra', assignedStaff: 'Priya Sharma',
    packageId: 'PKG-001', totalFee: 25000, paidAmount: 15000, dueAmount: 10000,
    meetingLink: 'https://meet.google.com/abc-defg-hij', createdAt: '2024-10-24', lastUpdated: '2026-03-22',
    clientVisibleNotes: ['Legal notice sent to developer on 15 Nov 2024', 'RERA complaint filed on 10 Jan 2025', 'Next hearing scheduled for 28 Mar 2026'],
    internalNotes: ['Client cooperative, documents complete', 'Developer may settle - explore mediation']
  },
  {
    id: 'MTR-002', clientId: 'user-1', clientName: 'Arjun Mehta', title: 'Commercial Lease Review',
    referenceCode: 'LC-2024-002', lifecycleStage: 'consultation', stages: makeStages('consultation'),
    operationalStatus: 'consultation-completed', priority: 'immediate-6h',
    selectedServices: ['legal-drafting', 'document-review'], expertiseArea: 'Corporate',
    issueSummary: 'Review and redraft commercial lease agreement for new office space in BKC.',
    urgency: 'within-6hrs', consultationMode: 'video', assignedCounsel: 'Adv. Kavita Nair', assignedStaff: 'Rahul Verma',
    totalFee: 18000, paidAmount: 18000, dueAmount: 0,
    meetingLink: 'https://meet.google.com/xyz-abcd-efg', createdAt: '2024-11-15', lastUpdated: '2026-03-24',
    clientVisibleNotes: ['Draft lease reviewed, 12 clauses flagged', 'Revised draft shared with landlord counsel'],
    internalNotes: ['Landlord counsel slow to respond']
  },
  {
    id: 'MTR-003', clientId: 'user-2', clientName: 'Sneha Kapoor', title: 'Divorce Proceedings',
    referenceCode: 'LC-2024-003', lifecycleStage: 'action-plan', stages: makeStages('action-plan'),
    operationalStatus: 'work-in-progress', priority: 'in-progress',
    selectedServices: ['get-counsel', 'liaison-support'], expertiseArea: 'Family',
    issueSummary: 'Mutual consent divorce with custody arrangement for two children.',
    urgency: 'standard', consultationMode: 'in-person', assignedCounsel: 'Adv. Sunita Rao', assignedStaff: 'Kavita Nair',
    packageId: 'PKG-002', totalFee: 35000, paidAmount: 20000, dueAmount: 15000,
    createdAt: '2024-09-20', lastUpdated: '2026-03-21',
    clientVisibleNotes: ['Petition filed on 5 Dec 2024', 'First motion hearing completed on 15 Feb 2025'],
    internalNotes: ['Spouse cooperative', 'Custody terms mostly agreed']
  },
  {
    id: 'MTR-004', clientId: 'user-2', clientName: 'Sneha Kapoor', title: 'Maintenance Application',
    referenceCode: 'LC-2025-004', lifecycleStage: 'verification-call', stages: makeStages('verification-call'),
    operationalStatus: 'verification-scheduled', priority: 'awaiting-client',
    selectedServices: ['case-assessment'], expertiseArea: 'Family',
    issueSummary: 'Interim maintenance application under Section 125 CrPC.',
    urgency: 'standard', consultationMode: 'phone', assignedStaff: 'Priya Sharma',
    totalFee: 0, paidAmount: 0, dueAmount: 0,
    createdAt: '2025-03-10', lastUpdated: '2026-03-20',
    clientVisibleNotes: ['Verification call scheduled for 25 Mar 2026'],
    internalNotes: ['Linked to MTR-003']
  },
  {
    id: 'MTR-005', clientId: 'user-3', clientName: 'Vikram Singh', title: 'Startup Incorporation & Compliance',
    referenceCode: 'LC-2025-005', lifecycleStage: 'resolution', stages: makeStages('resolution'),
    operationalStatus: 'completed', priority: 'completed',
    selectedServices: ['legal-drafting', 'document-review', 'court-technology'], expertiseArea: 'Corporate',
    issueSummary: 'Private limited company incorporation with DPIIT registration and compliance setup.',
    urgency: 'standard', consultationMode: 'video', assignedCounsel: 'Adv. Rajan Mehra', assignedStaff: 'Rahul Verma',
    packageId: 'PKG-003', totalFee: 45000, paidAmount: 45000, dueAmount: 0,
    createdAt: '2024-10-01', lastUpdated: '2025-12-15',
    clientVisibleNotes: ['Company incorporated successfully', 'All compliance documents filed'],
    internalNotes: ['Clean completion, good for referral']
  },
  {
    id: 'MTR-006', clientId: 'user-3', clientName: 'Vikram Singh', title: 'Employment Agreement Disputes',
    referenceCode: 'LC-2025-006', lifecycleStage: 'consultation', stages: makeStages('consultation'),
    operationalStatus: 'fee-pending', priority: 'awaiting-client',
    selectedServices: ['case-assessment', 'legal-drafting'], expertiseArea: 'Employment',
    issueSummary: 'Non-compete clause dispute with former employer. Seeking legal opinion and strategy.',
    urgency: 'within-6hrs', consultationMode: 'video', assignedCounsel: 'Adv. Kavita Nair',
    totalFee: 15000, paidAmount: 0, dueAmount: 15000,
    createdAt: '2025-03-01', lastUpdated: '2026-03-23',
    clientVisibleNotes: ['Consultation completed on 18 Mar 2026', 'Fee invoice sent'],
    internalNotes: ['Strong case for client', 'Non-compete likely unenforceable']
  },
  {
    id: 'MTR-007', clientId: 'user-4', clientName: 'Ananya Desai', title: 'Criminal Defamation Defense',
    referenceCode: 'LC-2025-007', lifecycleStage: 'action-plan', stages: makeStages('action-plan'),
    operationalStatus: 'immediate', priority: 'immediate-6h',
    selectedServices: ['get-counsel', 'litigation-monitoring', 'case-assessment'], expertiseArea: 'Criminal',
    issueSummary: 'Defamation case filed by former business partner. Need urgent defense strategy.',
    urgency: 'within-2hrs', consultationMode: 'video', assignedCounsel: 'Adv. Sunita Rao', assignedStaff: 'Kavita Nair',
    packageId: 'PKG-004', totalFee: 50000, paidAmount: 30000, dueAmount: 20000,
    meetingLink: 'https://meet.google.com/klm-nopq-rst', createdAt: '2025-02-01', lastUpdated: '2026-03-24',
    clientVisibleNotes: ['Bail application prepared', 'Next hearing: 26 Mar 2026'],
    internalNotes: ['High priority - court date approaching', 'Need senior counsel backup']
  },
  {
    id: 'MTR-008', clientId: 'user-4', clientName: 'Ananya Desai', title: 'Consumer Complaint - Product Liability',
    referenceCode: 'LC-2025-008', lifecycleStage: 'request-received', stages: makeStages('request-received'),
    operationalStatus: 'new-lead', priority: 'in-progress',
    selectedServices: ['case-assessment'], expertiseArea: 'Civil',
    issueSummary: 'Defective product caused injury. Filing consumer complaint against manufacturer.',
    urgency: 'standard', consultationMode: 'phone',
    totalFee: 0, paidAmount: 0, dueAmount: 0,
    createdAt: '2026-03-20', lastUpdated: '2026-03-20',
    clientVisibleNotes: ['Request received, team will review within 24 hours'],
    internalNotes: ['New intake - needs assignment']
  },
  {
    id: 'MTR-009', clientId: 'user-1', clientName: 'Arjun Mehta', title: 'Tax Advisory - GST Compliance',
    referenceCode: 'LC-2025-009', lifecycleStage: 'verification-call', stages: makeStages('verification-call'),
    operationalStatus: 'awaiting-verification', priority: 'in-progress',
    selectedServices: ['document-review', 'court-technology'], expertiseArea: 'Compliance',
    issueSummary: 'GST notice received for FY 2023-24. Need compliance review and representation.',
    urgency: 'within-6hrs', consultationMode: 'video', assignedStaff: 'Rahul Verma',
    totalFee: 0, paidAmount: 0, dueAmount: 0,
    createdAt: '2026-03-18', lastUpdated: '2026-03-24',
    clientVisibleNotes: ['Verification call to be scheduled'],
    internalNotes: ['GST dept notice attached']
  },
  {
    id: 'MTR-010', clientId: 'user-2', clientName: 'Sneha Kapoor', title: 'Property Transfer Deed',
    referenceCode: 'LC-2025-010', lifecycleStage: 'resolution', stages: makeStages('resolution'),
    operationalStatus: 'completed', priority: 'completed',
    selectedServices: ['legal-drafting', 'liaison-support'], expertiseArea: 'Property and Real Estate',
    issueSummary: 'Transfer of ancestral property. Gift deed preparation and registration.',
    urgency: 'standard', consultationMode: 'in-person', assignedCounsel: 'Adv. Rajan Mehra', assignedStaff: 'Priya Sharma',
    packageId: 'PKG-005', totalFee: 20000, paidAmount: 20000, dueAmount: 0,
    createdAt: '2024-12-01', lastUpdated: '2025-08-15',
    clientVisibleNotes: ['Deed registered successfully at Sub-Registrar office'],
    internalNotes: ['Completed - all clear']
  },
  {
    id: 'MTR-011', clientId: 'user-3', clientName: 'Vikram Singh', title: 'IP Trademark Registration',
    referenceCode: 'LC-2025-011', lifecycleStage: 'action-plan', stages: makeStages('action-plan'),
    operationalStatus: 'work-in-progress', priority: 'in-progress',
    selectedServices: ['legal-drafting', 'document-review'], expertiseArea: 'Corporate',
    issueSummary: 'Trademark registration for new product line. Need comprehensive IP protection.',
    urgency: 'standard', consultationMode: 'video', assignedCounsel: 'Adv. Rajan Mehra', assignedStaff: 'Kavita Nair',
    totalFee: 30000, paidAmount: 15000, dueAmount: 15000,
    createdAt: '2025-01-15', lastUpdated: '2026-03-22',
    clientVisibleNotes: ['TM application filed', 'Examination report expected by April'],
    internalNotes: ['No objections anticipated']
  },
];

export const LEADS: Lead[] = [
  { id: 'LEAD-001', userId: 'user-8', status: 'consultation-scheduled', selectedServices: ['get-counsel', 'case-assessment'], expertiseArea: 'Criminal', urgency: 'within-6hrs', consultationMode: 'video', preferredSlot: '2026-03-25 10:00 AM', issueSummary: 'Cheating case filed against client', createdAt: '2025-03-01', assignedOwner: 'Rahul Verma', paymentStatus: 'none', consultationStatus: 'scheduled', notes: 'Urgent matter' },
  { id: 'LEAD-002', userId: 'user-9', status: 'consultation-scheduled', selectedServices: ['legal-drafting'], expertiseArea: 'Corporate', urgency: 'standard', consultationMode: 'video', preferredSlot: '2026-03-26 02:00 PM', issueSummary: 'Partnership deed review needed', createdAt: '2025-03-05', assignedOwner: 'Priya Sharma', paymentStatus: 'none', consultationStatus: 'scheduled', notes: '' },
  { id: 'LEAD-003', userId: 'user-10', status: 'consultation-scheduled', selectedServices: ['document-review', 'liaison-support'], expertiseArea: 'Property and Real Estate', urgency: 'standard', consultationMode: 'in-person', preferredSlot: '2026-03-27 11:00 AM', issueSummary: 'Property mutation and khata transfer', createdAt: '2025-03-08', assignedOwner: 'Kavita Nair', paymentStatus: 'none', consultationStatus: 'scheduled', notes: '' },
  { id: 'LEAD-004', userId: 'user-5', status: 'fee-pending', selectedServices: ['get-counsel', 'litigation-monitoring'], expertiseArea: 'Civil', urgency: 'standard', consultationMode: 'video', preferredSlot: '2026-03-18 03:00 PM', issueSummary: 'Recovery suit against contractor', createdAt: '2025-01-05', assignedOwner: 'Rahul Verma', paymentStatus: 'invoice-sent', consultationStatus: 'completed', notes: 'Consultation done, fee invoice sent' },
  { id: 'LEAD-005', userId: 'user-6', status: 'consultation-completed', selectedServices: ['case-assessment'], expertiseArea: 'Employment', urgency: 'standard', consultationMode: 'phone', preferredSlot: '2026-03-12 04:00 PM', issueSummary: 'Wrongful termination claim', createdAt: '2025-02-12', assignedOwner: 'Priya Sharma', paymentStatus: 'none', consultationStatus: 'completed', notes: 'Client undecided on proceeding' },
  { id: 'LEAD-006', userId: 'user-7', status: 'consultation-completed', selectedServices: ['legal-drafting', 'document-review'], expertiseArea: 'NRI / International', urgency: 'standard', consultationMode: 'video', preferredSlot: '2026-03-10 09:00 AM', issueSummary: 'NRI property power of attorney', createdAt: '2025-02-28', assignedOwner: 'Kavita Nair', paymentStatus: 'none', consultationStatus: 'completed', notes: 'May convert' },
  { id: 'LEAD-007', userId: 'user-11', status: 'new-lead', selectedServices: ['court-technology'], expertiseArea: 'Civil', urgency: 'standard', consultationMode: 'video', preferredSlot: '2026-03-28 10:00 AM', issueSummary: 'Need help with e-court filing', createdAt: '2025-03-10', assignedOwner: 'Rahul Verma', paymentStatus: 'none', consultationStatus: 'not-scheduled', notes: '' },
  { id: 'LEAD-008', userId: 'user-12', status: 'new-lead', selectedServices: ['get-counsel'], expertiseArea: 'Family', urgency: 'within-6hrs', consultationMode: 'phone', preferredSlot: '2026-03-25 05:00 PM', issueSummary: 'Domestic violence protection order', createdAt: '2025-03-12', assignedOwner: 'Priya Sharma', paymentStatus: 'none', consultationStatus: 'not-scheduled', notes: 'Urgent - needs immediate attention' },
  { id: 'LEAD-009', userId: 'user-13', status: 'awaiting-verification', selectedServices: ['case-assessment', 'legal-drafting'], expertiseArea: 'Compliance', urgency: 'standard', consultationMode: 'video', preferredSlot: '2026-03-29 02:00 PM', issueSummary: 'FEMA compliance advisory needed', createdAt: '2025-03-14', assignedOwner: 'Kavita Nair', paymentStatus: 'none', consultationStatus: 'not-scheduled', notes: '' },
  { id: 'LEAD-010', userId: 'user-14', status: 'new-lead', selectedServices: ['liaison-support'], expertiseArea: 'Criminal', urgency: 'within-2hrs', consultationMode: 'in-person', preferredSlot: '2026-03-24 09:00 AM', issueSummary: 'FIR registration assistance needed', createdAt: '2025-03-15', assignedOwner: '', paymentStatus: 'none', consultationStatus: 'not-scheduled', notes: 'Extremely urgent - immediate help needed' },
];

export const PACKAGES: MatterPackage[] = [
  { id: 'PKG-001', matterId: 'MTR-001', name: 'RERA Dispute Resolution', description: 'Complete RERA complaint handling', services: ['get-counsel', 'case-assessment'], price: 25000, createdBy: 'Priya Sharma', createdAt: '2024-11-01' },
  { id: 'PKG-002', matterId: 'MTR-003', name: 'Family Law - Divorce Package', description: 'Mutual consent divorce proceedings', services: ['get-counsel', 'liaison-support'], price: 35000, createdBy: 'Kavita Nair', createdAt: '2024-10-01' },
  { id: 'PKG-003', matterId: 'MTR-005', name: 'Startup Incorporation Suite', description: 'Full incorporation with compliance', services: ['legal-drafting', 'document-review', 'court-technology'], price: 45000, createdBy: 'Rahul Verma', createdAt: '2024-10-15' },
  { id: 'PKG-004', matterId: 'MTR-007', name: 'Criminal Defense - Premium', description: 'Full criminal defense representation', services: ['get-counsel', 'litigation-monitoring', 'case-assessment'], price: 50000, createdBy: 'Kavita Nair', createdAt: '2025-02-05' },
  { id: 'PKG-005', matterId: 'MTR-010', name: 'Property Transfer', description: 'Deed drafting and registration', services: ['legal-drafting', 'liaison-support'], price: 20000, createdBy: 'Priya Sharma', createdAt: '2024-12-10' },
];

export const INVOICES: Invoice[] = [
  { id: 'INV-2024-001', matterId: 'MTR-001', matterRef: 'LC-2024-001', matterTitle: 'RERA Dispute', clientId: 'user-1', clientName: 'Arjun Mehta', amount: 15000, tax: 2700, discount: 0, totalAmount: 17700, status: 'paid', issueDate: '2024-11-05', dueDate: '2024-11-20', paidDate: '2024-11-18', items: [{ description: 'RERA Dispute Resolution - Advance', quantity: 1, rate: 15000, amount: 15000 }], clientNote: 'Advance payment for case initiation' },
  { id: 'INV-2024-002', matterId: 'MTR-001', matterRef: 'LC-2024-001', matterTitle: 'RERA Dispute', clientId: 'user-1', clientName: 'Arjun Mehta', amount: 10000, tax: 1800, discount: 0, totalAmount: 11800, status: 'pending', issueDate: '2026-03-15', dueDate: '2026-03-30', items: [{ description: 'RERA Dispute - Hearing Representation', quantity: 1, rate: 10000, amount: 10000 }], clientNote: 'For upcoming RERA hearing' },
  { id: 'INV-2024-003', matterId: 'MTR-002', matterRef: 'LC-2024-002', matterTitle: 'Commercial Lease Review', clientId: 'user-1', clientName: 'Arjun Mehta', amount: 18000, tax: 3240, discount: 1000, totalAmount: 20240, status: 'paid', issueDate: '2024-12-01', dueDate: '2024-12-15', paidDate: '2024-12-10', items: [{ description: 'Lease Agreement Review', quantity: 1, rate: 10000, amount: 10000 }, { description: 'Redrafting & Negotiation Support', quantity: 1, rate: 8000, amount: 8000 }], clientNote: 'Full payment for lease review' },
  { id: 'INV-2025-004', matterId: 'MTR-003', matterRef: 'LC-2024-003', matterTitle: 'Divorce Proceedings', clientId: 'user-2', clientName: 'Sneha Kapoor', amount: 20000, tax: 3600, discount: 0, totalAmount: 23600, status: 'paid', issueDate: '2024-10-05', dueDate: '2024-10-20', paidDate: '2024-10-15', items: [{ description: 'Divorce - Advance Payment', quantity: 1, rate: 20000, amount: 20000 }] },
  { id: 'INV-2025-005', matterId: 'MTR-003', matterRef: 'LC-2024-003', matterTitle: 'Divorce Proceedings', clientId: 'user-2', clientName: 'Sneha Kapoor', amount: 15000, tax: 2700, discount: 0, totalAmount: 17700, status: 'overdue', issueDate: '2026-02-15', dueDate: '2026-03-01', items: [{ description: 'Divorce - Court Representation Phase 2', quantity: 1, rate: 15000, amount: 15000 }], lastReminder: '2026-03-20' },
  { id: 'INV-2025-006', matterId: 'MTR-005', matterRef: 'LC-2025-005', matterTitle: 'Startup Incorporation', clientId: 'user-3', clientName: 'Vikram Singh', amount: 45000, tax: 8100, discount: 2000, totalAmount: 51100, status: 'paid', issueDate: '2024-10-20', dueDate: '2024-11-05', paidDate: '2024-11-01', items: [{ description: 'Company Incorporation', quantity: 1, rate: 25000, amount: 25000 }, { description: 'DPIIT Registration', quantity: 1, rate: 10000, amount: 10000 }, { description: 'Annual Compliance Setup', quantity: 1, rate: 10000, amount: 10000 }] },
  { id: 'INV-2025-007', matterId: 'MTR-006', matterRef: 'LC-2025-006', matterTitle: 'Employment Dispute', clientId: 'user-3', clientName: 'Vikram Singh', amount: 15000, tax: 2700, discount: 0, totalAmount: 17700, status: 'sent', issueDate: '2026-03-20', dueDate: '2026-04-05', items: [{ description: 'Employment Matter - Legal Opinion', quantity: 1, rate: 15000, amount: 15000 }] },
  { id: 'INV-2025-008', matterId: 'MTR-007', matterRef: 'LC-2025-007', matterTitle: 'Criminal Defense', clientId: 'user-4', clientName: 'Ananya Desai', amount: 30000, tax: 5400, discount: 0, totalAmount: 35400, status: 'paid', issueDate: '2025-02-10', dueDate: '2025-02-25', paidDate: '2025-02-20', items: [{ description: 'Criminal Defense - Retainer', quantity: 1, rate: 30000, amount: 30000 }] },
  { id: 'INV-2025-009', matterId: 'MTR-007', matterRef: 'LC-2025-007', matterTitle: 'Criminal Defense', clientId: 'user-4', clientName: 'Ananya Desai', amount: 20000, tax: 3600, discount: 0, totalAmount: 23600, status: 'pending', issueDate: '2026-03-18', dueDate: '2026-04-02', items: [{ description: 'Criminal Defense - Court Representation', quantity: 1, rate: 20000, amount: 20000 }] },
  { id: 'INV-2025-010', matterId: 'MTR-011', matterRef: 'LC-2025-011', matterTitle: 'IP Trademark', clientId: 'user-3', clientName: 'Vikram Singh', amount: 15000, tax: 2700, discount: 0, totalAmount: 17700, status: 'paid', issueDate: '2025-02-01', dueDate: '2025-02-15', paidDate: '2025-02-12', items: [{ description: 'TM Registration - Phase 1', quantity: 1, rate: 15000, amount: 15000 }] },
  { id: 'INV-2025-011', matterId: 'MTR-011', matterRef: 'LC-2025-011', matterTitle: 'IP Trademark', clientId: 'user-3', clientName: 'Vikram Singh', amount: 15000, tax: 2700, discount: 0, totalAmount: 17700, status: 'draft', issueDate: '2026-03-22', dueDate: '2026-04-10', items: [{ description: 'TM Registration - Phase 2', quantity: 1, rate: 15000, amount: 15000 }], internalNote: 'Waiting for examination report before sending' },
  { id: 'INV-2025-012', matterId: 'MTR-004', matterRef: 'LC-2025-004', matterTitle: 'Maintenance Application', clientId: 'user-2', clientName: 'Sneha Kapoor', amount: 8000, tax: 1440, discount: 0, totalAmount: 9440, status: 'draft', issueDate: '2026-03-24', dueDate: '2026-04-08', items: [{ description: 'Consultation Fee - Maintenance Matter', quantity: 1, rate: 8000, amount: 8000 }], internalNote: 'To be sent after verification call' },
];

export const PAYMENTS: Payment[] = [
  { id: 'PAY-001', invoiceId: 'INV-2024-001', matterId: 'MTR-001', clientId: 'user-1', clientName: 'Arjun Mehta', amount: 17700, method: 'online', status: 'success', timestamp: '2024-11-18T14:30:00', recordedBy: 'System', reference: 'RAZPAY-001' },
  { id: 'PAY-002', invoiceId: 'INV-2024-003', matterId: 'MTR-002', clientId: 'user-1', clientName: 'Arjun Mehta', amount: 20240, method: 'bank-transfer', status: 'success', timestamp: '2024-12-10T10:15:00', recordedBy: 'Priya Sharma', reference: 'NEFT-20241210' },
  { id: 'PAY-003', invoiceId: 'INV-2025-004', matterId: 'MTR-003', clientId: 'user-2', clientName: 'Sneha Kapoor', amount: 23600, method: 'online', status: 'success', timestamp: '2024-10-15T16:45:00', recordedBy: 'System', reference: 'RAZPAY-002' },
  { id: 'PAY-004', invoiceId: 'INV-2025-006', matterId: 'MTR-005', clientId: 'user-3', clientName: 'Vikram Singh', amount: 51100, method: 'bank-transfer', status: 'success', timestamp: '2024-11-01T09:00:00', recordedBy: 'Rahul Verma', reference: 'NEFT-20241101' },
  { id: 'PAY-005', invoiceId: 'INV-2025-008', matterId: 'MTR-007', clientId: 'user-4', clientName: 'Ananya Desai', amount: 35400, method: 'online', status: 'success', timestamp: '2025-02-20T11:30:00', recordedBy: 'System', reference: 'RAZPAY-003' },
  { id: 'PAY-006', invoiceId: 'INV-2025-010', matterId: 'MTR-011', clientId: 'user-3', clientName: 'Vikram Singh', amount: 17700, method: 'online', status: 'success', timestamp: '2025-02-12T13:00:00', recordedBy: 'System', reference: 'RAZPAY-004' },
];

export interface SystemNotification {
  id: string;
  title: string;
  body: string;
  type: 'billing' | 'document' | 'event' | 'matter' | 'message' | 'system' | 'proposal';
  clientId?: string;
  clientName?: string;
  matterId?: string;
  matterTitle?: string;
  date: string;
  read: boolean;
  dismissed: boolean;
  actionUrl?: string;
  source: string;
}

export const NOTIFICATIONS: SystemNotification[] = [
  { id: 'NOT-001', title: 'New Invoice Payment', body: 'Payment of ₹17,700 received from Arjun Mehta for Invoice INV-2024-001.', type: 'billing', clientId: 'user-1', clientName: 'Arjun Mehta', matterId: 'MTR-001', matterTitle: 'RERA Dispute', date: '2026-03-24T14:30:00Z', read: false, dismissed: false, source: 'Payment Gateway' },
  { id: 'NOT-002', title: 'Document Uploaded', body: 'Sneha Kapoor uploaded "Bank_Statements_2025.pdf" to Maintenance Application.', type: 'document', clientId: 'user-2', clientName: 'Sneha Kapoor', matterId: 'MTR-004', matterTitle: 'Maintenance Application', date: '2026-03-24T10:15:00Z', read: true, dismissed: false, source: 'Client Portal' },
  { id: 'NOT-003', title: 'Hearing Reminder', type: 'event', body: 'RERA Hearing scheduled for tomorrow at 10:30 AM.', clientId: 'user-1', clientName: 'Arjun Mehta', matterId: 'MTR-001', matterTitle: 'RERA Dispute', date: '2026-03-23T09:00:00Z', read: true, dismissed: true, source: 'Calendar System' },
  { id: 'NOT-004', title: 'New Matter Inquiry', type: 'matter', body: 'New lead Priti Banerjee requested consultation for Cheating Case.', clientId: 'user-8', clientName: 'Priti Banerjee', date: '2026-03-22T16:45:00Z', read: true, dismissed: false, source: 'Public Website' },
  { id: 'NOT-005', title: 'Service Proposal Sent', type: 'proposal', body: 'Service packages sent to Arjun Mehta for RERA Dispute.', clientId: 'user-1', clientName: 'Arjun Mehta', matterId: 'MTR-001', matterTitle: 'RERA Dispute', date: '2026-03-24T11:20:00Z', read: false, dismissed: false, source: 'Admin Dashboard' },
  { id: 'NOT-006', title: 'Unread Client Message', type: 'message', body: 'Vikram Singh sent a new message regarding Startup Incorporation.', clientId: 'user-3', clientName: 'Vikram Singh', matterId: 'MTR-005', matterTitle: 'Startup Incorporation', date: '2026-03-24T08:30:00Z', read: false, dismissed: false, source: 'Messaging Desk' },
  { id: 'NOT-007', title: 'Invoice Overdue', type: 'billing', body: 'Invoice INV-2025-005 is now 24 days overdue.', clientId: 'user-2', clientName: 'Sneha Kapoor', matterId: 'MTR-003', matterTitle: 'Divorce Proceedings', date: '2026-03-23T12:00:00Z', read: true, dismissed: false, source: 'Billing System' }
];

export const EVENTS: PlatformEvent[] = [
  { id: 'EVT-PROP-01', title: 'Service Proposal: RERA Dispute', type: 'proposal', clientId: 'user-1', clientName: 'Arjun Mehta', matterId: 'MTR-001', matterTitle: 'RERA Dispute', date: '2026-03-24', time: '10:00 AM', duration: 0, mode: 'office', visibleToClient: true, actionCTA: 'Review & Select Package', notes: 'Please review and select a service tier.', status: 'upcoming', packages: [
    { id: 'pkg-1', name: 'Basic Representation', price: 15000, description: 'Standard representation for initial hearings.', deliverables: ['Initial consultation', 'Drafting of reply', '1 Court representation'] },
    { id: 'pkg-2', name: 'Comprehensive Resolution', price: 35000, description: 'End-to-end management of the dispute.', deliverables: ['Unlimited consultations', 'Evidence gathering', 'All court representations', 'Final order retrieval'], isRecommended: true }
  ]},
  { id: 'EVT-001', title: 'RERA Hearing', type: 'hearing', clientId: 'user-1', clientName: 'Arjun Mehta', matterId: 'MTR-001', matterTitle: 'RERA Dispute', date: '2026-03-28', time: '10:30 AM', duration: 120, mode: 'court', location: 'RERA Authority, Mumbai', visibleToClient: true, actionCTA: 'View Details', notes: 'Bring all original documents', status: 'upcoming' },
  { id: 'EVT-002', title: 'Lease Negotiation Follow-up', type: 'consultation', clientId: 'user-1', clientName: 'Arjun Mehta', matterId: 'MTR-002', matterTitle: 'Commercial Lease Review', date: '2026-03-26', time: '03:00 PM', duration: 45, mode: 'video', meetLink: 'https://meet.google.com/xyz-abcd-efg', visibleToClient: true, actionCTA: 'Join Call', notes: 'Discuss counter-offer terms', status: 'upcoming' },
  { id: 'EVT-003', title: 'Divorce - Second Motion Hearing', type: 'hearing', clientId: 'user-2', clientName: 'Sneha Kapoor', matterId: 'MTR-003', matterTitle: 'Divorce Proceedings', date: '2026-04-05', time: '11:00 AM', duration: 60, mode: 'court', location: 'Family Court, Delhi', visibleToClient: true, actionCTA: 'View Details', notes: 'Final hearing expected', status: 'upcoming' },
  { id: 'EVT-004', title: 'Verification Call - Maintenance', type: 'verification-call', clientId: 'user-2', clientName: 'Sneha Kapoor', matterId: 'MTR-004', matterTitle: 'Maintenance Application', date: '2026-03-25', time: '04:00 PM', duration: 30, mode: 'phone', visibleToClient: true, actionCTA: 'Expect Call', notes: 'Initial verification', status: 'upcoming' },
  { id: 'EVT-005', title: 'Criminal Hearing - Defamation', type: 'hearing', clientId: 'user-4', clientName: 'Ananya Desai', matterId: 'MTR-007', matterTitle: 'Criminal Defamation Defense', date: '2026-03-26', time: '10:00 AM', duration: 180, mode: 'court', location: 'Sessions Court, Chennai', meetLink: 'https://meet.google.com/klm-nopq-rst', visibleToClient: true, actionCTA: 'View Details', notes: 'Arguments on bail', status: 'upcoming' },
  { id: 'EVT-006', title: 'GST Notice Review Call', type: 'consultation', clientId: 'user-1', clientName: 'Arjun Mehta', matterId: 'MTR-009', matterTitle: 'Tax Advisory - GST', date: '2026-03-27', time: '02:00 PM', duration: 45, mode: 'video', meetLink: 'https://meet.google.com/gst-review-01', visibleToClient: true, actionCTA: 'Join Call', notes: 'Review GST notice documents', status: 'upcoming' },
  { id: 'EVT-007', title: 'Consultation - Cheating Case', type: 'consultation', clientId: 'user-8', clientName: 'Priti Banerjee', matterId: '', matterTitle: '', date: '2026-03-25', time: '10:00 AM', duration: 45, mode: 'video', meetLink: 'https://meet.google.com/lead-consult-01', visibleToClient: true, actionCTA: 'Join Call', notes: 'Initial consultation for lead', status: 'upcoming' },
  { id: 'EVT-008', title: 'Consultation - Partnership Deed', type: 'consultation', clientId: 'user-9', clientName: 'Amit Patel', matterId: '', matterTitle: '', date: '2026-03-26', time: '02:00 PM', duration: 45, mode: 'video', meetLink: 'https://meet.google.com/lead-consult-02', visibleToClient: true, actionCTA: 'Join Call', notes: '', status: 'upcoming' },
  { id: 'EVT-009', title: 'Field Visit - Property Mutation', type: 'field-visit', clientId: 'user-10', clientName: 'Deepa Reddy', matterId: '', matterTitle: '', date: '2026-03-27', time: '11:00 AM', duration: 120, mode: 'in-person', location: 'Sub-Registrar Office, Hyderabad', visibleToClient: true, actionCTA: 'View Details', notes: 'Bring original property documents', status: 'upcoming' },
  { id: 'EVT-010', title: 'TM Examination Review', type: 'deadline', clientId: 'user-3', clientName: 'Vikram Singh', matterId: 'MTR-011', matterTitle: 'IP Trademark', date: '2026-04-01', time: '11:59 PM', duration: 0, mode: 'office', visibleToClient: false, actionCTA: '', notes: 'Internal deadline - respond to examination report if received', status: 'upcoming' },
  { id: 'EVT-011', title: 'Team Sync - Weekly', type: 'reminder', clientId: '', clientName: '', matterId: '', matterTitle: '', date: '2026-03-24', time: '09:00 AM', duration: 60, mode: 'video', meetLink: 'https://meet.google.com/team-sync', visibleToClient: false, actionCTA: '', notes: 'Weekly operations sync', status: 'upcoming' },
  { id: 'EVT-012', title: 'Invoice Payment Deadline', type: 'deadline', clientId: 'user-2', clientName: 'Sneha Kapoor', matterId: 'MTR-003', matterTitle: 'Divorce Proceedings', date: '2026-03-01', time: '11:59 PM', duration: 0, mode: 'office', visibleToClient: false, actionCTA: '', notes: 'INV-2025-005 overdue', status: 'completed' },
  { id: 'EVT-013', title: 'Recovery Suit Consultation', type: 'consultation', clientId: 'user-5', clientName: 'Rohan Gupta', matterId: '', matterTitle: '', date: '2026-03-18', time: '03:00 PM', duration: 45, mode: 'video', visibleToClient: true, actionCTA: 'Join Call', notes: 'Completed', status: 'completed' },
  { id: 'EVT-014', title: 'Wrongful Termination Consultation', type: 'consultation', clientId: 'user-6', clientName: 'Meera Joshi', matterId: '', matterTitle: '', date: '2026-03-12', time: '04:00 PM', duration: 45, mode: 'phone', visibleToClient: true, actionCTA: '', notes: 'Completed', status: 'completed' },
  { id: 'EVT-015', title: 'NRI POA Consultation', type: 'consultation', clientId: 'user-7', clientName: 'Karan Malhotra', matterId: '', matterTitle: '', date: '2026-03-10', time: '09:00 AM', duration: 60, mode: 'video', visibleToClient: true, actionCTA: '', notes: 'Completed - may convert', status: 'completed' },
];

export const DOCUMENTS: PlatformDocument[] = [
  { id: 'DOC-001', name: 'RERA_Complaint_Application.pdf', type: 'PDF', size: 245000, matterId: 'MTR-001', matterTitle: 'RERA Dispute', clientId: 'user-1', clientName: 'Arjun Mehta', uploadedBy: 'Arjun Mehta', uploadedAt: '2024-10-25', visibility: 'client', reviewState: 'reviewed', docCategory: 'Court Filing', note: 'Original complaint' },
  { id: 'DOC-002', name: 'Property_Sale_Agreement.pdf', type: 'PDF', size: 520000, matterId: 'MTR-001', matterTitle: 'RERA Dispute', clientId: 'user-1', clientName: 'Arjun Mehta', uploadedBy: 'Arjun Mehta', uploadedAt: '2024-10-25', visibility: 'client', reviewState: 'reviewed', docCategory: 'Contract', note: 'Builder buyer agreement' },
  { id: 'DOC-003', name: 'Legal_Notice_to_Developer.pdf', type: 'PDF', size: 180000, matterId: 'MTR-001', matterTitle: 'RERA Dispute', clientId: 'user-1', clientName: 'Arjun Mehta', uploadedBy: 'Adv. Rajan Mehra', uploadedAt: '2024-11-15', visibility: 'client', reviewState: 'reviewed', docCategory: 'Notice' },
  { id: 'DOC-004', name: 'Commercial_Lease_Draft_v3.docx', type: 'DOCX', size: 95000, matterId: 'MTR-002', matterTitle: 'Commercial Lease', clientId: 'user-1', clientName: 'Arjun Mehta', uploadedBy: 'Adv. Kavita Nair', uploadedAt: '2026-03-20', visibility: 'client', reviewState: 'reviewed', docCategory: 'Draft' },
  { id: 'DOC-005', name: 'Lease_Comparison_Notes.pdf', type: 'PDF', size: 67000, matterId: 'MTR-002', matterTitle: 'Commercial Lease', clientId: 'user-1', clientName: 'Arjun Mehta', uploadedBy: 'Rahul Verma', uploadedAt: '2026-03-22', visibility: 'internal', reviewState: 'reviewed', docCategory: 'Internal Notes' },
  { id: 'DOC-006', name: 'Divorce_Petition.pdf', type: 'PDF', size: 310000, matterId: 'MTR-003', matterTitle: 'Divorce Proceedings', clientId: 'user-2', clientName: 'Sneha Kapoor', uploadedBy: 'Adv. Sunita Rao', uploadedAt: '2024-12-05', visibility: 'client', reviewState: 'reviewed', docCategory: 'Court Filing' },
  { id: 'DOC-007', name: 'Custody_Agreement_Draft.pdf', type: 'PDF', size: 145000, matterId: 'MTR-003', matterTitle: 'Divorce Proceedings', clientId: 'user-2', clientName: 'Sneha Kapoor', uploadedBy: 'Adv. Sunita Rao', uploadedAt: '2025-01-20', visibility: 'client', reviewState: 'reviewed', docCategory: 'Draft' },
  { id: 'DOC-008', name: 'Marriage_Certificate.jpg', type: 'JPG', size: 2100000, matterId: 'MTR-003', matterTitle: 'Divorce Proceedings', clientId: 'user-2', clientName: 'Sneha Kapoor', uploadedBy: 'Sneha Kapoor', uploadedAt: '2024-09-22', visibility: 'client', reviewState: 'reviewed', docCategory: 'Identity Document' },
  { id: 'DOC-009', name: 'COI_Certificate.pdf', type: 'PDF', size: 89000, matterId: 'MTR-005', matterTitle: 'Startup Incorporation', clientId: 'user-3', clientName: 'Vikram Singh', uploadedBy: 'Rahul Verma', uploadedAt: '2025-01-15', visibility: 'client', reviewState: 'reviewed', docCategory: 'Certificate' },
  { id: 'DOC-010', name: 'DPIIT_Registration.pdf', type: 'PDF', size: 120000, matterId: 'MTR-005', matterTitle: 'Startup Incorporation', clientId: 'user-3', clientName: 'Vikram Singh', uploadedBy: 'Rahul Verma', uploadedAt: '2025-03-01', visibility: 'client', reviewState: 'reviewed', docCategory: 'Certificate' },
  { id: 'DOC-011', name: 'FIR_Copy_Defamation.pdf', type: 'PDF', size: 195000, matterId: 'MTR-007', matterTitle: 'Criminal Defamation', clientId: 'user-4', clientName: 'Ananya Desai', uploadedBy: 'Ananya Desai', uploadedAt: '2025-02-02', visibility: 'client', reviewState: 'reviewed', docCategory: 'Court Filing' },
  { id: 'DOC-012', name: 'Evidence_Screenshots.zip', type: 'ZIP', size: 15000000, matterId: 'MTR-007', matterTitle: 'Criminal Defamation', clientId: 'user-4', clientName: 'Ananya Desai', uploadedBy: 'Ananya Desai', uploadedAt: '2025-02-03', visibility: 'client', reviewState: 'unreviewed', docCategory: 'Evidence' },
  { id: 'DOC-013', name: 'Bail_Application.pdf', type: 'PDF', size: 230000, matterId: 'MTR-007', matterTitle: 'Criminal Defamation', clientId: 'user-4', clientName: 'Ananya Desai', uploadedBy: 'Adv. Sunita Rao', uploadedAt: '2026-03-20', visibility: 'client', reviewState: 'reviewed', docCategory: 'Court Filing' },
  { id: 'DOC-014', name: 'GST_Notice_FY2023-24.pdf', type: 'PDF', size: 340000, matterId: 'MTR-009', matterTitle: 'Tax Advisory - GST', clientId: 'user-1', clientName: 'Arjun Mehta', uploadedBy: 'Arjun Mehta', uploadedAt: '2026-03-18', visibility: 'client', reviewState: 'unreviewed', docCategory: 'Government Notice' },
  { id: 'DOC-015', name: 'Non_Compete_Clause.pdf', type: 'PDF', size: 78000, matterId: 'MTR-006', matterTitle: 'Employment Dispute', clientId: 'user-3', clientName: 'Vikram Singh', uploadedBy: 'Vikram Singh', uploadedAt: '2025-03-05', visibility: 'client', reviewState: 'reviewed', docCategory: 'Contract' },
  { id: 'DOC-016', name: 'TM_Application_Receipt.pdf', type: 'PDF', size: 56000, matterId: 'MTR-011', matterTitle: 'IP Trademark', clientId: 'user-3', clientName: 'Vikram Singh', uploadedBy: 'Adv. Rajan Mehra', uploadedAt: '2025-02-20', visibility: 'client', reviewState: 'reviewed', docCategory: 'Receipt' },
  { id: 'DOC-017', name: 'Property_Transfer_Deed.pdf', type: 'PDF', size: 410000, matterId: 'MTR-010', matterTitle: 'Property Transfer', clientId: 'user-2', clientName: 'Sneha Kapoor', uploadedBy: 'Adv. Rajan Mehra', uploadedAt: '2025-07-01', visibility: 'client', reviewState: 'reviewed', docCategory: 'Deed' },
  { id: 'DOC-018', name: 'Registration_Receipt.pdf', type: 'PDF', size: 92000, matterId: 'MTR-010', matterTitle: 'Property Transfer', clientId: 'user-2', clientName: 'Sneha Kapoor', uploadedBy: 'Priya Sharma', uploadedAt: '2025-08-15', visibility: 'client', reviewState: 'reviewed', docCategory: 'Receipt' },
  { id: 'DOC-019', name: 'Case_Strategy_Internal.pdf', type: 'PDF', size: 156000, matterId: 'MTR-007', matterTitle: 'Criminal Defamation', clientId: 'user-4', clientName: 'Ananya Desai', uploadedBy: 'Kavita Nair', uploadedAt: '2025-02-10', visibility: 'internal', reviewState: 'reviewed', docCategory: 'Internal Notes' },
  { id: 'DOC-020', name: 'Fee_Structure_Comparison.xlsx', type: 'XLSX', size: 45000, matterId: '', matterTitle: '', clientId: '', clientName: '', uploadedBy: 'Priya Sharma', uploadedAt: '2026-03-01', visibility: 'internal', reviewState: 'reviewed', docCategory: 'Internal Notes' },
];

export const MESSAGE_THREADS: MessageThread[] = [
  { id: 'THR-001', clientId: 'user-1', clientName: 'Arjun Mehta', matterId: 'MTR-001', matterTitle: 'RERA Dispute', matterRef: 'LC-2024-001', stage: 'action-plan', urgency: 'standard', lastMessage: 'The hearing date has been confirmed for March 28th.', lastMessageAt: '2026-03-22T16:30:00', unreadCount: 0, assignedTo: 'Priya Sharma', status: 'active' },
  { id: 'THR-002', clientId: 'user-1', clientName: 'Arjun Mehta', matterId: 'MTR-002', matterTitle: 'Commercial Lease Review', matterRef: 'LC-2024-002', stage: 'consultation', urgency: 'within-6hrs', lastMessage: 'Revised lease draft has been shared. Please review the flagged clauses.', lastMessageAt: '2026-03-24T10:15:00', unreadCount: 2, assignedTo: 'Rahul Verma', status: 'waiting' },
  { id: 'THR-003', clientId: 'user-1', clientName: 'Arjun Mehta', matterId: 'MTR-009', matterTitle: 'Tax Advisory - GST', matterRef: 'LC-2025-009', stage: 'verification-call', urgency: 'within-6hrs', lastMessage: 'Please upload the GST returns for FY 2023-24.', lastMessageAt: '2026-03-23T14:00:00', unreadCount: 1, assignedTo: 'Rahul Verma', status: 'waiting' },
  { id: 'THR-004', clientId: 'user-2', clientName: 'Sneha Kapoor', matterId: 'MTR-003', matterTitle: 'Divorce Proceedings', matterRef: 'LC-2024-003', stage: 'action-plan', urgency: 'standard', lastMessage: 'Second motion hearing has been scheduled for April 5th.', lastMessageAt: '2026-03-21T11:00:00', unreadCount: 0, assignedTo: 'Kavita Nair', status: 'active' },
  { id: 'THR-005', clientId: 'user-2', clientName: 'Sneha Kapoor', matterId: 'MTR-004', matterTitle: 'Maintenance Application', matterRef: 'LC-2025-004', stage: 'verification-call', urgency: 'standard', lastMessage: 'Verification call scheduled for March 25th at 4 PM.', lastMessageAt: '2026-03-20T09:30:00', unreadCount: 0, assignedTo: 'Priya Sharma', status: 'active' },
  { id: 'THR-006', clientId: 'user-3', clientName: 'Vikram Singh', matterId: 'MTR-006', matterTitle: 'Employment Dispute', matterRef: 'LC-2025-006', stage: 'consultation', urgency: 'within-6hrs', lastMessage: 'Invoice for legal opinion has been sent. Please proceed with payment.', lastMessageAt: '2026-03-23T15:45:00', unreadCount: 1, assignedTo: 'Kavita Nair', status: 'waiting' },
  { id: 'THR-007', clientId: 'user-3', clientName: 'Vikram Singh', matterId: 'MTR-011', matterTitle: 'IP Trademark', matterRef: 'LC-2025-011', stage: 'action-plan', urgency: 'standard', lastMessage: 'TM application is under examination. Will update once we receive the report.', lastMessageAt: '2026-03-22T12:00:00', unreadCount: 0, assignedTo: 'Kavita Nair', status: 'active' },
  { id: 'THR-008', clientId: 'user-4', clientName: 'Ananya Desai', matterId: 'MTR-007', matterTitle: 'Criminal Defamation Defense', matterRef: 'LC-2025-007', stage: 'action-plan', urgency: 'within-2hrs', lastMessage: 'Bail application filed. Hearing scheduled for March 26th.', lastMessageAt: '2026-03-24T09:00:00', unreadCount: 3, assignedTo: 'Kavita Nair', status: 'active' },
  { id: 'THR-009', clientId: 'user-5', clientName: 'Rohan Gupta', matterId: '', matterTitle: 'Recovery Suit Inquiry', matterRef: '', stage: 'consultation', urgency: 'standard', lastMessage: 'Consultation fee invoice has been sent. Awaiting payment to proceed.', lastMessageAt: '2026-03-20T14:00:00', unreadCount: 0, assignedTo: 'Rahul Verma', status: 'waiting' },
  { id: 'THR-010', clientId: 'user-8', clientName: 'Priti Banerjee', matterId: '', matterTitle: 'Cheating Case Inquiry', matterRef: '', stage: 'verification-call', urgency: 'within-6hrs', lastMessage: 'Your consultation is scheduled for March 25th. Meeting link will be shared shortly.', lastMessageAt: '2026-03-24T08:00:00', unreadCount: 0, assignedTo: 'Rahul Verma', status: 'active' },
  { id: 'THR-011', clientId: 'user-12', clientName: 'Nisha Agarwal', matterId: '', matterTitle: 'DV Protection Order', matterRef: '', stage: 'request-received', urgency: 'within-6hrs', lastMessage: 'We have received your request. A team member will reach out shortly.', lastMessageAt: '2026-03-24T07:30:00', unreadCount: 1, assignedTo: 'Priya Sharma', status: 'active' },
  { id: 'THR-012', clientId: 'user-4', clientName: 'Ananya Desai', matterId: 'MTR-008', matterTitle: 'Consumer Complaint', matterRef: 'LC-2025-008', stage: 'request-received', urgency: 'standard', lastMessage: 'Your consumer complaint request has been received.', lastMessageAt: '2026-03-20T15:00:00', unreadCount: 0, assignedTo: '', status: 'active' },
  { id: 'THR-013', clientId: 'user-6', clientName: 'Meera Joshi', matterId: '', matterTitle: 'Wrongful Termination', matterRef: '', stage: 'consultation', urgency: 'standard', lastMessage: 'Let us know if you would like to proceed with filing the case.', lastMessageAt: '2026-03-19T16:00:00', unreadCount: 0, assignedTo: 'Priya Sharma', status: 'resolved' },
  { id: 'THR-014', clientId: 'user-7', clientName: 'Karan Malhotra', matterId: '', matterTitle: 'NRI POA Inquiry', matterRef: '', stage: 'consultation', urgency: 'standard', lastMessage: 'POA draft can be prepared once you confirm the property details.', lastMessageAt: '2026-03-18T10:00:00', unreadCount: 0, assignedTo: 'Kavita Nair', status: 'active' },
  { id: 'THR-015', clientId: 'user-14', clientName: 'Pooja Sharma', matterId: '', matterTitle: 'FIR Assistance', matterRef: '', stage: 'request-received', urgency: 'within-2hrs', lastMessage: 'We are assigning a team member for your FIR assistance request.', lastMessageAt: '2026-03-24T09:45:00', unreadCount: 1, assignedTo: '', status: 'active' },
];

export const CHAT_MESSAGES: ChatMessage[] = [
  { id: 'CM-001', threadId: 'THR-001', senderId: 'admin-1', senderName: 'Legal Team', senderRole: 'admin', content: 'Welcome to LegalConnect. We have received your RERA dispute request.', timestamp: '2024-10-24T10:30:00', read: true },
  { id: 'CM-002', threadId: 'THR-001', senderId: 'user-1', senderName: 'Arjun Mehta', senderRole: 'client', content: 'Thank you. When can I expect the first consultation?', timestamp: '2024-10-24T11:00:00', read: true },
  { id: 'CM-003', threadId: 'THR-001', senderId: 'admin-1', senderName: 'Priya Sharma', senderRole: 'admin', content: 'Adv. Rajan Mehra has been assigned to your case. Consultation scheduled for Oct 28th.', timestamp: '2024-10-25T09:00:00', read: true },
  { id: 'CM-004', threadId: 'THR-001', senderId: 'system', senderName: 'System', senderRole: 'system', content: 'Stage updated: Verification Call → Consultation', timestamp: '2024-10-28T10:00:00', read: true },
  { id: 'CM-005', threadId: 'THR-001', senderId: 'admin-1', senderName: 'Priya Sharma', senderRole: 'admin', content: 'Legal notice has been sent to the developer. We will follow up in 15 days.', timestamp: '2024-11-15T14:00:00', read: true },
  { id: 'CM-006', threadId: 'THR-001', senderId: 'user-1', senderName: 'Arjun Mehta', senderRole: 'client', content: 'Great, please keep me updated on the response.', timestamp: '2024-11-15T15:30:00', read: true },
  { id: 'CM-007', threadId: 'THR-001', senderId: 'admin-1', senderName: 'Priya Sharma', senderRole: 'admin', content: 'The hearing date has been confirmed for March 28th.', timestamp: '2026-03-22T16:30:00', read: true },
  { id: 'CM-008', threadId: 'THR-002', senderId: 'admin-1', senderName: 'Rahul Verma', senderRole: 'admin', content: 'We have reviewed your lease agreement and identified 12 clauses that need attention.', timestamp: '2026-03-20T10:00:00', read: true },
  { id: 'CM-009', threadId: 'THR-002', senderId: 'user-1', senderName: 'Arjun Mehta', senderRole: 'client', content: 'Can you highlight the most critical ones?', timestamp: '2026-03-20T11:30:00', read: true },
  { id: 'CM-010', threadId: 'THR-002', senderId: 'admin-1', senderName: 'Rahul Verma', senderRole: 'admin', content: 'Revised lease draft has been shared. Please review the flagged clauses.', timestamp: '2026-03-24T10:15:00', read: false },
  { id: 'CM-011', threadId: 'THR-008', senderId: 'admin-1', senderName: 'Kavita Nair', senderRole: 'admin', content: 'Your criminal defense case is being handled with top priority.', timestamp: '2025-02-05T09:00:00', read: true },
  { id: 'CM-012', threadId: 'THR-008', senderId: 'user-4', senderName: 'Ananya Desai', senderRole: 'client', content: 'Thank you. When will the bail application be filed?', timestamp: '2025-02-05T10:00:00', read: true },
  { id: 'CM-013', threadId: 'THR-008', senderId: 'admin-1', senderName: 'Kavita Nair', senderRole: 'admin', content: 'Bail application filed. Hearing scheduled for March 26th.', timestamp: '2026-03-24T09:00:00', read: false },
];

export const ADVOCATES: Advocate[] = [
  { id: 'ADV-001', name: 'Adv. Rajan Mehra', location: 'Mumbai', expertise: ['Property and Real Estate', 'Corporate', 'Civil'], yearsExperience: 18, activeAssignments: 3, workload: 'moderate', availability: 'available', feeAgreed: 120000, feePaid: 90000, feePending: 30000, avatar: '' },
  { id: 'ADV-002', name: 'Adv. Kavita Nair', location: 'Chennai', expertise: ['Criminal', 'Family', 'NRI / International'], yearsExperience: 14, activeAssignments: 2, workload: 'moderate', availability: 'available', feeAgreed: 100000, feePaid: 65000, feePending: 35000, avatar: '' },
  { id: 'ADV-003', name: 'Adv. Sunita Rao', location: 'Delhi', expertise: ['Family', 'Criminal', 'Civil'], yearsExperience: 22, activeAssignments: 2, workload: 'light', availability: 'available', feeAgreed: 150000, feePaid: 120000, feePending: 30000, avatar: '' },
  { id: 'ADV-004', name: 'Adv. Deepak Sharma', location: 'Bangalore', expertise: ['Corporate', 'Compliance', 'Employment'], yearsExperience: 10, activeAssignments: 0, workload: 'light', availability: 'available', feeAgreed: 0, feePaid: 0, feePending: 0, avatar: '' },
  { id: 'ADV-005', name: 'Adv. Meenakshi Iyer', location: 'Hyderabad', expertise: ['Property and Real Estate', 'Civil'], yearsExperience: 8, activeAssignments: 0, workload: 'light', availability: 'available', feeAgreed: 0, feePaid: 0, feePending: 0, avatar: '' },
  { id: 'ADV-006', name: 'Adv. Anil Kapoor', location: 'Kolkata', expertise: ['Criminal', 'Civil', 'Compliance'], yearsExperience: 25, activeAssignments: 1, workload: 'light', availability: 'busy', feeAgreed: 80000, feePaid: 80000, feePending: 0, avatar: '' },
];

export const STAFF_MEMBERS: StaffMember[] = [
  { id: 'STF-001', name: 'Priya Sharma', role: 'Senior Case Manager', assignedMatters: 4, workload: 'heavy', status: 'active', teamLead: 'Rajesh Kumar (Director)', avatar: '' },
  { id: 'STF-002', name: 'Rahul Verma', role: 'Case Manager', assignedMatters: 3, workload: 'moderate', status: 'active', teamLead: 'Priya Sharma', avatar: '' },
  { id: 'STF-003', name: 'Kavita Nair', role: 'Senior Case Manager', assignedMatters: 4, workload: 'heavy', status: 'active', teamLead: 'Rajesh Kumar (Director)', avatar: '' },
  { id: 'STF-004', name: 'Amit Desai', role: 'Billing Administrator', assignedMatters: 0, workload: 'moderate', status: 'active', teamLead: 'Priya Sharma', avatar: '' },
  { id: 'STF-005', name: 'Neha Singh', role: 'Document Coordinator', assignedMatters: 0, workload: 'light', status: 'active', teamLead: 'Rahul Verma', avatar: '' },
  { id: 'STF-006', name: 'Vikash Gupta', role: 'Messaging Desk', assignedMatters: 0, workload: 'moderate', status: 'active', teamLead: 'Kavita Nair', avatar: '' },
];

export const AUDIT_ENTRIES: AuditEntry[] = [
  { id: 'AUD-001', timestamp: '2026-03-24T09:00:00', actor: 'Kavita Nair', actorRole: 'case-manager', entityType: 'matter', entityId: 'MTR-007', action: 'Bail application filed', newValue: 'Filed at Sessions Court', sourceModule: 'Matter Desk' },
  { id: 'AUD-002', timestamp: '2026-03-24T08:30:00', actor: 'System', actorRole: 'system', entityType: 'invoice', entityId: 'INV-2025-012', action: 'Invoice created', newValue: 'Draft - ₹9,440', sourceModule: 'Ledger' },
  { id: 'AUD-003', timestamp: '2026-03-23T15:45:00', actor: 'Kavita Nair', actorRole: 'case-manager', entityType: 'message', entityId: 'THR-006', action: 'Message sent to client', newValue: 'Invoice notification', sourceModule: 'Conversations' },
  { id: 'AUD-004', timestamp: '2026-03-23T14:00:00', actor: 'Rahul Verma', actorRole: 'case-manager', entityType: 'message', entityId: 'THR-003', action: 'Document request sent', newValue: 'GST returns requested', sourceModule: 'Conversations' },
  { id: 'AUD-005', timestamp: '2026-03-22T16:30:00', actor: 'Priya Sharma', actorRole: 'case-manager', entityType: 'matter', entityId: 'MTR-001', action: 'Update sent to client', newValue: 'Hearing confirmed Mar 28', sourceModule: 'Matter Desk' },
  { id: 'AUD-006', timestamp: '2026-03-22T12:00:00', actor: 'Kavita Nair', actorRole: 'case-manager', entityType: 'message', entityId: 'THR-007', action: 'Message sent', newValue: 'TM status update', sourceModule: 'Conversations' },
  { id: 'AUD-007', timestamp: '2026-03-22T10:00:00', actor: 'Priya Sharma', actorRole: 'case-manager', entityType: 'document', entityId: 'DOC-004', action: 'Document uploaded', newValue: 'Commercial_Lease_Draft_v3.docx', sourceModule: 'Document Vault' },
  { id: 'AUD-008', timestamp: '2026-03-21T11:00:00', actor: 'Kavita Nair', actorRole: 'case-manager', entityType: 'event', entityId: 'EVT-003', action: 'Hearing scheduled', newValue: 'Apr 5, 2026 - Family Court', sourceModule: 'Calendar' },
  { id: 'AUD-009', timestamp: '2026-03-20T15:00:00', actor: 'Ananya Desai', actorRole: 'client', entityType: 'matter', entityId: 'MTR-008', action: 'New request submitted', newValue: 'Consumer complaint', sourceModule: 'Portal' },
  { id: 'AUD-010', timestamp: '2026-03-20T14:00:00', actor: 'Rahul Verma', actorRole: 'case-manager', entityType: 'invoice', entityId: 'INV-2025-007', action: 'Invoice sent', oldValue: 'Draft', newValue: 'Sent', sourceModule: 'Ledger' },
  { id: 'AUD-011', timestamp: '2026-03-20T10:00:00', actor: 'Adv. Kavita Nair', actorRole: 'case-manager', entityType: 'matter', entityId: 'MTR-007', action: 'Bail application prepared', sourceModule: 'Matter Desk' },
  { id: 'AUD-012', timestamp: '2026-03-20T09:00:00', actor: 'System', actorRole: 'system', entityType: 'invoice', entityId: 'INV-2025-005', action: 'Invoice marked overdue', oldValue: 'Pending', newValue: 'Overdue', sourceModule: 'Ledger' },
  { id: 'AUD-013', timestamp: '2026-03-18T14:30:00', actor: 'Arjun Mehta', actorRole: 'client', entityType: 'document', entityId: 'DOC-014', action: 'Document uploaded', newValue: 'GST_Notice_FY2023-24.pdf', sourceModule: 'Portal' },
  { id: 'AUD-014', timestamp: '2026-03-18T10:00:00', actor: 'Rahul Verma', actorRole: 'case-manager', entityType: 'matter', entityId: 'MTR-009', action: 'Matter created from request', newValue: 'Tax Advisory - GST', sourceModule: 'Intake Hub' },
  { id: 'AUD-015', timestamp: '2026-03-15T12:00:00', actor: 'System', actorRole: 'system', entityType: 'invoice', entityId: 'INV-2024-002', action: 'Invoice created', newValue: '₹11,800 - RERA Hearing', sourceModule: 'Ledger' },
  { id: 'AUD-016', timestamp: '2026-03-15T11:00:00', actor: 'Pooja Sharma', actorRole: 'client', entityType: 'lead', entityId: 'LEAD-010', action: 'New lead registered', newValue: 'FIR assistance - Urgent', sourceModule: 'Intake Hub' },
  { id: 'AUD-017', timestamp: '2026-03-14T09:00:00', actor: 'Rajesh Kumar', actorRole: 'client', entityType: 'lead', entityId: 'LEAD-009', action: 'New lead registered', newValue: 'FEMA compliance', sourceModule: 'Intake Hub' },
  { id: 'AUD-018', timestamp: '2026-03-12T16:00:00', actor: 'Priya Sharma', actorRole: 'case-manager', entityType: 'event', entityId: 'EVT-014', action: 'Consultation completed', newValue: 'Meera Joshi - Wrongful Termination', sourceModule: 'Calendar' },
  { id: 'AUD-019', timestamp: '2026-03-10T09:00:00', actor: 'Kavita Nair', actorRole: 'case-manager', entityType: 'event', entityId: 'EVT-015', action: 'Consultation completed', newValue: 'Karan Malhotra - NRI POA', sourceModule: 'Calendar' },
  { id: 'AUD-020', timestamp: '2025-02-20T11:30:00', actor: 'System', actorRole: 'system', entityType: 'payment', entityId: 'PAY-005', action: 'Payment received', newValue: '₹35,400 - Ananya Desai', sourceModule: 'Ledger' },
  { id: 'AUD-021', timestamp: '2025-02-12T13:00:00', actor: 'System', actorRole: 'system', entityType: 'payment', entityId: 'PAY-006', action: 'Payment received', newValue: '₹17,700 - Vikram Singh', sourceModule: 'Ledger' },
  { id: 'AUD-022', timestamp: '2025-02-05T09:00:00', actor: 'Kavita Nair', actorRole: 'case-manager', entityType: 'matter', entityId: 'MTR-007', action: 'Counsel assigned', newValue: 'Adv. Sunita Rao', sourceModule: 'Matter Desk' },
  { id: 'AUD-023', timestamp: '2025-01-15T10:00:00', actor: 'Rahul Verma', actorRole: 'case-manager', entityType: 'matter', entityId: 'MTR-005', action: 'Stage updated', oldValue: 'Action Plan', newValue: 'Resolution', sourceModule: 'Matter Desk' },
  { id: 'AUD-024', timestamp: '2024-12-10T10:15:00', actor: 'Priya Sharma', actorRole: 'case-manager', entityType: 'payment', entityId: 'PAY-002', action: 'Offline payment recorded', newValue: '₹20,240 - Bank Transfer', sourceModule: 'Ledger' },
  { id: 'AUD-025', timestamp: '2024-11-18T14:30:00', actor: 'System', actorRole: 'system', entityType: 'payment', entityId: 'PAY-001', action: 'Online payment received', newValue: '₹17,700 - Arjun Mehta', sourceModule: 'Ledger' },
  { id: 'AUD-026', timestamp: '2024-11-15T14:00:00', actor: 'Adv. Rajan Mehra', actorRole: 'case-manager', entityType: 'document', entityId: 'DOC-003', action: 'Document uploaded', newValue: 'Legal_Notice_to_Developer.pdf', sourceModule: 'Document Vault' },
  { id: 'AUD-027', timestamp: '2024-11-01T09:00:00', actor: 'Priya Sharma', actorRole: 'case-manager', entityType: 'matter', entityId: 'MTR-001', action: 'Package created', newValue: 'RERA Dispute Resolution - ₹25,000', sourceModule: 'Matter Desk' },
  { id: 'AUD-028', timestamp: '2024-10-28T10:00:00', actor: 'Priya Sharma', actorRole: 'case-manager', entityType: 'matter', entityId: 'MTR-001', action: 'Stage updated', oldValue: 'Verification Call', newValue: 'Consultation', sourceModule: 'Matter Desk' },
  { id: 'AUD-029', timestamp: '2024-10-25T09:00:00', actor: 'Priya Sharma', actorRole: 'case-manager', entityType: 'matter', entityId: 'MTR-001', action: 'Counsel assigned', newValue: 'Adv. Rajan Mehra', sourceModule: 'Matter Desk' },
  { id: 'AUD-030', timestamp: '2024-10-24T10:00:00', actor: 'Arjun Mehta', actorRole: 'client', entityType: 'matter', entityId: 'MTR-001', action: 'Request submitted', newValue: 'RERA Dispute - Property Handover', sourceModule: 'Portal' },
];

// Helper to format currency
export const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

// Helper to format date
export const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Get service name from id
export const getServiceName = (id: string) => SERVICES.find(s => s.id === id)?.name ?? id;

// Get user by id
export const getUserById = (id: string) => PLATFORM_USERS.find(u => u.id === id);
