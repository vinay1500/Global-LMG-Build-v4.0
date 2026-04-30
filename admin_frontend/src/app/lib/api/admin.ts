import type {
  AuditEntriesResponse,
  AdminDocumentDetailResponse,
  BillingWorkspaceResponse,
  ClientWorkspaceResponse,
  ClientsListResponse,
  DashboardWorkspaceResponse,
  DocumentUploadResponse,
  DocumentsListResponse,
  EventsWorkspaceResponse,
  MatterPackageProposalsResponse,
  MatterWorkspaceResponse,
  MattersListResponse,
  MessagesWorkspaceResponse,
  NotificationsListResponse,
  ReminderProcessResponse,
  ReminderRetryResponse,
  ReminderWorkspaceResponse,
  ReportDrilldownKind,
  ReportDrilldownResponse,
  RecordPaymentResponse,
  AdminRequestDecisionResponse,
  ReportsWorkspaceResponse,
  RequestsWorkspaceResponse,
  RbacWorkspaceResponse,
  SearchResultsResponse,
  SettingsWorkspaceResponse,
  TasksWorkspaceResponse,
} from './contracts';
import { apiRequest } from './client';
import { API_ENDPOINTS } from './endpoints';

const withQuery = (url: string, params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `${url}?${query}` : url;
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');

const computeFileSha256 = async (file: File) => {
  const content = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', content);

  return {
    checksumSha256: toHex(digest),
    content,
  };
};

export const adminApi = {
  createInvoice: (payload: {
    amount: number;
    description: string;
    dueDate?: string;
    matterId: string;
  }) =>
    apiRequest<{ invoiceId: string; status: 'created' }>(API_ENDPOINTS.admin.createInvoice(), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  createEvent: (payload: {
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
  }) =>
    apiRequest<{ status: 'created' }>(API_ENDPOINTS.admin.createEvent(), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  updateEvent: (
    eventId: string,
    payload: {
      clientAccountId?: string;
      date?: string;
      durationMinutes?: number;
      matterId?: string | null;
      meetLink?: string | null;
      mode?: string;
      notes?: string | null;
      time?: string;
      title?: string;
      type?: string;
      visibleToClient?: boolean;
    }
  ) =>
    apiRequest<{ eventId: string; status: 'updated' }>(API_ENDPOINTS.admin.updateEvent(eventId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
    }),
  cancelEvent: (eventId: string, payload: { reason?: string } = {}) =>
    apiRequest<{ eventId: string; status: 'cancelled' }>(
      API_ENDPOINTS.admin.cancelEvent(eventId),
      {
        body: JSON.stringify(payload),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }
    ),
  createMatterAssignment: (
    matterId: string,
    payload: {
      assignmentRoleCode: string;
      counselPartnerId?: string;
      feeAgreedAmount?: number;
      feeDueAmount?: number;
      feePaidAmount?: number;
      internalUserId?: string;
      isPrimary?: boolean;
      notes?: string;
    }
  ) =>
    apiRequest<{ status: 'created' }>(API_ENDPOINTS.admin.createMatterAssignment(matterId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  createMatterNote: (
    matterId: string,
    payload: { bodyText: string; title: string; visibleToClient?: boolean }
  ) =>
    apiRequest<{ status: 'created' }>(API_ENDPOINTS.admin.createMatterNote(matterId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  createRefund: (payload: {
    amount: number;
    invoiceId?: string;
    paymentId: string;
    reasonText: string;
  }) =>
    apiRequest<{ status: 'created' }>(API_ENDPOINTS.admin.createRefund(), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  recordPayment: (payload: {
    amount: number;
    invoiceId: string;
    notes?: string;
    paymentDate: string;
    paymentMethod: 'bank-transfer' | 'cash' | 'cheque' | 'online';
    referenceNumber?: string;
  }) =>
    apiRequest<RecordPaymentResponse>(API_ENDPOINTS.admin.recordPayment(), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  getAuditEntries: () => apiRequest<AuditEntriesResponse>(API_ENDPOINTS.admin.audit()),
  getBillingWorkspace: () =>
    apiRequest<BillingWorkspaceResponse>(API_ENDPOINTS.admin.billingWorkspace()),
  getClientWorkspace: (clientId: string) =>
    apiRequest<ClientWorkspaceResponse>(API_ENDPOINTS.admin.clientWorkspace(clientId)),
  getDashboardWorkspace: () =>
    apiRequest<DashboardWorkspaceResponse>(API_ENDPOINTS.admin.dashboard()),
  getDocumentDetail: (documentId: string) =>
    apiRequest<AdminDocumentDetailResponse>(API_ENDPOINTS.admin.documentDetail(documentId)),
  getDocuments: () => apiRequest<DocumentsListResponse>(API_ENDPOINTS.admin.documents()),
  getEventsWorkspace: () => apiRequest<EventsWorkspaceResponse>(API_ENDPOINTS.admin.events()),
  getHealth: () =>
    apiRequest<{ service: string; status: 'ok' }>(API_ENDPOINTS.admin.health()),
  getMatterPackageProposals: (matterId: string) =>
    apiRequest<MatterPackageProposalsResponse>(API_ENDPOINTS.admin.matterPackageProposals(matterId)),
  getMatterWorkspace: (matterId: string) =>
    apiRequest<MatterWorkspaceResponse>(API_ENDPOINTS.admin.matterWorkspace(matterId)),
  getMessagesWorkspace: () =>
    apiRequest<MessagesWorkspaceResponse>(API_ENDPOINTS.admin.messagesWorkspace()),
  getNotifications: () =>
    apiRequest<NotificationsListResponse>(API_ENDPOINTS.admin.notifications()),
  getReminderWorkspace: () =>
    apiRequest<ReminderWorkspaceResponse>(API_ENDPOINTS.admin.reminderWorkspace()),
  getReportsWorkspace: () =>
    apiRequest<ReportsWorkspaceResponse>(API_ENDPOINTS.admin.reportsWorkspace()),
  getReportDrilldown: (
    kind: ReportDrilldownKind,
    params: { limit?: number; offset?: number } = {}
  ) =>
    apiRequest<ReportDrilldownResponse>(
      withQuery(API_ENDPOINTS.admin.reportDrilldown(kind), {
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
      })
    ),
  getRequestsWorkspace: () =>
    apiRequest<RequestsWorkspaceResponse>(API_ENDPOINTS.admin.requestsWorkspace()),
  getRbacWorkspace: () =>
    apiRequest<RbacWorkspaceResponse>(API_ENDPOINTS.admin.rbacWorkspace()),
  getSettingsWorkspace: () =>
    apiRequest<SettingsWorkspaceResponse>(API_ENDPOINTS.admin.settingsWorkspace()),
  getTasksWorkspace: () =>
    apiRequest<TasksWorkspaceResponse>(API_ENDPOINTS.admin.tasksWorkspace()),
  listClients: (params: { limit?: number; offset?: number; search?: string } = {}) =>
    apiRequest<ClientsListResponse>(
      withQuery(API_ENDPOINTS.admin.clients(), {
        limit: params.limit ?? 100,
        offset: params.offset ?? 0,
        search: params.search,
      })
    ),
  listMatters: (params: { limit?: number; search?: string } = {}) =>
    apiRequest<MattersListResponse>(
      withQuery(API_ENDPOINTS.admin.matters(), {
        limit: params.limit ?? 100,
        search: params.search,
      })
    ),
  markNotificationRead: (notificationId: string) =>
    apiRequest<{ status: 'read' }>(API_ENDPOINTS.admin.notificationRead(notificationId), {
      method: 'POST',
    }),
  dismissNotification: (notificationId: string) =>
    apiRequest<{ status: 'dismissed' }>(API_ENDPOINTS.admin.notificationDismiss(notificationId), {
      method: 'POST',
    }),
  processReminders: () =>
    apiRequest<ReminderProcessResponse>(API_ENDPOINTS.admin.processReminders(), {
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  retryReminder: (reminderId: string) =>
    apiRequest<ReminderRetryResponse>(API_ENDPOINTS.admin.reminderRetry(reminderId), {
      method: 'POST',
    }),
  markThreadRead: (threadId: string) =>
    apiRequest<{ status: 'read' }>(API_ENDPOINTS.admin.messageRead(threadId), {
      method: 'POST',
    }),
  archiveThread: (threadId: string) =>
    apiRequest<{ status: 'archived' }>(API_ENDPOINTS.admin.messageArchive(threadId), {
      method: 'POST',
    }),
  replyToThread: (
    threadId: string,
    payload: { content: string; visibleToClient?: boolean }
  ) =>
    apiRequest<{ status: 'created' }>(API_ENDPOINTS.admin.replyToThread(threadId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  approveRequest: (requestId: string, payload: { note?: string } = {}) =>
    apiRequest<AdminRequestDecisionResponse>(API_ENDPOINTS.admin.requestApprove(requestId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  convertRequest: (requestId: string, payload: { note?: string } = {}) =>
    apiRequest<AdminRequestDecisionResponse>(API_ENDPOINTS.admin.requestConvert(requestId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  declineRequest: (requestId: string, payload: { note?: string } = {}) =>
    apiRequest<AdminRequestDecisionResponse>(API_ENDPOINTS.admin.requestDecline(requestId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  requestInformation: (requestId: string, payload: { note: string }) =>
    apiRequest<AdminRequestDecisionResponse>(API_ENDPOINTS.admin.requestInformation(requestId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  search: (query: string) =>
    apiRequest<SearchResultsResponse>(
      withQuery(API_ENDPOINTS.admin.search(), {
        q: query,
      })
    ),
  sendInvoice: (invoiceId: string) =>
    apiRequest<{ invoiceId: string; status: 'reminder_sent' | 'sent' }>(
      API_ENDPOINTS.admin.sendInvoice(invoiceId),
      {
        method: 'POST',
      }
    ),
  saveMatterPackageDraft: (
    matterId: string,
    payload: {
      packages: Array<{
        description?: string;
        displayOrder?: number;
        featurePoints?: string[];
        id?: string;
        isRecommended?: boolean;
        name: string;
        price: number;
        serviceCodes?: string[];
      }>;
      proposalVersion?: number;
    }
  ) =>
    apiRequest<MatterPackageProposalsResponse>(API_ENDPOINTS.admin.matterPackageDraft(matterId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'PUT',
    }),
  publishMatterProposal: (
    matterId: string,
    payload: { note?: string; proposalVersion: number }
  ) =>
    apiRequest<MatterPackageProposalsResponse>(API_ENDPOINTS.admin.matterPackagePublish(matterId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  overrideMatterPackageSelection: (
    matterId: string,
    payload: { matterPackageId: string; reasonText: string }
  ) =>
    apiRequest<{ generatedInvoiceId: string; status: 'updated'; workspace: MatterPackageProposalsResponse }>(
      API_ENDPOINTS.admin.matterPackageOverride(matterId),
      {
        body: JSON.stringify(payload),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }
    ),
  archiveMatterProposal: (matterId: string, proposalVersion: number) =>
    apiRequest<MatterPackageProposalsResponse>(
      API_ENDPOINTS.admin.matterPackageArchive(matterId, proposalVersion),
      {
        method: 'POST',
      }
    ),
  updateDocumentControls: (
    documentId: string,
    payload: { reviewState: 'reviewed' | 'unreviewed'; visibility: 'client' | 'internal' }
  ) =>
    apiRequest<{ status: 'updated' }>(API_ENDPOINTS.admin.documentControls(documentId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
    }),
  buildDocumentDownloadUrl: (documentId: string) => API_ENDPOINTS.admin.documentDownload(documentId),
  buildDocumentPreviewUrl: (documentId: string) => API_ENDPOINTS.admin.documentPreview(documentId),
  buildReportDrilldownExportUrl: (kind: ReportDrilldownKind) =>
    API_ENDPOINTS.admin.reportDrilldownExport(kind),
  uploadDocument: async (payload: {
    file: File;
    matterId: string;
    reviewState: 'reviewed' | 'unreviewed';
    visibility: 'client' | 'internal';
  }) => {
    const { checksumSha256, content } = await computeFileSha256(payload.file);

    return apiRequest<DocumentUploadResponse>(
      withQuery(API_ENDPOINTS.admin.uploadDocument(), {
        checksumSha256,
        fileName: payload.file.name,
        matterId: payload.matterId,
        mimeType: payload.file.type || 'application/octet-stream',
        reviewState: payload.reviewState,
        visibility: payload.visibility,
      }),
      {
        body: content,
        headers: { 'content-type': 'application/octet-stream' },
        method: 'POST',
      }
    );
  },
  uploadDocumentVersion: async (
    documentId: string,
    payload: {
      file: File;
      reviewState: 'reviewed' | 'unreviewed';
    }
  ) => {
    const { checksumSha256, content } = await computeFileSha256(payload.file);

    return apiRequest<DocumentUploadResponse>(
      withQuery(API_ENDPOINTS.admin.documentVersionUpload(documentId), {
        checksumSha256,
        fileName: payload.file.name,
        mimeType: payload.file.type || 'application/octet-stream',
        reviewState: payload.reviewState,
      }),
      {
        body: content,
        headers: { 'content-type': 'application/octet-stream' },
        method: 'POST',
      }
    );
  },
  updateMatterDetails: (
    matterId: string,
    payload: {
      issueSummary?: string;
      operationalStatusCode?: string;
      priorityCode?: string;
      quotedTotalAmount?: number;
      selectedServices?: string[];
    }
  ) =>
    apiRequest<{ status: 'updated' }>(API_ENDPOINTS.admin.matterDetails(matterId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
    }),
  updateMatterStage: (
    matterId: string,
    payload: {
      changeNote?: string;
      operationalStatusCode?: string;
      stageCode: string;
      visibleToClient?: boolean;
    }
  ) =>
    apiRequest<{ status: 'updated' }>(API_ENDPOINTS.admin.matterStage(matterId), {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
    }),
};
