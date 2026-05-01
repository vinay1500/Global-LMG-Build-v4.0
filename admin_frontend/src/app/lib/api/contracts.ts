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

export interface AdminAccountProfile {
  avatarUrl: string | null;
  city: string;
  displayName: string;
  email: string;
  firstName: string;
  id: string;
  jobTitle: string;
  lastName: string;
  permissionCodes: string[];
  phone: string;
  roleCodes: string[];
  state: string;
  timezoneName: string;
}

export interface AdminAccountPreferences {
  avatarColor: string;
  dateFormat: string;
  defaultLandingPath:
    | '/billing'
    | '/clients'
    | '/dashboard'
    | '/documents'
    | '/matters'
    | '/meetings'
    | '/messages'
    | '/notifications'
    | '/reports'
    | '/requests';
  densityCode: 'comfortable' | 'compact';
  inAppNotificationsEnabled: boolean;
  timezoneName: string;
}

export interface AdminAccountResponse {
  preferences: AdminAccountPreferences;
  profile: AdminAccountProfile;
}

export interface UpdateAdminProfilePayload {
  city?: string | null;
  displayName?: string;
  jobTitle?: string | null;
  phone?: string | null;
  state?: string | null;
}

export interface UpdateAdminPreferencesPayload {
  avatarColor?: string;
  dateFormat?: string;
  defaultLandingPath?: AdminAccountPreferences['defaultLandingPath'];
  densityCode?: AdminAccountPreferences['densityCode'];
  inAppNotificationsEnabled?: boolean;
  timezoneName?: string;
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

export interface CreateClientPayload {
  city?: string;
  clientType?: 'individual' | 'organization';
  displayName: string;
  email: string;
  notes?: string;
  phone?: string;
  portalAccessEnabled?: boolean;
  primaryContactName: string;
  state?: string;
}

export interface CreateClientResponse {
  client: ClientListItem;
  portalInvite: {
    mode: 'manual';
    status: 'not_sent';
  };
  status: 'created';
}

export interface ClientWorkspaceResponse {
  auditEntries: AuditEntry[];
  client: PlatformUser;
  documents: PlatformDocument[];
  events: PlatformEvent[];
  invoices: Invoice[];
  matters: Matter[];
  notifications: SystemNotification[];
  payments: Payment[];
  requests: AdminRequestRecord[];
  summary: {
    activeMatterCount: number;
    documentCount: number;
    eventCount: number;
    invoiceCount: number;
    matterCount: number;
    notificationCount: number;
    outstandingBalance: number;
    paymentCount: number;
    requestCount: number;
    threadCount: number;
    totalBilled: number;
    totalPaid: number;
    unreadThreadCount: number;
  };
  threads: MessageThread[];
}

export interface MatterCreateOptions {
  clients: Array<{ email: string; id: string; name: string }>;
  consultationModes: Array<{ code: string; label: string }>;
  domains: Array<{ code: string; name: string }>;
  priorities: Array<{ code: string; label: string }>;
  services: Array<{ code: string; domainCode: string; domainName: string; name: string }>;
  stages: Array<{ code: string; label: string }>;
  statuses: Array<{ code: string; label: string }>;
  urgencyRules: Array<{ code: string; label: string }>;
}

export interface CreateMatterPayload {
  clientAccountPublicId: string;
  clientVisible?: boolean;
  consultationModeCode?: string;
  legalDomainCode?: string;
  priorityCode?: string;
  serviceCode?: string;
  serviceCodes?: string[];
  stageCode?: string;
  statusCode?: string;
  summary?: string;
  title: string;
  urgencyCode?: string;
}

export interface CreateMatterResponse {
  matter: Matter;
  status: 'created';
}

export interface MattersListResponse {
  createOptions?: MatterCreateOptions;
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
  documentTypes?: SettingsDocumentType[];
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

export interface CreateMessageThreadResponse {
  messageId: string;
  status: 'created';
  threadId: string;
  threadNumber: string;
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
  invoiceSettings: InvoiceSettings;
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

export interface CreateRbacRolePayload {
  code?: string;
  description?: string;
  name: string;
}

export interface UpdateRbacRolePayload {
  description?: string;
  isActive?: boolean;
  name?: string;
}

export interface UpdateRbacRolePermissionsPayload {
  permissionCodes: string[];
}

export interface AssignRbacUserRolePayload {
  roleCode: string;
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
  kpis: {
    activeMatters: number;
    closedMatters: number;
    convertedRequests: number;
    declinedRequests: number;
    failedOperationalTasks: number;
    failedReminders: number;
    openRequests: number;
    outstandingInvoiceAmount: number;
    overdueInvoices: number;
    paidInvoiceAmount: number;
    pendingDocumentReviews: number;
    pendingReminders: number;
    recentClientActivity: number;
    staleMatters: number;
    upcomingEvents: number;
    waitingThreads: number;
  };
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

export type ReportDrilldownKind =
  | 'active-matters'
  | 'closed-matters'
  | 'converted-requests'
  | 'declined-requests'
  | 'failed-reminders'
  | 'open-requests'
  | 'outstanding-invoices'
  | 'overdue-invoices'
  | 'paid-invoices'
  | 'pending-documents'
  | 'pending-reminders'
  | 'recent-notifications'
  | 'stale-matters'
  | 'upcoming-events'
  | 'waiting-threads';

export interface ReportDrilldownItem {
  amount?: number;
  clientName?: string;
  date?: string;
  id: string;
  matterTitle?: string;
  routeId?: string;
  routeType:
    | 'document'
    | 'event'
    | 'invoice'
    | 'matter'
    | 'message'
    | 'notification'
    | 'reminder'
    | 'request';
  status?: string;
  subtitle?: string;
  title: string;
}

export interface ReportDrilldownResponse {
  description: string;
  items: ReportDrilldownItem[];
  kind: ReportDrilldownKind;
  label: string;
  limit: number;
  offset: number;
  total: number;
}

export interface InvoiceSettings {
  billingDisplayName: string;
  businessLegalName: string;
  businessState: string;
  defaultGstRateBps: number;
  defaultGstRatePercent: number;
  defaultSacCode: string | null;
  fallbackTaxType: 'cgst_sgst' | 'igst' | 'none';
  gstEnabled: boolean;
  gstin: string | null;
  invoiceFooter: string | null;
  invoicePrefix: string;
  paymentTermsDays: number;
  pricesIncludeTax: boolean;
  reverseChargeNote: string | null;
  taxMode: 'exempt' | 'forward_charge' | 'reverse_charge';
}

export type UpdateInvoiceSettingsPayload = Partial<{
  billingDisplayName: string;
  businessLegalName: string;
  businessState: string;
  defaultGstRatePercent: number;
  defaultSacCode: string | null;
  fallbackTaxType: InvoiceSettings['fallbackTaxType'];
  gstEnabled: boolean;
  gstin: string | null;
  invoiceFooter: string | null;
  invoicePrefix: string;
  paymentTermsDays: number;
  pricesIncludeTax: boolean;
  reverseChargeNote: string | null;
  taxMode: InvoiceSettings['taxMode'];
}>;

export type PlatformSettingValue = boolean | number | string | null;

export interface PlatformSetting {
  category: string;
  description: string | null;
  isSensitive: boolean;
  key: string;
  label: string;
  masked: boolean;
  updatedAt: string;
  updatedBy: number | null;
  value: PlatformSettingValue;
  valueType: 'boolean' | 'decimal' | 'integer' | 'json' | 'select' | 'string' | 'text';
  version: number;
}

export interface PlatformSettingsResponse {
  settings: PlatformSetting[];
}

export interface UpdatePlatformSettingPayload {
  value: PlatformSettingValue;
  version?: number;
}

export interface SettingsServiceDomain {
  code: string;
  isActive: boolean;
  name: string;
  sortOrder: number;
}

export interface SettingsService {
  code: string;
  description: string;
  domainCode: string;
  domainName: string;
  id: string;
  isActive: boolean;
  name: string;
  sortOrder: number;
}

export interface SettingsPricingSlab {
  baseAmount: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  id: string;
  isActive: boolean;
  maxServiceCount: number | null;
  minServiceCount: number;
  perExtraServiceAmount: number | null;
}

export interface SettingsUrgencyRule {
  code: string;
  id: string;
  isActive: boolean;
  label: string;
  sortOrder: number;
  surchargeType: 'flat' | 'percent' | string;
  surchargeValue: number;
}

export interface ServiceCatalogResponse {
  domains: SettingsServiceDomain[];
  services: SettingsService[];
}

export interface PricingRulesResponse {
  serviceSlabs: SettingsPricingSlab[];
  urgencyRules: SettingsUrgencyRule[];
}

export interface CreateServiceCatalogPayload {
  code?: string;
  description?: string | null;
  domainCode: string;
  isActive?: boolean;
  name: string;
  sortOrder?: number;
}

export type UpdateServiceCatalogPayload = Partial<Omit<CreateServiceCatalogPayload, 'code'>>;

export interface PricingSlabPayload {
  baseAmount: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive?: boolean;
  maxServiceCount?: number | null;
  minServiceCount: number;
  perExtraServiceAmount?: number | null;
}

export interface UrgencyRulePayload {
  code?: string;
  isActive?: boolean;
  label: string;
  sortOrder?: number;
  surchargeType: 'flat' | 'percent';
  surchargeValue: number;
}

export type UpdateUrgencyRulePayload = Partial<Omit<UrgencyRulePayload, 'code'>>;

export type TemplateType = 'document_checklist' | 'general' | 'invoice' | 'message' | 'notification';

export interface AdminTemplate {
  archivedAt: string | null;
  body: string;
  createdAt: string;
  id: string;
  isActive: boolean;
  isDefault: boolean;
  name: string;
  subject: string | null;
  type: TemplateType;
  updatedAt: string;
  variables: string[];
  version: number;
}

export interface TemplatesResponse {
  templates: AdminTemplate[];
}

export interface TemplatePayload {
  body: string;
  isActive?: boolean;
  name: string;
  subject?: string | null;
  type: TemplateType;
  variables?: string[];
}

export type UpdateTemplatePayload = Partial<Omit<TemplatePayload, 'type'>>;

export interface SettingsDocumentType {
  allowedExtensions: string[];
  archivedAt?: string | null;
  category: string;
  clientVisibleDefault: boolean;
  code: string;
  description: string;
  displayOrder: number;
  id: string;
  isActive: boolean;
  maxSizeMb: number;
  name: string;
  requiresReview: boolean;
  updatedAt?: string;
  usageCount?: number;
}

export interface DocumentTypesResponse {
  documentTypes: SettingsDocumentType[];
}

export interface DocumentTypePayload {
  allowedExtensions: string[];
  category: string;
  clientVisibleDefault?: boolean;
  code?: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  maxSizeMb: number;
  name: string;
  requiresReview?: boolean;
}

export type UpdateDocumentTypePayload = Partial<Omit<DocumentTypePayload, 'code'>>;

export type NotificationChannelCode = 'email' | 'in_app' | 'sms';

export interface NotificationDeliverySetting {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  isActive: boolean;
  label: string;
  pushEnabled: boolean;
  smsEnabled: boolean;
  sortOrder: number;
  template: { id: string; name: string; type: string } | null;
  templateId: string | null;
  typeCode: string;
}

export interface ReminderSetting {
  archivedAt: string | null;
  channelCode: NotificationChannelCode;
  displayOrder: number;
  eventTypeCode: string | null;
  eventTypeLabel: string;
  id: string;
  isActive: boolean;
  offsetMinutes: number;
}

export interface NotificationSettingsResponse {
  deliverySettings: NotificationDeliverySetting[];
  eventTypes: Array<{ code: string; label: string }>;
  providerMode: {
    email: 'disabled' | 'preview' | 'resend';
    inApp: 'local';
    push: 'disabled';
    sms: 'disabled' | 'preview' | 'twilio-verify';
  };
  reminderSettings: ReminderSetting[];
  templates: Array<{ id: string; name: string }>;
}

export interface NotificationDeliverySettingPayload {
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  isActive?: boolean;
  pushEnabled?: boolean;
  smsEnabled?: boolean;
  templateId?: string | null;
}

export interface ReminderSettingPayload {
  channelCode: NotificationChannelCode;
  eventTypeCode?: string | null;
  isActive?: boolean;
  offsetMinutes: number;
}

export type UpdateReminderSettingPayload = Partial<ReminderSettingPayload>;

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
  documentTypes: SettingsDocumentType[];
  invoiceConfiguration: {
    defaultManualDueDays: number;
    invoiceStatuses: Array<{ code: string; label: string }>;
    latestInvoiceNumber: string | null;
    nextInvoiceNumber: string | null;
    settings: InvoiceSettings;
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
  notificationSettings: NotificationSettingsResponse;
  platformSettings: PlatformSetting[];
  pricingRules: {
    serviceSlabs: SettingsPricingSlab[];
    urgencyRules: SettingsUrgencyRule[];
  };
  rbac: {
    canManage: boolean;
    permissions: RbacWorkspaceResponse['permissions'];
    roles: RbacWorkspaceResponse['roles'];
    users: RbacWorkspaceResponse['users'];
  };
  serviceDomains: SettingsServiceDomain[];
  services: SettingsService[];
  templates: AdminTemplate[];
}
