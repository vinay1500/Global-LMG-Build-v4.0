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

export interface DocumentsListResponse {
  documents: PlatformDocument[];
}

export interface MessagesWorkspaceResponse {
  clients: PlatformUser[];
  events: PlatformEvent[];
  invoices: Invoice[];
  matters: Matter[];
  messages: ChatMessage[];
  threads: MessageThread[];
}

export interface BillingWorkspaceResponse {
  invoices: Invoice[];
  payments: Payment[];
  refunds: RefundRecord[];
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
    openMatters: number;
    pendingInvoices: number;
    unreadThreads: number;
  };
  recentAudit: AuditEntry[];
  recentNotifications: SystemNotification[];
  revenueTrend: Array<{ month: string; revenue: number }>;
  stageMix: Array<{ name: string; value: number }>;
}
