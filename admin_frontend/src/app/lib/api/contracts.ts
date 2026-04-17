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
}
