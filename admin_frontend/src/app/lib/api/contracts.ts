import type {
  AuditEntry,
  ChatMessage,
  Invoice,
  Matter,
  Payment,
  PlatformDocument,
  PlatformEvent,
  PlatformUser,
  MessageThread,
  SystemNotification,
} from '../../data/seedData';

export interface ApiErrorResponse {
  error: string;
  issues?: unknown;
  message?: string;
  requestId?: string;
  retryAfterSeconds?: number;
}

export interface AdminSessionUser {
  displayName: string;
  email: string;
  id: string;
  mustRotatePassword: boolean;
  permissionCodes: string[];
  roleCodes: string[];
}

export interface AdminSessionResponse {
  authenticated: boolean;
  csrfToken: string | null;
  user: AdminSessionUser | null;
}

export interface AdminPasswordChangeResponse {
  status: 'password_changed';
  user: AdminSessionUser;
}

export interface ClientListItem extends PlatformUser {
  activeMatters: number;
  hasUnread: boolean;
  mattersCount: number;
  totalDue: number;
}

export interface ClientsListResponse {
  clients: ClientListItem[];
}

export interface ClientWorkspaceResponse {
  auditEntries: AuditEntry[];
  client: PlatformUser;
  documents: PlatformDocument[];
  events: PlatformEvent[];
  invoices: Invoice[];
  matters: Matter[];
  threads: MessageThread[];
}

export interface MattersListResponse {
  matters: Matter[];
}

export interface MatterWorkspaceResponse {
  assignmentOptions: {
    counsel: Array<{ id: string; name: string }>;
    staff: Array<{ id: string; name: string }>;
  };
  documents: PlatformDocument[];
  events: PlatformEvent[];
  invoices: Invoice[];
  matter: Matter;
  threads: MessageThread[];
}

export interface MatterPackageProposalPackage {
  createdAt: string;
  createdBy: string;
  description: string;
  displayOrder: number;
  featurePoints: string[];
  id: string;
  isRecommended: boolean;
  isSelected: boolean;
  name: string;
  price: number;
  publishedAt?: string;
  selectedAt?: string;
  serviceCodes: string[];
  supersededAt?: string;
}

export interface MatterPackageProposalRecord {
  linkedInvoice: {
    id: string;
    invoiceNumber: string;
    matterPackageId: string;
    statusCode: string;
  } | null;
  packages: MatterPackageProposalPackage[];
  proposalVersion: number;
  publishedAt?: string;
  selectedAt?: string;
  selectedPackageId: string | null;
  status: 'archived' | 'draft' | 'published' | 'selected' | 'superseded';
  supersededAt?: string;
}

export interface MatterPackageProposalsResponse {
  active: MatterPackageProposalRecord | null;
  draft: MatterPackageProposalRecord | null;
  history: MatterPackageProposalRecord[];
  linkedInvoiceSummary: MatterPackageProposalRecord['linkedInvoice'] | null;
  matter: {
    id: string;
    matterNumber: string;
    title: string;
  };
  selectedPackageId: string | null;
}

export interface DocumentsListResponse {
  documents: PlatformDocument[];
  matters: Matter[];
}

export interface AdminDocumentVersion {
  checksumSha256: string;
  fileExtension: string;
  fileSizeBytes: number;
  id: string;
  isCurrent: boolean;
  mimeType: string;
  originalFileName: string;
  retentionHold: boolean;
  reviewState: 'reviewed' | 'unreviewed';
  uploadedAt: string;
  uploadedBy: string;
  versionNo: number;
  virusStatus: string;
}

export interface AdminDocumentDetailResponse {
  categoryCode: string;
  currentVersionNo: number;
  documentNumber: string;
  id: string;
  latestVersion: AdminDocumentVersion | null;
  ownerClientAccountId: string;
  title: string;
  versions: AdminDocumentVersion[];
  visibility: 'client' | 'internal';
  visibilityScopeCode: string;
}

export interface DocumentUploadResponse {
  documentId: string;
  status: 'uploaded' | 'version_uploaded';
  versionId?: string;
  versionNo?: number;
}

export interface AdminRequestRecord {
  clientEmail: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  consultationMode: string;
  createdAt: string;
  expertiseArea: string;
  id: string;
  issueSummary: string;
  matterId?: string;
  matterNumber?: string;
  ownerName: string;
  preferredEndAt?: string;
  preferredStartAt?: string;
  quoteTotalAmount: number;
  requestNumber: string;
  selectedServices: string[];
  statusCode: string;
  statusLabel: string;
  title: string;
  urgencyCode: string;
  urgencyLabel: string;
}

export interface RequestsWorkspaceResponse {
  metrics: {
    convertedThisMonth: number;
    openRequests: number;
    scheduledConsultations: number;
    urgentRequests: number;
  };
  requests: AdminRequestRecord[];
}

export interface AdminRequestDecisionResponse {
  matterId?: string;
  matterNumber?: string;
  message: string;
  requestId: string;
  requestNumber: string;
  status:
    | 'already_approved'
    | 'already_converted'
    | 'already_declined'
    | 'approved'
    | 'converted'
    | 'declined'
    | 'information_requested';
  statusCode: string;
  statusLabel: string;
}

export interface MessagesWorkspaceResponse {
  clients: PlatformUser[];
  events: PlatformEvent[];
  invoices: Invoice[];
  matters: Matter[];
  messages: ChatMessage[];
  threads: MessageThread[];
}

export interface AdminTaskRecord {
  assignee: string;
  client: string;
  dueDate: string;
  id: string;
  isOverdue: boolean;
  isToday: boolean;
  matter: string;
  note: string;
  priority: 'High' | 'Medium' | 'Low';
  sourceId: string;
  sourceType: 'document' | 'event' | 'invoice' | 'matter' | 'message' | 'reminder';
  status: 'completed' | 'in_progress' | 'todo' | 'waiting_client' | 'waiting_internal';
  title: string;
}

export interface TasksWorkspaceResponse {
  metrics: {
    completedRecent: number;
    dueToday: number;
    open: number;
    overdue: number;
    waiting: number;
  };
  tasks: AdminTaskRecord[];
}

export interface BillingWorkspaceResponse {
  invoices: Invoice[];
  matters: Matter[];
  payments: Payment[];
  refunds: RefundRecord[];
}

export interface RecordPaymentResponse {
  amountDue: number;
  amountPaid: number;
  invoiceId: string;
  invoiceStatus: string;
  paymentId: string;
  status: 'recorded';
}

export interface RefundRecord {
  amount: number;
  clientId: string;
  clientName: string;
  completedAt?: string;
  id: string;
  invoiceId: string;
  matterId: string;
  paymentId: string;
  reasonText: string;
  requestedAt: string;
  requestedBy: string;
  status: string;
}

export interface EventsWorkspaceResponse {
  clients: PlatformUser[];
  events: PlatformEvent[];
  matters: Matter[];
}

export interface NotificationsListResponse {
  notifications: SystemNotification[];
}

export interface ReminderQueueItem {
  channelCode: string;
  clientName?: string;
  deliveryModeLabel: string;
  eventId: string;
  eventTitle: string;
  failureReason?: string;
  id: string;
  lockedAt?: string;
  maxAttempts: number;
  nextAttemptAt?: string;
  recipientName: string;
  retryCount: number;
  scheduledAt: string;
  sentAt?: string;
  status: 'cancelled' | 'failed' | 'pending' | 'processing' | 'sent';
}

export interface ReminderWorkspaceResponse {
  metrics: {
    due: number;
    failed: number;
    pending: number;
    processing: number;
    sentRecent: number;
  };
  providerMode: {
    email: 'disabled' | 'preview' | 'resend';
    inApp: 'local';
    sms: 'disabled' | 'preview' | 'twilio-verify';
  };
  reminders: ReminderQueueItem[];
  status: 'ok';
}

export interface ReminderProcessResponse {
  alreadyNotified: number;
  failed: number;
  locked: number;
  processed: number;
  providerMode: ReminderWorkspaceResponse['providerMode'];
  skipped: number;
  status: 'processed';
}

export interface ReminderRetryResponse {
  providerMode: ReminderWorkspaceResponse['providerMode'];
  reminderId: string;
  status: 'already_sent' | 'retried' | 'skipped';
}

export interface AuditEntriesResponse {
  entries: AuditEntry[];
}

export interface SearchResultItem {
  id: string;
  subtitle: string;
  title: string;
  type: 'Client' | 'Document' | 'Matter' | 'Message';
}

export interface SearchResultsResponse {
  results: SearchResultItem[];
}

export interface RbacWorkspaceResponse {
  permissions: Array<{
    actionName: string;
    code: string;
    description: string;
    moduleName: string;
  }>;
  roles: Array<{
    code: string;
    description: string;
    isActive: boolean;
    isSystem: boolean;
    name: string;
    permissionCodes: string[];
    userCount: number;
  }>;
  users: Array<{
    displayName: string;
    email: string;
    id: string;
    permissionCodes: string[];
    roleCodes: string[];
  }>;
}

export interface DashboardWorkspaceResponse {
  accessOverview: {
    roles: RbacWorkspaceResponse['roles'];
    users: RbacWorkspaceResponse['users'];
  };
  aging: Array<{ amount: number; bucket: string }>;
  alertBanner: {
    staleMatters: number;
    summary: string;
  };
  metrics: {
    docBacklog: number;
    failedReminders?: number;
    openMatters: number;
    pendingInvoices: number;
    pendingReminders?: number;
    unreadThreads: number;
  };
  recentAudit: AuditEntry[];
  recentNotifications: SystemNotification[];
  revenueTrend: Array<{ month: string; revenue: number }>;
  stageMix: Array<{ name: string; value: number }>;
}

export interface ReportsWorkspaceResponse {
  documentActivity: Array<{ label: string; value: number }>;
  intakeTrend: Array<{ converted: number; leads: number; month: string }>;
  invoiceAging: Array<{ amount: number; bucket: string }>;
  resolutionTimes: Array<{ days: number; label: string }>;
  revenueTrend: Array<{ currentRevenue: number; month: string; previousRevenue: number }>;
  stageMix: Array<{ label: string; value: number }>;
  summary: {
    averageResolutionDays: number;
    clientConversionRate: number;
    refundsWriteOffs: number;
    totalCollections: number;
    totalRequests: number;
  };
  workloadByAssignee: Array<{
    activeMatters: number;
    label: string;
    utilizationRate: number;
    waitingThreads: number;
  }>;
}

export interface SettingsWorkspaceResponse {
  consultationModes: Array<{
    code: string;
    isActive: boolean;
    label: string;
  }>;
  documentCategories: Array<{
    code: string;
    usageCount: number;
  }>;
  invoiceConfiguration: {
    defaultManualDueDays: number;
    invoiceStatuses: Array<{ code: string; label: string }>;
    latestInvoiceNumber: string | null;
    nextInvoiceNumber: string | null;
    taxRates: Array<{
      code: string;
      isActive: boolean;
      name: string;
      ratePercent: number;
    }>;
  };
  notificationTypes: Array<{
    code: string;
    label: string;
  }>;
  pricingRules: {
    serviceSlabs: Array<{
      baseAmount: number;
      effectiveFrom: string;
      effectiveTo: string | null;
      isActive: boolean;
      maxServiceCount: number | null;
      minServiceCount: number;
      perExtraServiceAmount: number | null;
    }>;
    urgencyRules: Array<{
      code: string;
      isActive: boolean;
      label: string;
      surchargeType: string;
      surchargeValue: number;
    }>;
  };
  rbac: {
    canManage: boolean;
    permissions: RbacWorkspaceResponse['permissions'];
    roles: RbacWorkspaceResponse['roles'];
  };
  services: Array<{
    code: string;
    description: string;
    domainName: string;
    isActive: boolean;
    name: string;
    sortOrder: number;
  }>;
  templates: Array<{
    channel: string;
    id: string;
    label: string;
  }>;
}
