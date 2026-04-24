import type {
  Advocate,
  AuditEntry,
  ChatMessage,
  ConsultationMode,
  Invoice,
  Lead,
  Matter,
  MatterPackage,
  MessageThread,
  Payment,
  PlatformDocument,
  PlatformEvent,
  PlatformUser,
  StaffMember,
} from '../../data/dashboardTypes';
import type { UrgencyLevel } from '../../data/requestWizardData';

export interface ApiErrorResponse {
  error: string;
  message?: string;
  issues?: unknown;
  requestId?: string;
  retryAfterSeconds?: number;
}

export interface ApiHealthResponse {
  environment?: string;
  service: string;
  status: 'ok';
  timestamp: string;
  uptimeSeconds?: number;
}

export interface ClientIntakeSubmission {
  companyName: string;
  contactEmail: string;
  contactName: string;
  message: string;
  practiceArea?: string;
}

export interface ClientIntakeSubmissionResponse {
  message: string;
}

export interface AuthSessionUser {
  avatar: string;
  email: string;
  id: string;
  joinedAt: string;
  lastActiveAt: string;
  lifecycle: string;
  name: string;
  owner: string;
  phone: string;
  region: string;
}

export interface AuthSessionResponse {
  authenticated: boolean;
  user: AuthSessionUser | null;
}

export interface AuthActionResponse {
  status:
    | 'authenticated'
    | 'email_verification_required'
    | 'phone_capture_required'
    | 'phone_otp_required'
    | 'password_reset_requested'
    | 'password_reset_completed';
  message: string;
  deliveryHint?: string;
  email?: string;
  phone?: string;
  user?: AuthSessionUser;
}

export interface DashboardRequestDocumentPayload {
  name: string;
  size: number;
  type: string;
}

export interface DashboardRequestSubmissionPayload {
  caseDetails: string;
  consultationMode: ConsultationMode;
  documentUploadIds: string[];
  documents: DashboardRequestDocumentPayload[];
  email: string;
  fullName: string;
  legalDomain: string;
  mobile: string;
  pastLegalAction: boolean;
  preferredDate: string;
  preferredTime: string;
  services: string[];
  urgency: UrgencyLevel;
  whatsappSame: boolean;
}

export interface DashboardMessageSubmissionPayload {
  attachmentUploadIds?: string[];
  content: string;
  threadId: string;
}

export interface CreateUploadIntentPayload {
  checksumSha256: string;
  mimeType: string;
  originalName: string;
  relatedEntityId?: string;
  relatedEntityType?: 'invoice' | 'matter' | 'request' | 'thread';
  sizeBytes: number;
  sourceModule: string;
}

export interface StoredUploadResponse {
  checksumSha256: string;
  createdAt: string;
  finalizedAt?: string;
  id: string;
  mimeType: string;
  originalName: string;
  ownerAccountId: string;
  relatedEntityId?: string;
  relatedEntityType?: 'invoice' | 'matter' | 'request' | 'thread';
  sizeBytes: number;
  sourceModule: string;
  status: 'pending' | 'stored' | 'attached' | 'failed';
  storageDriver: 'local';
  storageKey: string;
}

export interface CreateUploadIntentResponse {
  maxSizeBytes: number;
  upload: StoredUploadResponse;
  uploadId: string;
  uploadUrl: string;
}

export interface StoreUploadContentResponse {
  status: 'stored';
  upload: StoredUploadResponse;
}

export interface DashboardSnapshotResponse {
  advocates: Advocate[];
  auditEntries: AuditEntry[];
  currentClient: PlatformUser;
  documents: PlatformDocument[];
  events: PlatformEvent[];
  invoices: Invoice[];
  leads: Lead[];
  matters: Matter[];
  messages: ChatMessage[];
  packages: MatterPackage[];
  payments: Payment[];
  staff: StaffMember[];
  threads: MessageThread[];
  users: PlatformUser[];
}

export interface DashboardPackageSelectionResponse {
  generatedInvoiceId: string;
  selectedPackageId: string;
  snapshot: DashboardSnapshotResponse;
}

export interface NotificationPreferencesResponse {
  caseActivityAlerts: boolean;
  emailUpdates: boolean;
  invoiceReminders: boolean;
  productAnnouncements: boolean;
  smsAlerts: boolean;
}

export type UpdateNotificationPreferencesPayload = NotificationPreferencesResponse;

export interface PortalNotificationResponse {
  actionLabel: string;
  actionTarget: 'billing' | 'cases' | 'documents' | 'messages';
  createdAt: string;
  description: string;
  id: string;
  isRead: boolean;
  meta: string;
  priorityCode: string;
  threadId: string | null;
  title: string;
  typeCode: string;
  typeLabel: string;
}

export interface InvoiceLineTaxSummaryResponse {
  amount: number;
  code: string;
  id: number;
  name: string;
  percent: number;
}

export interface InvoiceLineSummaryResponse {
  description: string;
  discountAmount: number;
  id: number;
  lineSubtotal: number;
  lineTotal: number;
  quantity: number;
  serviceId: string | null;
  sortOrder: number;
  subscriptionPlanId: number | null;
  taxableAmount: number;
  taxes: InvoiceLineTaxSummaryResponse[];
  typeCode: string;
  unitPrice: number;
}

export interface InvoiceInstallmentSummaryResponse {
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  dueDate: string;
  id: number;
  installmentNo: number;
  paidAt: string | null;
  statusCode: string;
}

export interface LinkedInvoiceEntityResponse {
  id: string;
  label: string;
  type: 'invoice' | 'matter' | 'request';
}

export interface InvoiceDetailResponse {
  amountDue: number;
  amountPaid: number;
  amountRefunded: number;
  billingSnapshot: {
    addressLine1: string;
    addressLine2: string | null;
    billingEmail: string;
    billingName: string;
    billingPhone: string;
    city: string;
    countryCode: string;
    gstin: string | null;
    postalCode: string;
    state: string;
  } | null;
  clientAccountId: string;
  currencyCode: string;
  discountAmount: number;
  documents: LinkedInvoiceEntityResponse[];
  dueDate: string;
  id: string;
  installments: InvoiceInstallmentSummaryResponse[];
  invoiceNumber: string;
  issueDate: string;
  lines: InvoiceLineSummaryResponse[];
  matterId: string | null;
  statusCode: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  typeCode: string;
}
