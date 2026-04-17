import type { RowDataPacket } from 'mysql2/promise';
import { queryRows } from '../lib/mysql.js';
import {
  buildMatterStages,
  mapLifecycle,
  mapMatterPriority,
  mapReviewState,
  mapVisibility,
  toUiDate,
  toUiDateTime,
  toUiTime,
} from '../lib/viewModels.js';

type MatterRow = RowDataPacket & {
  assignedCounsel: string | null;
  assignedStaff: string | null;
  clientId: string;
  clientName: string;
  consultationMode: string;
  createdAt: string;
  dbId: number;
  dueAmount: number;
  expertiseArea: string;
  id: string;
  issueSummary: string;
  lastUpdated: string;
  lifecycleStage: string;
  matterNumber: string;
  meetingLink: string | null;
  operationalStatus: string;
  paidAmount: number;
  totalFee: number;
  title: string;
  urgency: string;
};

type ServiceRow = RowDataPacket & { dbId: number; serviceCode: string };
type UpdateRow = RowDataPacket & { bodyText: string; dbId: number; visibleToClient: number };

type InvoiceRow = RowDataPacket & {
  clientId: string;
  clientName: string;
  dbId: number;
  discount: number;
  dueDate: string;
  id: string;
  issueDate: string;
  matterId: string | null;
  matterRef: string | null;
  matterTitle: string | null;
  paidDate: string | null;
  status: string;
  subtotal: number;
  tax: number;
  totalAmount: number;
};

type InvoiceLineRow = RowDataPacket & {
  amount: number;
  description: string;
  invoiceDbId: number;
  quantity: number;
  rate: number;
};

type DocumentRow = RowDataPacket & {
  clientId: string;
  clientName: string;
  docCategory: string;
  id: string;
  matterId: string | null;
  matterTitle: string | null;
  name: string;
  note: string | null;
  reviewStateSource: string;
  size: number;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
  visibilityScope: string;
};

type EventRow = RowDataPacket & {
  clientId: string;
  clientName: string;
  dateSource: string;
  duration: number;
  id: string;
  joinUrl: string | null;
  location: string | null;
  matterId: string | null;
  matterTitle: string | null;
  mode: string;
  notes: string | null;
  status: string;
  title: string;
  type: string;
  visibleToClient: number;
};

type ThreadRow = RowDataPacket & {
  assignedTo: string | null;
  clientId: string;
  clientName: string;
  id: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  matterId: string | null;
  matterRef: string | null;
  matterTitle: string | null;
  stage: string | null;
  status: string;
  urgency: string | null;
};

type MessageRow = RowDataPacket & {
  content: string;
  id: string;
  senderId: string | null;
  senderName: string | null;
  senderRole: 'admin' | 'client' | 'system';
  threadId: string;
  timestamp: string;
};

type PaymentRow = RowDataPacket & {
  amount: number;
  clientId: string;
  clientName: string;
  id: string;
  invoiceId: string | null;
  matterId: string | null;
  method: 'bank-transfer' | 'cash' | 'cheque' | 'online';
  recordedBy: string | null;
  reference: string | null;
  status: 'failed' | 'refunded' | 'success';
  timestamp: string;
};

type AuditRow = RowDataPacket & {
  action: string;
  actor: string | null;
  actorRole: string;
  entityId: string;
  entityType: string;
  id: string;
  sourceModule: string;
  timestamp: string;
};

const buildInClause = (values: readonly unknown[]) => values.map(() => '?').join(', ');

export const fetchMatters = async (filters: {
  clientAccountIds?: string[];
  limit?: number;
  matterIds?: string[];
  search?: string;
}) => {
  const where: string[] = ['m.archived_at IS NULL'];
  const params: unknown[] = [];

  if (filters.clientAccountIds?.length) {
    where.push(`ca.public_id IN (${buildInClause(filters.clientAccountIds)})`);
    params.push(...filters.clientAccountIds);
  }

  if (filters.matterIds?.length) {
    where.push(`m.public_id IN (${buildInClause(filters.matterIds)})`);
    params.push(...filters.matterIds);
  }

  if (filters.search) {
    where.push('(m.title LIKE ? OR m.matter_number LIKE ? OR ca.display_name LIKE ?)');
    const searchValue = `%${filters.search}%`;
    params.push(searchValue, searchValue, searchValue);
  }

  let sql = `
    SELECT
      m.id AS dbId,
      m.public_id AS id,
      ca.public_id AS clientId,
      ca.display_name AS clientName,
      m.title,
      m.matter_number AS matterNumber,
      m.current_stage_code AS lifecycleStage,
      m.operational_status_code AS operationalStatus,
      ld.domain_name AS expertiseArea,
      m.issue_summary AS issueSummary,
      pur.rule_code AS urgency,
      m.consultation_mode_code AS consultationMode,
      m.quoted_total_amount AS totalFee,
      m.paid_total_amount AS paidAmount,
      m.due_total_amount AS dueAmount,
      m.opened_at AS createdAt,
      m.last_activity_at AS lastUpdated,
      MAX(CASE WHEN ma.is_primary = 1 AND cp.id IS NOT NULL THEN cp.display_name END) AS assignedCounsel,
      MAX(CASE WHEN ma.is_primary = 1 AND iu.id IS NOT NULL THEN iu.display_name END) AS assignedStaff,
      MAX(CASE WHEN e.join_url IS NOT NULL AND e.status_code = 'upcoming' THEN e.join_url END) AS meetingLink
    FROM matters m
    JOIN client_accounts ca ON ca.id = m.client_account_id
    JOIN legal_domains ld ON ld.id = m.legal_domain_id
    JOIN pricing_urgency_rules pur ON pur.id = m.urgency_rule_id
    LEFT JOIN matter_assignments ma ON ma.matter_id = m.id AND ma.removed_at IS NULL
    LEFT JOIN counsel_partners cp ON cp.id = ma.counsel_partner_id
    LEFT JOIN users iu ON iu.id = ma.internal_user_id
    LEFT JOIN events e ON e.matter_id = m.id AND e.cancelled_at IS NULL
    WHERE ${where.join(' AND ')}
    GROUP BY
      m.id, m.public_id, ca.public_id, ca.display_name, m.title, m.matter_number,
      m.current_stage_code, m.operational_status_code, ld.domain_name, m.issue_summary,
      pur.rule_code, m.consultation_mode_code, m.quoted_total_amount, m.paid_total_amount,
      m.due_total_amount, m.opened_at, m.last_activity_at
    ORDER BY m.last_activity_at DESC`;

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  const matterRows = await queryRows<MatterRow>(sql, params);

  if (matterRows.length === 0) {
    return [];
  }

  const dbIds = matterRows.map((row) => row.dbId);
  const serviceRows = await queryRows<ServiceRow>(
    `SELECT ms.matter_id AS dbId, s.service_code AS serviceCode
     FROM matter_services ms
     JOIN services s ON s.id = ms.service_id
     WHERE ms.matter_id IN (${buildInClause(dbIds)})`,
    dbIds
  );
  const updateRows = await queryRows<UpdateRow>(
    `SELECT matter_id AS dbId, body_text AS bodyText, visible_to_client AS visibleToClient
     FROM matter_updates
     WHERE matter_id IN (${buildInClause(dbIds)})
     ORDER BY created_at DESC`,
    dbIds
  );

  const servicesByMatterId = serviceRows.reduce<Record<number, string[]>>((accumulator, row) => {
    accumulator[row.dbId] = accumulator[row.dbId] || [];
    accumulator[row.dbId]!.push(row.serviceCode);
    return accumulator;
  }, {});

  const updatesByMatterId = updateRows.reduce<
    Record<number, { clientVisibleNotes: string[]; internalNotes: string[] }>
  >((accumulator, row) => {
    accumulator[row.dbId] =
      accumulator[row.dbId] || { clientVisibleNotes: [], internalNotes: [] };

    if (row.visibleToClient) {
      accumulator[row.dbId]!.clientVisibleNotes.push(row.bodyText);
    } else {
      accumulator[row.dbId]!.internalNotes.push(row.bodyText);
    }

    return accumulator;
  }, {});

  return matterRows.map((row) => ({
    assignedCounsel: row.assignedCounsel || undefined,
    assignedStaff: row.assignedStaff || undefined,
    clientId: row.clientId,
    clientName: row.clientName,
    clientVisibleNotes: updatesByMatterId[row.dbId]?.clientVisibleNotes || [],
    consultationMode: row.consultationMode,
    createdAt: toUiDate(row.createdAt),
    dueAmount: row.dueAmount,
    expertiseArea: row.expertiseArea,
    id: row.id,
    internalNotes: updatesByMatterId[row.dbId]?.internalNotes || [],
    issueSummary: row.issueSummary,
    lastUpdated: toUiDate(row.lastUpdated),
    lifecycleStage: row.lifecycleStage,
    meetingLink: row.meetingLink || undefined,
    operationalStatus: row.operationalStatus,
    paidAmount: row.paidAmount,
    priority: mapMatterPriority(row.operationalStatus, row.urgency),
    referenceCode: row.matterNumber,
    selectedServices: servicesByMatterId[row.dbId] || [],
    stages: buildMatterStages(row.lifecycleStage),
    title: row.title,
    totalFee: row.totalFee,
    urgency: row.urgency,
  }));
};

export const fetchInvoices = async (filters: { clientAccountIds?: string[]; matterIds?: string[] }) => {
  const where: string[] = ['inv.archived_at IS NULL'];
  const params: unknown[] = [];

  if (filters.clientAccountIds?.length) {
    where.push(`ca.public_id IN (${buildInClause(filters.clientAccountIds)})`);
    params.push(...filters.clientAccountIds);
  }

  if (filters.matterIds?.length) {
    where.push(`m.public_id IN (${buildInClause(filters.matterIds)})`);
    params.push(...filters.matterIds);
  }

  const invoiceRows = await queryRows<InvoiceRow>(
    `SELECT
       inv.id AS dbId,
       inv.public_id AS id,
       ca.public_id AS clientId,
       ca.display_name AS clientName,
       m.public_id AS matterId,
       m.matter_number AS matterRef,
       m.title AS matterTitle,
       inv.subtotal_amount AS subtotal,
       inv.tax_amount AS tax,
       inv.discount_amount AS discount,
       inv.total_amount AS totalAmount,
       inv.status_code AS status,
       inv.issue_date AS issueDate,
       inv.due_date AS dueDate,
       MAX(pt.captured_at) AS paidDate
     FROM invoices inv
     JOIN client_accounts ca ON ca.id = inv.client_account_id
     LEFT JOIN matters m ON m.id = inv.matter_id
     LEFT JOIN payment_allocations pa ON pa.invoice_id = inv.id
     LEFT JOIN payment_transactions pt ON pt.id = pa.payment_transaction_id AND pt.status_code = 'captured'
     WHERE ${where.join(' AND ')}
     GROUP BY
       inv.id, inv.public_id, ca.public_id, ca.display_name, m.public_id, m.matter_number, m.title,
       inv.subtotal_amount, inv.tax_amount, inv.discount_amount, inv.total_amount,
       inv.status_code, inv.issue_date, inv.due_date
     ORDER BY inv.issue_date DESC, inv.created_at DESC`,
    params
  );

  if (invoiceRows.length === 0) {
    return [];
  }

  const invoiceDbIds = invoiceRows.map((row) => row.dbId);
  const lineRows = await queryRows<InvoiceLineRow>(
    `SELECT
       invoice_id AS invoiceDbId,
       description,
       quantity,
       unit_price AS rate,
       line_total AS amount
     FROM invoice_lines
     WHERE invoice_id IN (${buildInClause(invoiceDbIds)})
     ORDER BY sort_order ASC, id ASC`,
    invoiceDbIds
  );

  const linesByInvoiceId = lineRows.reduce<Record<number, InvoiceLineRow[]>>((accumulator, row) => {
    accumulator[row.invoiceDbId] = accumulator[row.invoiceDbId] || [];
    accumulator[row.invoiceDbId]!.push(row);
    return accumulator;
  }, {});

  return invoiceRows.map((row) => ({
    amount: row.subtotal,
    clientId: row.clientId,
    clientName: row.clientName,
    discount: row.discount,
    dueDate: toUiDate(row.dueDate),
    id: row.id,
    internalNote: undefined,
    issueDate: toUiDate(row.issueDate),
    items: (linesByInvoiceId[row.dbId] || []).map((line) => ({
      amount: line.amount,
      description: line.description,
      quantity: line.quantity,
      rate: line.rate,
    })),
    lastReminder: undefined,
    matterId: row.matterId || '',
    matterRef: row.matterRef || '',
    matterTitle: row.matterTitle || '',
    paidDate: row.paidDate ? toUiDate(row.paidDate) : undefined,
    status: row.status,
    tax: row.tax,
    totalAmount: row.totalAmount,
  }));
};

export const fetchDocuments = async (filters: { clientAccountIds?: string[]; matterIds?: string[] }) => {
  const where: string[] = ['d.archived_at IS NULL'];
  const params: unknown[] = [];

  if (filters.clientAccountIds?.length) {
    where.push(`ca.public_id IN (${buildInClause(filters.clientAccountIds)})`);
    params.push(...filters.clientAccountIds);
  }

  if (filters.matterIds?.length) {
    where.push(`m.public_id IN (${buildInClause(filters.matterIds)})`);
    params.push(...filters.matterIds);
  }

  const rows = await queryRows<DocumentRow>(
    `SELECT
       d.public_id AS id,
       COALESCE(dv.original_file_name, d.title) AS name,
       UPPER(COALESCE(dv.file_extension, 'FILE')) AS type,
       COALESCE(dv.file_size_bytes, 0) AS size,
       m.public_id AS matterId,
       m.title AS matterTitle,
       ca.public_id AS clientId,
       ca.display_name AS clientName,
       uploader.display_name AS uploadedBy,
       COALESCE(dv.uploaded_at, d.created_at) AS uploadedAt,
       d.visibility_scope_code AS visibilityScope,
       COALESCE(dv.virus_scan_status_code, 'pending') AS reviewStateSource,
       d.category_code AS docCategory,
       NULL AS note
     FROM documents d
     JOIN client_accounts ca ON ca.id = d.owner_client_account_id
     LEFT JOIN document_versions dv ON dv.document_id = d.id AND dv.is_current = 1
     LEFT JOIN matter_documents md ON md.document_id = d.id
     LEFT JOIN matters m ON m.id = md.matter_id
     JOIN users uploader ON uploader.id = d.created_by_user_id
     WHERE ${where.join(' AND ')}
     GROUP BY
       d.id, d.public_id, COALESCE(dv.original_file_name, d.title), UPPER(COALESCE(dv.file_extension, 'FILE')),
       COALESCE(dv.file_size_bytes, 0), m.public_id, m.title, ca.public_id, ca.display_name,
       uploader.display_name, COALESCE(dv.uploaded_at, d.created_at), d.visibility_scope_code,
       COALESCE(dv.virus_scan_status_code, 'pending'), d.category_code
     ORDER BY COALESCE(dv.uploaded_at, d.created_at) DESC`,
    params
  );

  return rows.map((row) => ({
    clientId: row.clientId,
    clientName: row.clientName,
    docCategory: row.docCategory,
    id: row.id,
    matterId: row.matterId || '',
    matterTitle: row.matterTitle || '',
    name: row.name,
    note: row.note || undefined,
    reviewState: mapReviewState(row.reviewStateSource),
    size: row.size,
    type: row.type,
    uploadedAt: toUiDateTime(row.uploadedAt),
    uploadedBy: row.uploadedBy,
    visibility: mapVisibility(row.visibilityScope),
  }));
};

export const fetchEvents = async (filters: { clientAccountIds?: string[]; matterIds?: string[] }) => {
  const where: string[] = ['e.cancelled_at IS NULL'];
  const params: unknown[] = [];

  if (filters.clientAccountIds?.length) {
    where.push(`ca.public_id IN (${buildInClause(filters.clientAccountIds)})`);
    params.push(...filters.clientAccountIds);
  }

  if (filters.matterIds?.length) {
    where.push(`m.public_id IN (${buildInClause(filters.matterIds)})`);
    params.push(...filters.matterIds);
  }

  const rows = await queryRows<EventRow>(
    `SELECT
       e.public_id AS id,
       e.title,
       e.event_type_code AS type,
       ca.public_id AS clientId,
       ca.display_name AS clientName,
       m.public_id AS matterId,
       m.title AS matterTitle,
       e.scheduled_start_at AS dateSource,
       TIMESTAMPDIFF(MINUTE, e.scheduled_start_at, e.scheduled_end_at) AS duration,
       e.mode_code AS mode,
       e.location_text AS location,
       e.join_url AS joinUrl,
       e.client_visible_flag AS visibleToClient,
       e.notes,
       e.status_code AS status
     FROM events e
     JOIN client_accounts ca ON ca.id = e.client_account_id
     LEFT JOIN matters m ON m.id = e.matter_id
     WHERE ${where.join(' AND ')}
     ORDER BY e.scheduled_start_at ASC`,
    params
  );

  return rows.map((row) => ({
    actionCTA: row.joinUrl ? 'Join Call' : 'View Details',
    clientId: row.clientId,
    clientName: row.clientName,
    date: toUiDate(row.dateSource),
    duration: row.duration,
    id: row.id,
    joinUrl: row.joinUrl || undefined,
    location: row.location || undefined,
    matterId: row.matterId || '',
    matterTitle: row.matterTitle || '',
    meetLink: row.joinUrl || undefined,
    mode: row.mode,
    notes: row.notes || '',
    status: row.status,
    time: toUiTime(row.dateSource),
    title: row.title,
    type: row.type,
    visibleToClient: Boolean(row.visibleToClient),
  }));
};

export const fetchThreads = async (filters: { clientAccountIds?: string[]; matterIds?: string[] }) => {
  const where: string[] = ['ct.archived_at IS NULL'];
  const params: unknown[] = [];

  if (filters.clientAccountIds?.length) {
    where.push(`ca.public_id IN (${buildInClause(filters.clientAccountIds)})`);
    params.push(...filters.clientAccountIds);
  }

  if (filters.matterIds?.length) {
    where.push(`m.public_id IN (${buildInClause(filters.matterIds)})`);
    params.push(...filters.matterIds);
  }

  const rows = await queryRows<ThreadRow>(
    `SELECT
       ct.public_id AS id,
       ca.public_id AS clientId,
       ca.display_name AS clientName,
       m.public_id AS matterId,
       m.title AS matterTitle,
       m.matter_number AS matterRef,
       m.current_stage_code AS stage,
       pur.rule_code AS urgency,
       lm.body_text AS lastMessage,
       lm.sent_at AS lastMessageAt,
       owner.display_name AS assignedTo,
       ct.status_code AS status
     FROM conversation_threads ct
     JOIN client_accounts ca ON ca.id = ct.client_account_id
     LEFT JOIN matters m ON m.id = ct.matter_id
     LEFT JOIN pricing_urgency_rules pur ON pur.id = m.urgency_rule_id
     LEFT JOIN users owner ON owner.id = ct.assigned_owner_user_id
     LEFT JOIN messages lm ON lm.id = (
       SELECT m2.id
       FROM messages m2
       WHERE m2.thread_id = ct.id AND m2.deleted_at IS NULL
       ORDER BY m2.sent_at DESC, m2.id DESC
       LIMIT 1
     )
     WHERE ${where.join(' AND ')}
     ORDER BY COALESCE(lm.sent_at, ct.updated_at) DESC`,
    params
  );

  return rows.map((row) => ({
    assignedTo: row.assignedTo || 'Unassigned',
    clientId: row.clientId,
    clientName: row.clientName,
    id: row.id,
    lastMessage: row.lastMessage || '',
    lastMessageAt: row.lastMessageAt ? toUiDateTime(row.lastMessageAt) : '',
    matterId: row.matterId || '',
    matterRef: row.matterRef || '',
    matterTitle: row.matterTitle || '',
    stage: row.stage || 'request-received',
    status: row.status,
    unreadCount: row.status === 'waiting' ? 1 : 0,
    urgency: row.urgency || 'standard',
  }));
};

export const fetchMessagesByThreadIds = async (threadIds: string[]) => {
  if (threadIds.length === 0) {
    return [];
  }

  const rows = await queryRows<MessageRow>(
    `SELECT
       msg.public_id AS id,
       ct.public_id AS threadId,
       COALESCE(u.public_id, CONCAT('system:', COALESCE(msg.sender_system_code, 'unknown'))) AS senderId,
       COALESCE(u.display_name, cp.display_name, 'System') AS senderName,
       CASE
         WHEN msg.sender_system_code IS NOT NULL THEN 'system'
         WHEN u.actor_type_code = 'client' THEN 'client'
         ELSE 'admin'
       END AS senderRole,
       msg.body_text AS content,
       msg.sent_at AS timestamp
     FROM messages msg
     JOIN conversation_threads ct ON ct.id = msg.thread_id
     LEFT JOIN users u ON u.id = msg.sender_user_id
     LEFT JOIN counsel_partners cp ON cp.id = msg.sender_counsel_partner_id
     WHERE msg.deleted_at IS NULL
       AND ct.public_id IN (${buildInClause(threadIds)})
     ORDER BY msg.sent_at ASC, msg.id ASC`,
    threadIds
  );

  return rows.map((row) => ({
    attachments: undefined,
    content: row.content,
    id: row.id,
    read: true,
    senderId: row.senderId || '',
    senderName: row.senderName || 'Unknown',
    senderRole: row.senderRole,
    threadId: row.threadId,
    timestamp: toUiDateTime(row.timestamp),
  }));
};

export const fetchPayments = async () => {
  const rows = await queryRows<PaymentRow>(
    `SELECT
       pt.public_id AS id,
       inv.public_id AS invoiceId,
       m.public_id AS matterId,
       ca.public_id AS clientId,
       ca.display_name AS clientName,
       COALESCE(pa.amount_applied, pt.gross_amount) AS amount,
       CASE
         WHEN LOWER(COALESCE(pm.method_type_code, '')) LIKE '%bank%' THEN 'bank-transfer'
         WHEN LOWER(COALESCE(pm.method_type_code, '')) LIKE '%cash%' THEN 'cash'
         WHEN LOWER(COALESCE(pm.method_type_code, '')) LIKE '%cheque%' THEN 'cheque'
         ELSE 'online'
       END AS method,
       CASE
         WHEN pt.status_code IN ('refunded', 'partially-refunded') THEN 'refunded'
         WHEN pt.status_code = 'captured' THEN 'success'
         ELSE 'failed'
       END AS status,
       COALESCE(pt.captured_at, pt.failed_at, pt.created_at) AS timestamp,
       creator.display_name AS recordedBy,
       COALESCE(pt.gateway_payment_ref, pt.gateway_order_ref, pt.public_id) AS reference
     FROM payment_transactions pt
     LEFT JOIN payment_methods pm ON pm.id = pt.payment_method_id
     LEFT JOIN payment_allocations pa ON pa.payment_transaction_id = pt.id
     LEFT JOIN invoices inv ON inv.id = pa.invoice_id
     LEFT JOIN matters m ON m.id = inv.matter_id
     JOIN client_accounts ca ON ca.id = pt.client_account_id
     LEFT JOIN users creator ON creator.id = pt.created_by_user_id
     ORDER BY COALESCE(pt.captured_at, pt.created_at) DESC`
  );

  return rows.map((row) => ({
    amount: row.amount,
    clientId: row.clientId,
    clientName: row.clientName,
    id: row.id,
    invoiceId: row.invoiceId || '',
    matterId: row.matterId || '',
    method: row.method,
    recordedBy: row.recordedBy || 'System',
    reference: row.reference || row.id,
    status: row.status,
    timestamp: toUiDateTime(row.timestamp),
  }));
};

export const fetchClientAudit = async (matterPublicIds: string[]) => {
  if (matterPublicIds.length === 0) {
    return [];
  }

  const rows = await queryRows<AuditRow>(
    `SELECT
       ae.public_id AS id,
       ae.occurred_at AS timestamp,
       actor.display_name AS actor,
       ae.actor_role_code_snapshot AS actorRole,
       ae.entity_table_name AS entityType,
       COALESCE(m.public_id, ae.public_id) AS entityId,
       ae.action_label AS action,
       ae.source_module AS sourceModule
     FROM audit_events ae
     LEFT JOIN users actor ON actor.id = ae.actor_user_id
     LEFT JOIN matters m ON ae.entity_table_name = 'matters' AND m.id = ae.entity_pk
     WHERE ae.entity_table_name = 'matters'
       AND m.public_id IN (${buildInClause(matterPublicIds)})
     ORDER BY ae.occurred_at DESC
     LIMIT 20`,
    matterPublicIds
  );

  return rows.map((row) => ({
    action: row.action,
    actor: row.actor || 'System',
    actorRole: row.actorRole,
    details: `${row.sourceModule} update`,
    entityId: row.entityId,
    entityType: row.entityType.replace(/s$/, ''),
    id: row.id,
    sourceModule: row.sourceModule,
    timestamp: toUiDateTime(row.timestamp),
  }));
};

export const fetchClientsForList = async (options: { limit: number; offset: number; search?: string }) => {
  const params: unknown[] = [];
  const searchClause = options.search
    ? `AND (ca.display_name LIKE ? OR ca.primary_email LIKE ? OR ca.primary_phone LIKE ?)`
    : '';

  if (options.search) {
    const searchValue = `%${options.search}%`;
    params.push(searchValue, searchValue, searchValue);
  }

  const rows = await queryRows<
    RowDataPacket & {
      accountStatusCode: string;
      activeMatters: number;
      email: string;
      hasUnread: number;
      id: string;
      joinedAt: string;
      lastActiveAt: string | null;
      lifecycleSource: string;
      mattersCount: number;
      name: string;
      owner: string | null;
      phone: string;
      region: string | null;
      totalDue: number;
    }
  >(
    `SELECT
       ca.public_id AS id,
       ca.display_name AS name,
       ca.primary_email AS email,
       ca.primary_phone AS phone,
       ca.onboarding_status_code AS lifecycleSource,
       ca.account_status_code AS accountStatusCode,
       ca.created_at AS joinedAt,
       COALESCE(contact.last_login_at, ca.updated_at) AS lastActiveAt,
       owner.display_name AS owner,
       addr.city AS region,
       COALESCE(mstats.activeMatters, 0) AS activeMatters,
       COALESCE(mstats.mattersCount, 0) AS mattersCount,
       COALESCE(istats.totalDue, 0) AS totalDue,
       CASE WHEN COALESCE(tstats.waitingThreads, 0) > 0 THEN 1 ELSE 0 END AS hasUnread
     FROM client_accounts ca
     LEFT JOIN users owner ON owner.id = ca.owner_user_id
     LEFT JOIN client_account_contacts cac
       ON cac.client_account_id = ca.id
      AND cac.is_primary = 1
      AND cac.archived_at IS NULL
     LEFT JOIN users contact ON contact.id = cac.user_id
     LEFT JOIN client_addresses addr
       ON addr.client_account_id = ca.id
      AND addr.is_primary = 1
      AND addr.archived_at IS NULL
     LEFT JOIN (
       SELECT
         client_account_id,
         COUNT(*) AS mattersCount,
         SUM(CASE WHEN operational_status_code NOT IN ('completed', 'archived') THEN 1 ELSE 0 END) AS activeMatters
       FROM matters
       WHERE archived_at IS NULL
       GROUP BY client_account_id
     ) AS mstats ON mstats.client_account_id = ca.id
     LEFT JOIN (
       SELECT client_account_id, SUM(amount_due) AS totalDue
       FROM invoices
       WHERE archived_at IS NULL
       GROUP BY client_account_id
     ) AS istats ON istats.client_account_id = ca.id
     LEFT JOIN (
       SELECT client_account_id, COUNT(*) AS waitingThreads
       FROM conversation_threads
       WHERE archived_at IS NULL AND status_code = 'waiting'
       GROUP BY client_account_id
     ) AS tstats ON tstats.client_account_id = ca.id
     WHERE ca.archived_at IS NULL
       ${searchClause}
     ORDER BY ca.updated_at DESC
     LIMIT ? OFFSET ?`,
    [...params, options.limit, options.offset]
  );

  return rows.map((row) => ({
    activeMatters: row.activeMatters,
    email: row.email,
    hasUnread: Boolean(row.hasUnread),
    id: row.id,
    joinedAt: toUiDate(row.joinedAt),
    lastActiveAt: row.lastActiveAt ? toUiDate(row.lastActiveAt) : toUiDate(row.joinedAt),
    lifecycle: mapLifecycle(row.accountStatusCode, row.lifecycleSource),
    mattersCount: row.mattersCount,
    name: row.name,
    owner: row.owner || 'Unassigned',
    phone: row.phone,
    region: row.region || '',
    totalDue: row.totalDue,
  }));
};

export const fetchClientsByIds = async (clientPublicIds: string[]) => {
  if (clientPublicIds.length === 0) {
    return [];
  }

  const rows = await queryRows<
    RowDataPacket & {
      accountStatusCode: string;
      email: string;
      id: string;
      joinedAt: string;
      lastActiveAt: string | null;
      lifecycleSource: string;
      name: string;
      owner: string | null;
      phone: string;
      region: string | null;
    }
  >(
    `SELECT
       ca.public_id AS id,
       ca.display_name AS name,
       ca.primary_email AS email,
       ca.primary_phone AS phone,
       ca.onboarding_status_code AS lifecycleSource,
       ca.account_status_code AS accountStatusCode,
       ca.created_at AS joinedAt,
       COALESCE(contact.last_login_at, ca.updated_at) AS lastActiveAt,
       owner.display_name AS owner,
       addr.city AS region
     FROM client_accounts ca
     LEFT JOIN users owner ON owner.id = ca.owner_user_id
     LEFT JOIN client_account_contacts cac
       ON cac.client_account_id = ca.id
      AND cac.is_primary = 1
      AND cac.archived_at IS NULL
     LEFT JOIN users contact ON contact.id = cac.user_id
     LEFT JOIN client_addresses addr
       ON addr.client_account_id = ca.id
      AND addr.is_primary = 1
      AND addr.archived_at IS NULL
     WHERE ca.archived_at IS NULL
       AND ca.public_id IN (${buildInClause(clientPublicIds)})
     ORDER BY ca.updated_at DESC`,
    clientPublicIds
  );

  const clientsById = new Map(
    rows.map((row) => [
      row.id,
      {
        avatar: '',
        email: row.email,
        id: row.id,
        joinedAt: toUiDate(row.joinedAt),
        lastActiveAt: row.lastActiveAt ? toUiDate(row.lastActiveAt) : toUiDate(row.joinedAt),
        lifecycle: mapLifecycle(row.accountStatusCode, row.lifecycleSource),
        name: row.name,
        owner: row.owner || 'Unassigned',
        phone: row.phone,
        region: row.region || '',
      },
    ])
  );

  return clientPublicIds
    .map((clientId) => clientsById.get(clientId))
    .filter((client): client is NonNullable<typeof client> => Boolean(client));
};
