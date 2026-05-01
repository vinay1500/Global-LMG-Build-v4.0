import { createHash } from 'node:crypto';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { addDaysUtc, fromMysqlDateTime, nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { createPublicId } from '../../lib/ids.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/httpErrors.js';
import { selectAll, selectOne, withConnection, withTransaction } from '../../lib/mysqlUtils.js';
import { ensurePlatformReady } from '../platform/bootstrap.js';
import { domainEventService } from '../domainEvents/service.js';
import { allocateBusinessNumber } from '../platform/sequences.js';
import { buildStages, createEmptyDashboardSnapshot } from './helpers.js';
import type {
  ChatMessage,
  DashboardRequestInput,
  DashboardSnapshot,
  Invoice,
  InvoiceItem,
  Lead,
  Matter,
  MatterPackage,
  MessageThread,
  Payment,
  PlatformDocument,
  PlatformEvent,
  PlatformUser,
} from './types.js';

const AUTOMATIC_REQUEST_ACKNOWLEDGEMENT =
  'We have received your request. A case manager will confirm the next step shortly.';

interface ClientContextRow extends RowDataPacket {
  account_public_id: string;
  client_account_id: number;
  country_code: string | null;
  email: string;
  last_login_at: string | Date | null;
  owner_name: string | null;
  phone: string | null;
  region: string | null;
  user_public_id: string;
}

interface MatterRow extends RowDataPacket {
  consultation_mode_code: string;
  created_at: string | Date;
  current_stage_code: string;
  current_stage_label: string;
  due_total_amount: string | number;
  issue_summary: string;
  last_activity_at: string | Date;
  legal_domain_name: string;
  matter_number: string;
  operational_status_code: string;
  paid_total_amount: string | number;
  priority_code: string;
  public_id: string;
  quoted_total_amount: string | number;
  title: string;
  urgency_code: string;
}

interface MatterAssignmentRow extends RowDataPacket {
  assigned_name: string;
  assignment_role_code: string;
  fee_agreed_amount: string | number | null;
  fee_due_amount: string | number | null;
  fee_paid_amount: string | number | null;
  matter_id: number;
}

interface MatterServiceRow extends RowDataPacket {
  matter_id: number;
  service_code: string;
}

interface MatterUpdateRow extends RowDataPacket {
  body_text: string;
  matter_id: number;
  visible_to_client: number;
}

interface PackageRow extends RowDataPacket {
  created_at: string | Date;
  created_by: string;
  display_order: number;
  description: string | null;
  is_recommended: number;
  matter_public_id: string;
  matter_selected_package_id: number | null;
  package_name: string;
  proposal_version_no: number;
  public_id: string;
  published_at: string | Date | null;
  selected_at: string | Date | null;
  superseded_at: string | Date | null;
  total_price: string | number;
}

interface PackageServiceRow extends RowDataPacket {
  matter_package_id: number;
  public_id: string;
  service_code: string;
}

interface PackageFeatureRow extends RowDataPacket {
  feature_text: string;
  matter_package_id: number;
  public_id: string;
}

interface PackageSelectionCandidateRow extends RowDataPacket {
  description: string | null;
  id: number;
  matter_id: number;
  package_name: string;
  proposal_version_no: number;
  public_id: string;
  published_at: string | Date | null;
  selected_at: string | Date | null;
  superseded_at: string | Date | null;
  total_price: string | number;
}

interface InvoiceRow extends RowDataPacket {
  amount_due: string | number;
  amount_paid: string | number;
  amount_refunded: string | number;
  client_name: string;
  due_date: string;
  discount_amount: string | number;
  id: number;
  issue_date: string;
  matter_number: string | null;
  matter_public_id: string | null;
  matter_title: string | null;
  public_id: string;
  status_code: string;
  subtotal_amount: string | number;
  tax_amount: string | number;
  total_amount: string | number;
}

interface MatterSelectionRow extends RowDataPacket {
  client_account_id: number;
  due_total_amount: string | number;
  matter_number: string;
  opened_by_user_id: number;
  owner_user_id: number | null;
  paid_total_amount: string | number;
  public_id: string;
  quoted_total_amount: string | number;
  selected_matter_package_id: number | null;
  title: string;
}

interface ExistingPackageInvoiceRow extends RowDataPacket {
  amount_paid: string | number;
  archived_at: string | Date | null;
  id: number;
  public_id: string;
  status_code: string;
}

interface BillingSnapshotSeedRow extends RowDataPacket {
  address_line1: string | null;
  address_line2: string | null;
  billing_email: string;
  billing_name: string;
  billing_phone: string;
  city: string | null;
  country_code: string | null;
  gstin: string | null;
  postal_code: string | null;
  state: string | null;
}

interface InvoiceSettingsRow extends RowDataPacket {
  business_state: string;
  default_gst_rate_bps: number;
  fallback_tax_type_code: 'cgst_sgst' | 'igst' | 'none';
  gst_enabled: number;
  payment_terms_days: number;
  prices_include_tax: number;
  reverse_charge_note: string | null;
  tax_mode_code: 'exempt' | 'forward_charge' | 'reverse_charge';
}

interface TaxRateIdRow extends RowDataPacket {
  id: number;
}

interface InvoiceLineRow extends RowDataPacket {
  description: string;
  invoice_id: number;
  quantity: string | number;
  rate: string | number;
  line_subtotal: string | number;
}

interface PaymentRow extends RowDataPacket {
  amount_applied: string | number;
  client_name: string;
  created_by_name: string | null;
  gateway_payment_ref: string | null;
  gateway_provider_code: string;
  initiated_at: string | Date;
  invoice_public_id: string;
  matter_public_id: string | null;
  payment_public_id: string;
  status_code: string;
}

interface EventRow extends RowDataPacket {
  action_cta: string;
  client_name: string;
  client_visible_flag: number;
  duration_minutes: number;
  event_type_code: string;
  join_url: string | null;
  location_text: string | null;
  matter_public_id: string | null;
  matter_title: string | null;
  mode_code: string;
  notes: string | null;
  public_id: string;
  scheduled_end_at: string | Date;
  scheduled_start_at: string | Date;
  status_code: string;
  title: string;
}

interface DocumentRow extends RowDataPacket {
  category_code: string;
  checksum_sha256: string;
  current_version_no: number;
  document_public_id: string;
  file_size_bytes: string | number;
  matter_public_id: string | null;
  matter_title: string | null;
  original_file_name: string;
  review_state: string;
  uploaded_at: string | Date;
  uploader_name: string | null;
  version_id: number;
  visibility_scope_code: string;
}

interface ThreadRow extends RowDataPacket {
  assigned_name: string | null;
  current_stage_code: string | null;
  client_name: string;
  last_message_text: string | null;
  last_message_at: string | Date | null;
  matter_number: string | null;
  matter_public_id: string | null;
  matter_title: string | null;
  public_id: string;
  status_code: string;
  subject: string | null;
  thread_type_code: string;
  unread_count: number;
  urgency_code: string | null;
}

interface MessageRow extends RowDataPacket {
  attachment_refs: string | null;
  body_text: string;
  is_read: number;
  message_public_id: string;
  sender_name: string | null;
  sender_role: string;
  sender_user_public_id: string | null;
  sent_at: string | Date;
  thread_public_id: string;
}

interface AttachmentUploadRow extends RowDataPacket {
  document_id: number | null;
  document_version_id: number | null;
  invoice_public_id: string | null;
  matter_public_id: string | null;
  public_id: string;
  request_public_id: string | null;
  status_code: string;
  thread_public_id: string | null;
}

interface LeadRow extends RowDataPacket {
  contact_name_snapshot: string;
  consultation_mode_code: string;
  issue_summary: string;
  owner_name: string | null;
  preferred_end_at: string | Date | null;
  preferred_start_at: string | Date | null;
  public_id: string;
  request_created_at: string | Date;
  selected_services: string | null;
  status_code: string;
  title: string;
  urgency_code: string;
}

interface StaffRow extends RowDataPacket {
  active_assignments: number;
  avatar_url: string | null;
  display_name: string;
  employment_status_code: string;
  job_title: string;
  manager_name: string | null;
  public_id: string;
}

interface AdvocateRow extends RowDataPacket {
  active_assignments: number;
  availability_status_code: string;
  city: string;
  counsel_public_id: string;
  fee_agreed_amount: string | number | null;
  fee_due_amount: string | number | null;
  fee_paid_amount: string | number | null;
  full_name: string;
  years_experience: number;
}

interface AdvocateExpertiseRow extends RowDataPacket {
  counsel_public_id: string;
  expertise_label: string;
}

interface AuditRow extends RowDataPacket {
  action_label: string;
  actor_name: string | null;
  actor_role_code_snapshot: string;
  entity_public_id: string | null;
  entity_table_name: string;
  occurred_at: string | Date;
  public_id: string;
  source_module: string;
  summary_new_value: string | null;
  summary_old_value: string | null;
}

const toAmount = (value: string | number | null | undefined) => Number(value || 0);

const toDateOnly = (value: string | Date | null | undefined) => {
  const iso = fromMysqlDateTime(value);
  return iso ? iso.slice(0, 10) : '';
};

const toTimeLabel = (value: string | Date | null | undefined) => {
  const iso = fromMysqlDateTime(value);

  if (!iso) {
    return '';
  }

  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
};

const toIso = (value: string | Date | null | undefined) => fromMysqlDateTime(value) || nowUtc();

const workloadFromCount = (count: number) => {
  if (count >= 4) {
    return 'heavy' as const;
  }

  if (count >= 2) {
    return 'moderate' as const;
  }

  return 'light' as const;
};

const paymentMethodFromProvider = (value: string): Payment['method'] => {
  switch (value) {
    case 'bank-transfer':
    case 'cash':
    case 'cheque':
      return value;
    default:
      return 'online';
  }
};

const paymentStatusToUi = (value: string): Payment['status'] => {
  if (value === 'failed') {
    return 'failed';
  }

  if (value === 'refunded' || value === 'partially-refunded') {
    return 'refunded';
  }

  return 'success';
};

const documentReviewState = (value: string): PlatformDocument['reviewState'] => {
  if (value === 'reviewed' || value === 'needs-client-action') {
    return value;
  }

  return 'unreviewed';
};

const hashDocumentChecksum = (name: string, size: number) =>
  createHash('sha256').update(`${name}:${size}`).digest('hex');

const parseAttachmentRefs = (value: string | null | undefined) =>
  value
    ? value
        .split('\u001E')
        .map((entry) => {
          const [documentId, name] = entry.split('\u001F');
          return documentId && name ? { documentId, name } : null;
        })
        .filter((entry): entry is { documentId: string; name: string } => Boolean(entry))
    : undefined;

export class NormalizedDashboardRepository {
  public constructor(private readonly pool: Pool) {}

  public async initialize() {
    await ensurePlatformReady();
  }

  private async resolveClientContext(connection: PoolConnection, userPublicId: string) {
    const row = await selectOne<ClientContextRow>(
      connection,
      `SELECT
         u.public_id AS user_public_id,
         ca.id AS client_account_id,
         ca.public_id AS account_public_id,
         u.email,
         u.phone,
         u.last_login_at,
         COALESCE(owner.display_name, 'Client Intake Desk') AS owner_name,
         COALESCE(addr.city, addr.country_code, 'India') AS region,
         COALESCE(addr.country_code, 'India') AS country_code
       FROM users u
       INNER JOIN client_account_contacts cac
         ON cac.user_id = u.id
         AND cac.portal_access_enabled = 1
         AND cac.archived_at IS NULL
       INNER JOIN client_accounts ca
         ON ca.id = cac.client_account_id
         AND ca.archived_at IS NULL
       LEFT JOIN users owner ON owner.id = ca.owner_user_id
       LEFT JOIN client_addresses addr
         ON addr.client_account_id = ca.id
         AND addr.is_primary = 1
         AND addr.archived_at IS NULL
       WHERE u.public_id = ?
       LIMIT 1`,
      [userPublicId]
    );

    if (!row) {
      throw notFound('client_context_not_found', 'Client context was not found for the current user.');
    }

    return {
      clientAccountId: row.client_account_id,
      currentClient: {
        avatar: '',
        email: row.email,
        id: row.user_public_id,
        joinedAt: nowUtc(),
        lastActiveAt: toIso(row.last_login_at),
        lifecycle: 'client',
        name: '',
        owner: row.owner_name || 'Client Intake Desk',
        phone: row.phone || '',
        region: row.region || row.country_code || 'India',
      } satisfies PlatformUser,
    };
  }

  private async hydrateCurrentClient(connection: PoolConnection, userPublicId: string) {
    const row = await selectOne<RowDataPacket>(
      connection,
      `SELECT
         u.public_id,
         u.display_name,
         u.email,
         u.phone,
         u.created_at,
         u.last_login_at,
         COALESCE(owner.display_name, 'Client Intake Desk') AS owner_name,
         COALESCE(addr.city, addr.country_code, 'India') AS region
       FROM users u
       INNER JOIN client_account_contacts cac
         ON cac.user_id = u.id
         AND cac.portal_access_enabled = 1
         AND cac.archived_at IS NULL
       INNER JOIN client_accounts ca
         ON ca.id = cac.client_account_id
         AND ca.archived_at IS NULL
       LEFT JOIN users owner ON owner.id = ca.owner_user_id
       LEFT JOIN client_addresses addr
         ON addr.client_account_id = ca.id
         AND addr.is_primary = 1
         AND addr.archived_at IS NULL
       WHERE u.public_id = ?
       LIMIT 1`,
      [userPublicId]
    );

    if (!row) {
      throw notFound('client_not_found', 'Current client was not found.');
    }

    return {
      avatar: '',
      email: String(row.email),
      id: String(row.public_id),
      joinedAt: toIso(row.created_at),
      lastActiveAt: toIso(row.last_login_at),
      lifecycle: 'client',
      name: String(row.display_name),
      owner: String(row.owner_name || 'Client Intake Desk'),
      phone: String(row.phone || ''),
      region: String(row.region || 'India'),
    } satisfies PlatformUser;
  }

  private async buildSnapshot(connection: PoolConnection, currentClient: PlatformUser) {
    const context = await this.resolveClientContext(connection, currentClient.id);
    const resolvedCurrentClient = await this.hydrateCurrentClient(connection, currentClient.id);

    const matters = await this.fetchMatters(connection, context.clientAccountId, resolvedCurrentClient);
    const packages = await this.fetchPackages(connection, context.clientAccountId);
    const invoices = await this.fetchInvoices(
      connection,
      context.clientAccountId,
      resolvedCurrentClient.id,
      resolvedCurrentClient.name
    );
    const payments = await this.fetchPayments(
      connection,
      context.clientAccountId,
      resolvedCurrentClient.id,
      resolvedCurrentClient.name
    );
    const events = await this.fetchEvents(
      connection,
      context.clientAccountId,
      resolvedCurrentClient.id,
      resolvedCurrentClient.name
    );
    const documents = await this.fetchDocuments(
      connection,
      context.clientAccountId,
      resolvedCurrentClient.id,
      resolvedCurrentClient.name
    );
    const threads = await this.fetchThreads(
      connection,
      context.clientAccountId,
      resolvedCurrentClient.id,
      resolvedCurrentClient.name
    );
    const messages = await this.fetchMessages(connection, context.clientAccountId, resolvedCurrentClient.id);
    const leads = await this.fetchLeads(connection, context.clientAccountId, resolvedCurrentClient.id);
    const advocates = await this.fetchAdvocates(connection);
    const staff = await this.fetchStaff(connection);
    const auditEntries = await this.fetchAuditEntries(connection);

    return {
      ...createEmptyDashboardSnapshot(resolvedCurrentClient),
      advocates,
      auditEntries,
      currentClient: resolvedCurrentClient,
      documents,
      events,
      invoices,
      leads,
      matters,
      messages,
      packages,
      payments,
      staff,
      threads,
      users: [resolvedCurrentClient],
    } satisfies DashboardSnapshot;
  }

  public async getSnapshot(currentClient: PlatformUser) {
    await this.initialize();
    return withConnection(this.pool, (connection) => this.buildSnapshot(connection, currentClient));
  }

  public async submitRequest(currentClient: PlatformUser, request: DashboardRequestInput) {
    await this.initialize();

    await withTransaction(this.pool, async (connection) => {
      const context = await this.resolveClientContext(connection, currentClient.id);
      const currentUserRow = await selectOne<RowDataPacket>(
        connection,
        'SELECT id FROM users WHERE public_id = ? LIMIT 1',
        [currentClient.id]
      );

      if (!currentUserRow?.id) {
        throw notFound('current_user_not_found', 'Current user could not be resolved.');
      }

      const legalDomainRow = await selectOne<RowDataPacket>(
        connection,
        'SELECT id, domain_name FROM legal_domains WHERE domain_code = ? AND is_active = 1 LIMIT 1',
        [request.legalDomain]
      );
      const urgencyRuleRow = await selectOne<RowDataPacket>(
        connection,
        'SELECT id, urgency_code, surcharge_value FROM pricing_urgency_rules WHERE urgency_code = ? AND is_active = 1 LIMIT 1',
        [request.urgency]
      );
      const consultationRuleRow = await selectOne<RowDataPacket>(
        connection,
        'SELECT surcharge_value FROM pricing_consultation_mode_rules WHERE consultation_mode_code = ? LIMIT 1',
        [request.consultationMode]
      );
      const pricingSlabRow = await selectOne<RowDataPacket>(
        connection,
        `SELECT min_service_count, max_service_count, base_amount, per_extra_service_amount
         FROM pricing_service_slabs
         WHERE is_active = 1
           AND effective_from <= CURDATE()
           AND (effective_to IS NULL OR effective_to >= CURDATE())
           AND min_service_count <= ?
           AND (max_service_count IS NULL OR max_service_count >= ?)
         ORDER BY effective_from DESC, min_service_count DESC
         LIMIT 1`,
        [request.services.length, request.services.length]
      );

      if (!legalDomainRow || !urgencyRuleRow || !pricingSlabRow) {
        throw conflict('pricing_reference_missing', 'Pricing or legal domain configuration is incomplete.');
      }

      const requestNumber = await allocateBusinessNumber(connection, 'service_request', 'REQ');
      const matterNumber = await allocateBusinessNumber(connection, 'matter', 'GLMG');
      const threadNumber = await allocateBusinessNumber(connection, 'thread', 'THR');
      const serviceRequestPublicId = createPublicId();
      const matterPublicId = createPublicId();
      const threadPublicId = createPublicId();
      const documentTimestamp = toMysqlDateTime(nowUtc());
      const baseAmount = toAmount(pricingSlabRow.base_amount);
      const perExtra = toAmount(pricingSlabRow.per_extra_service_amount);
      const consultationSurcharge = toAmount(consultationRuleRow?.surcharge_value);
      const urgencySurcharge = toAmount(urgencyRuleRow.surcharge_value);
      const scaledAmount =
        request.services.length <= 2
          ? baseAmount
          : baseAmount + Math.max(request.services.length - 2, 0) * perExtra;
      const quotedAmount = scaledAmount + consultationSurcharge + urgencySurcharge;
      const title = `${String(legalDomainRow.domain_name)} Request`;
      const summary = request.caseDetails.trim().slice(0, 500);
      const preferredWindow = this.parsePreferredWindow(request.preferredDate, request.preferredTime);
      const currentUserId = Number(currentUserRow.id);
      const ownerUserIdRow = await selectOne<RowDataPacket>(
        connection,
        `SELECT
           owner.id AS owner_user_id,
           owner.actor_type_code AS owner_actor_type_code
         FROM client_accounts ca
         LEFT JOIN users owner ON owner.id = ca.owner_user_id
         WHERE ca.id = ?
         LIMIT 1`,
        [context.clientAccountId]
      );
      const rawOwnerUserId = ownerUserIdRow?.owner_user_id
        ? Number(ownerUserIdRow.owner_user_id)
        : null;
      const internalOwnerUserId =
        rawOwnerUserId && ownerUserIdRow?.owner_actor_type_code !== 'client'
          ? rawOwnerUserId
          : null;
      const ownerUserId = internalOwnerUserId || currentUserId;
      const createdAt = toMysqlDateTime(nowUtc());
      const uniqueDocumentUploadIds = [...new Set(request.documentUploadIds.map((value) => value.trim()).filter(Boolean))];
      let requestUploadRows: AttachmentUploadRow[] = [];

      if (uniqueDocumentUploadIds.length > 0) {
        const placeholders = uniqueDocumentUploadIds.map(() => '?').join(', ');
        requestUploadRows = await selectAll<AttachmentUploadRow>(
          connection,
          `SELECT
             dui.public_id,
             dui.request_public_id,
             dui.matter_public_id,
             dui.invoice_public_id,
             dui.thread_public_id,
             dui.document_id,
             dui.document_version_id,
             dui.status_code
           FROM document_upload_intents dui
           WHERE dui.public_id IN (${placeholders})
             AND dui.owner_user_id = ?
             AND dui.owner_client_account_id = ?`,
          [...uniqueDocumentUploadIds, currentUserId, context.clientAccountId]
        );

        if (requestUploadRows.length !== uniqueDocumentUploadIds.length) {
          throw forbidden(
            'request_document_forbidden',
            'One or more uploaded documents are not available for this request.'
          );
        }

        for (const upload of requestUploadRows) {
          if (
            !upload.document_id ||
            !upload.document_version_id ||
            !['stored', 'attached'].includes(upload.status_code)
          ) {
            throw conflict(
              'request_document_not_ready',
              'One or more uploaded documents are not ready to be attached yet.'
            );
          }

          if (
            upload.request_public_id ||
            upload.matter_public_id ||
            upload.invoice_public_id ||
            upload.thread_public_id
          ) {
            throw conflict(
              'request_document_already_linked',
              'One or more uploaded documents are already linked to another record.'
            );
          }
        }
      }

      const [requestInsert] = await connection.execute(
        `INSERT INTO service_requests (
          public_id, request_number, client_account_id, requested_by_user_id, status_code, title,
          issue_summary, detailed_description, legal_domain_id, consultation_mode_code, urgency_rule_id,
          preferred_start_at, preferred_end_at, contact_name_snapshot, contact_email_snapshot,
          contact_mobile_snapshot, whatsapp_same_as_mobile, past_legal_action_flag, quote_total_amount,
          submitted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          serviceRequestPublicId,
          requestNumber,
          context.clientAccountId,
          currentUserId,
          'new-lead',
          title,
          summary,
          request.caseDetails.trim(),
          Number(legalDomainRow.id),
          request.consultationMode,
          Number(urgencyRuleRow.id),
          preferredWindow.start ? toMysqlDateTime(preferredWindow.start) : null,
          preferredWindow.end ? toMysqlDateTime(preferredWindow.end) : null,
          request.fullName.trim(),
          request.email.trim().toLowerCase(),
          request.mobile.trim(),
          request.whatsappSame ? 1 : 0,
          request.pastLegalAction ? 1 : 0,
          quotedAmount,
          createdAt,
          createdAt,
          createdAt,
        ]
      );
      const serviceRequestId = Number((requestInsert as { insertId: number }).insertId);

      for (const [index, serviceCode] of request.services.entries()) {
        const serviceRow = await selectOne<RowDataPacket>(
          connection,
          'SELECT id FROM services WHERE service_code = ? AND is_active = 1 LIMIT 1',
          [serviceCode]
        );

        if (!serviceRow?.id) {
          continue;
        }

        await connection.execute(
          `INSERT INTO request_services (
            service_request_id, service_id, sort_order, quoted_base_fee, created_at
          ) VALUES (?, ?, ?, ?, ?)`,
          [serviceRequestId, Number(serviceRow.id), index + 1, 0, createdAt]
        );
      }

      const [quoteInsert] = await connection.execute(
        `INSERT INTO pricing_quotes (
          public_id, service_request_id, version_no, service_count, base_amount, urgency_surcharge_amount,
          consultation_mode_surcharge_amount, discount_amount, tax_amount, total_amount, currency_code,
          is_final, accepted_at, created_by_user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createPublicId(),
          serviceRequestId,
          1,
          request.services.length,
          scaledAmount,
          urgencySurcharge,
          consultationSurcharge,
          0,
          0,
          quotedAmount,
          'INR',
          1,
          createdAt,
          ownerUserId,
          createdAt,
        ]
      );
      const quoteId = Number((quoteInsert as { insertId: number }).insertId);

      const quoteLines: Array<[string, number | null, string, number, number, number]> = [
        ['service-bundle', null, `${request.services.length} services selected`, 1, scaledAmount, scaledAmount],
        ['urgency', null, `Urgency: ${request.urgency}`, 1, urgencySurcharge, urgencySurcharge],
        ['consultation', null, `Consultation: ${request.consultationMode}`, 1, consultationSurcharge, consultationSurcharge],
      ];

      for (const [index, [lineTypeCode, serviceId, description, quantity, unitAmount, lineAmount]] of quoteLines.entries()) {
        await connection.execute(
          `INSERT INTO pricing_quote_lines (
            pricing_quote_id, line_type_code, service_id, pricing_rule_source_code, description, quantity,
            unit_amount, line_amount, sort_order, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [quoteId, lineTypeCode, serviceId, 'rule-engine', description, quantity, unitAmount, lineAmount, index + 1, createdAt]
        );
      }

      await connection.execute(
        `INSERT INTO request_status_history (
          service_request_id, from_status_code, to_status_code, changed_by_user_id, change_note, changed_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [serviceRequestId, null, 'new-lead', currentUserId, 'Client request submitted from dashboard.', createdAt]
      );

      const [matterInsert] = await connection.execute(
        `INSERT INTO matters (
          public_id, matter_number, service_request_id, client_account_id, opened_by_user_id, legal_domain_id,
          title, issue_summary, detailed_description, current_stage_code, operational_status_code,
          consultation_mode_code, urgency_rule_id, priority_code, quoted_total_amount, paid_total_amount,
          refunded_total_amount, due_total_amount, opened_at, last_activity_at, closed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          matterPublicId,
          matterNumber,
          serviceRequestId,
          context.clientAccountId,
          currentUserId,
          Number(legalDomainRow.id),
          title,
          summary,
          request.caseDetails.trim(),
          'request-received',
          'new-lead',
          request.consultationMode,
          Number(urgencyRuleRow.id),
          request.urgency === 'standard' ? 'in-progress' : 'immediate-6h',
          quotedAmount,
          0,
          0,
          quotedAmount,
          createdAt,
          createdAt,
          null,
          createdAt,
          createdAt,
        ]
      );
      const matterId = Number((matterInsert as { insertId: number }).insertId);

      for (const serviceCode of request.services) {
        const serviceRow = await selectOne<RowDataPacket>(
          connection,
          'SELECT id FROM services WHERE service_code = ? AND is_active = 1 LIMIT 1',
          [serviceCode]
        );

        if (!serviceRow?.id) {
          continue;
        }

        await connection.execute(
          `INSERT INTO matter_services (
            matter_id, service_id, final_fee, service_status_code, completed_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [matterId, Number(serviceRow.id), 0, 'selected', null, createdAt]
        );
      }

      await connection.execute(
        `INSERT INTO matter_stage_history (
          matter_id, stage_code, entered_at, exited_at, changed_by_user_id, visible_to_client, change_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [matterId, 'request-received', createdAt, null, currentUserId, 1, 'Matter created from client request.']
      );

      await connection.execute(
        `INSERT INTO matter_updates (
          matter_id, update_type_code, title, body_text, visible_to_client, created_by_user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          matterId,
          'note',
          'Request Submitted',
          'Request submitted from the client dashboard. Our intake team is reviewing the details.',
          1,
          ownerUserId,
          createdAt,
        ]
      );

      await connection.execute(
        `INSERT INTO matter_updates (
          matter_id, update_type_code, title, body_text, visible_to_client, created_by_user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          matterId,
          'note',
          'Internal Intake Note',
          request.pastLegalAction
            ? 'Client reported prior legal action in the intake flow.'
            : 'Client reported no prior legal action.',
          0,
          ownerUserId,
          createdAt,
        ]
      );

      await connection.execute(
        `INSERT INTO matter_assignments (
          matter_id, assignment_role_code, internal_user_id, counsel_partner_id, is_primary,
          fee_agreed_amount, fee_paid_amount, fee_due_amount, assigned_by_user_id, assigned_at,
          removed_at, assignment_status_code, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [matterId, 'case_manager', ownerUserId, null, 1, null, null, null, ownerUserId, createdAt, null, 'active', 'Auto-assigned account owner for intake.']
      );

      const [threadInsert] = await connection.execute(
        `INSERT INTO conversation_threads (
          public_id, thread_number, thread_type_code, client_account_id, matter_id, subject, status_code,
          created_by_user_id, assigned_owner_user_id, last_message_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          threadPublicId,
          threadNumber,
          'matter',
          context.clientAccountId,
          matterId,
          title,
          'active',
          currentUserId,
          internalOwnerUserId,
          createdAt,
          createdAt,
          createdAt,
        ]
      );
      const threadId = Number((threadInsert as { insertId: number }).insertId);

      await connection.execute(
        `INSERT INTO thread_participants (
          thread_id, participant_role_code, internal_user_id, client_contact_user_id, counsel_partner_id,
          is_active, joined_at, left_at, last_read_message_id, last_read_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [threadId, 'client', null, currentUserId, null, 1, createdAt, null, null, null]
      );
      if (internalOwnerUserId) {
        await connection.execute(
          `INSERT INTO thread_participants (
            thread_id, participant_role_code, internal_user_id, client_contact_user_id, counsel_partner_id,
            is_active, joined_at, left_at, last_read_message_id, last_read_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [threadId, 'staff', internalOwnerUserId, null, null, 1, createdAt, null, null, null]
        );
      }

      const systemMessage = await connection.execute(
        `INSERT INTO messages (
          public_id, thread_id, sender_user_id, sender_counsel_partner_id, sender_system_code,
          message_type_code, body_text, visible_to_client, reply_to_message_id, sent_at, edited_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createPublicId(),
          threadId,
          null,
          null,
          'system',
          'system',
          `New request created: ${title}`,
          1,
          null,
          createdAt,
          null,
          null,
        ]
      );

      const systemMessageId = Number((systemMessage[0] as { insertId: number }).insertId);
      await connection.execute(
        `INSERT INTO message_reads (
          message_id, user_id, read_at
        ) VALUES (?, ?, ?)`,
        [systemMessageId, currentUserId, createdAt]
      );

      await connection.execute(
        `INSERT INTO messages (
          public_id, thread_id, sender_user_id, sender_counsel_partner_id, sender_system_code,
          message_type_code, body_text, visible_to_client, reply_to_message_id, sent_at, edited_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createPublicId(),
          threadId,
          internalOwnerUserId,
          null,
          internalOwnerUserId ? null : 'global_lmg',
          'text',
          AUTOMATIC_REQUEST_ACKNOWLEDGEMENT,
          1,
          null,
          createdAt,
          null,
          null,
        ]
      );

      if (preferredWindow.start && preferredWindow.end) {
        await connection.execute(
          `INSERT INTO events (
            public_id, client_account_id, matter_id, title, event_type_code, status_code,
            scheduled_start_at, scheduled_end_at, timezone_name, mode_code, location_text,
            meeting_provider_code, external_meeting_id, join_url, host_url, client_visible_flag,
            notes, created_by_user_id, cancelled_by_user_id, created_at, updated_at, cancelled_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            createPublicId(),
            context.clientAccountId,
            matterId,
            `${String(legalDomainRow.domain_name)} Intake Consultation`,
            'consultation',
            'upcoming',
            toMysqlDateTime(preferredWindow.start),
            toMysqlDateTime(preferredWindow.end),
            'Asia/Kolkata',
            request.consultationMode,
            request.consultationMode === 'in-person' ? 'Global LMG office visit to be confirmed' : null,
            request.consultationMode === 'video' ? 'google-meet' : request.consultationMode,
            null,
            null,
            null,
            1,
            'Preferred consultation slot requested from dashboard intake.',
            ownerUserId,
            null,
            createdAt,
            createdAt,
            null,
          ]
        );
      }

      if (requestUploadRows.length > 0) {
        for (const upload of requestUploadRows) {
          await connection.execute(
            `INSERT INTO request_documents (
              service_request_id, document_id, link_role_code, created_at
            ) VALUES (?, ?, ?, ?)`,
            [serviceRequestId, Number(upload.document_id), 'intake', documentTimestamp]
          );
          await connection.execute(
            `INSERT INTO matter_documents (
              matter_id, document_id, link_role_code, created_at
            ) VALUES (?, ?, ?, ?)`,
            [matterId, Number(upload.document_id), 'client', documentTimestamp]
          );
        }

        const placeholders = requestUploadRows.map(() => '?').join(', ');
        await connection.execute(
          `UPDATE document_upload_intents
           SET status_code = 'attached',
               request_public_id = ?,
               matter_public_id = ?
           WHERE public_id IN (${placeholders})`,
          [serviceRequestPublicId, matterPublicId, ...requestUploadRows.map((upload) => upload.public_id)]
        );
      } else {
        for (const document of request.documents) {
          const [documentInsert] = await connection.execute(
            `INSERT INTO documents (
              public_id, document_number, owner_client_account_id, title, category_code,
              visibility_scope_code, current_version_no, created_by_user_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              createPublicId(),
              await allocateBusinessNumber(connection, 'document', 'DOC'),
              context.clientAccountId,
              document.name,
              'intake-upload',
              'client',
              1,
              currentUserId,
              documentTimestamp,
              documentTimestamp,
            ]
          );
          const documentId = Number((documentInsert as { insertId: number }).insertId);

          await connection.execute(
            `INSERT INTO document_versions (
              public_id, document_id, version_no, storage_driver_code, storage_path, original_file_name,
              mime_type, file_extension, file_size_bytes, checksum_sha256, virus_scan_status_code,
              uploaded_by_user_id, uploaded_at, is_current, retention_hold_flag
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              createPublicId(),
              documentId,
              1,
              'pending',
              `pending/${document.name}`,
              document.name,
              document.type || 'application/octet-stream',
              document.name.includes('.') ? document.name.split('.').slice(-1)[0] || 'bin' : 'bin',
              document.size,
              hashDocumentChecksum(document.name, document.size),
              'pending',
              currentUserId,
              documentTimestamp,
              1,
              0,
            ]
          );

          await connection.execute(
            `INSERT INTO request_documents (
              service_request_id, document_id, link_role_code, created_at
            ) VALUES (?, ?, ?, ?)`,
            [serviceRequestId, documentId, 'intake', documentTimestamp]
          );
          await connection.execute(
            `INSERT INTO matter_documents (
              matter_id, document_id, link_role_code, created_at
            ) VALUES (?, ?, ?, ?)`,
            [matterId, documentId, 'client', documentTimestamp]
          );
        }
      }

      await domainEventService.publishRequestSubmitted(connection, {
        actorUserId: currentUserId,
        clientAccountId: context.clientAccountId,
        matterId,
        matterNumber,
        threadId,
        title,
      });
    });

    return this.getSnapshot(currentClient);
  }

  public async selectMatterPackage(
    currentClient: PlatformUser,
    matterPublicId: string,
    matterPackagePublicId: string,
    proposalVersion: number
  ) {
    await this.initialize();

    let generatedInvoiceId = '';

    await withTransaction(this.pool, async (connection) => {
      const context = await this.resolveClientContext(connection, currentClient.id);
      const userRow = await selectOne<RowDataPacket>(
        connection,
        'SELECT id FROM users WHERE public_id = ? LIMIT 1',
        [currentClient.id]
      );

      if (!userRow?.id) {
        throw notFound('current_user_not_found', 'Current user could not be resolved.');
      }

      const matterRow = await selectOne<MatterSelectionRow>(
        connection,
        `SELECT
           m.id,
           m.public_id,
           m.client_account_id,
           m.title,
           m.matter_number,
           m.quoted_total_amount,
           m.paid_total_amount,
           m.due_total_amount,
           m.selected_matter_package_id,
           m.opened_by_user_id,
           ca.owner_user_id
         FROM matters m
         INNER JOIN client_accounts ca
           ON ca.id = m.client_account_id
         WHERE m.public_id = ?
           AND m.client_account_id = ?
           AND m.archived_at IS NULL
         LIMIT 1`,
        [matterPublicId, context.clientAccountId]
      );

      if (!matterRow?.id) {
        throw forbidden('matter_forbidden', 'You do not have access to this matter.');
      }

      const packageRow = await selectOne<PackageSelectionCandidateRow>(
        connection,
        `SELECT
           mp.id,
           mp.public_id,
           mp.matter_id,
           mp.package_name,
           mp.description,
           mp.total_price,
           mp.proposal_version_no,
           mp.published_at,
           mp.superseded_at,
           mp.selected_at
         FROM matter_packages mp
         WHERE mp.public_id = ?
           AND mp.matter_id = ?
           AND mp.archived_at IS NULL
         LIMIT 1`,
        [matterPackagePublicId, Number(matterRow.id)]
      );

      if (!packageRow?.id) {
        throw forbidden('package_forbidden', 'This package is not available for the selected matter.');
      }

      if (Number(packageRow.proposal_version_no) !== proposalVersion) {
        throw conflict(
          'proposal_version_mismatch',
          'The selected package does not belong to the current proposal version.'
        );
      }

      if (!packageRow.published_at || packageRow.superseded_at) {
        throw conflict(
          'proposal_not_selectable',
          'This package is no longer available for selection. Refresh the matter and try again.'
        );
      }

      if (Number(matterRow.selected_matter_package_id || 0) === Number(packageRow.id)) {
        const existingInvoice = await this.findActiveInvoiceForPackage(connection, Number(packageRow.id));
        generatedInvoiceId = existingInvoice?.public_id || '';
        return;
      }

      if (matterRow.selected_matter_package_id) {
        throw conflict(
          'package_selection_locked',
          'A package has already been selected for this matter. Ask the Global LMG team if it needs to be changed.'
        );
      }

      const createdAt = toMysqlDateTime(nowUtc());
      await connection.execute(
        `UPDATE matter_packages
         SET selected_at = CASE WHEN id = ? THEN ? ELSE NULL END,
             updated_at = ?,
             row_version = row_version + 1
         WHERE matter_id = ?
           AND proposal_version_no = ?`,
        [Number(packageRow.id), createdAt, createdAt, Number(matterRow.id), proposalVersion]
      );

      const packagePrice = toAmount(packageRow.total_price);
      const paidAmount = toAmount(matterRow.paid_total_amount);

      await connection.execute(
        `UPDATE matters
         SET selected_matter_package_id = ?,
             quoted_total_amount = ?,
             due_total_amount = ?,
             operational_status_code = 'awaiting-payment',
             last_activity_at = UTC_TIMESTAMP(6),
             updated_at = UTC_TIMESTAMP(6),
             row_version = row_version + 1
         WHERE id = ?`,
        [Number(packageRow.id), packagePrice, Math.max(packagePrice - paidAmount, 0), Number(matterRow.id)]
      );

      const invoice = await this.createPackageInvoice(connection, {
        actorUserId: Number(userRow.id),
        clientAccountId: Number(matterRow.client_account_id),
        matterId: Number(matterRow.id),
        matterPackageId: Number(packageRow.id),
        packageName: packageRow.package_name,
        totalAmount: packagePrice,
      });
      generatedInvoiceId = invoice.publicId;

      await connection.execute(
        `UPDATE matters
         SET quoted_total_amount = ?,
             due_total_amount = ?,
             updated_at = UTC_TIMESTAMP(6),
             row_version = row_version + 1
         WHERE id = ?`,
        [invoice.totalAmount, Math.max(invoice.totalAmount - paidAmount, 0), Number(matterRow.id)]
      );

      const clientRecipients = await this.getClientRecipientUserIds(
        connection,
        Number(matterRow.client_account_id)
      );
      await this.insertNotifications(connection, clientRecipients, {
        bodyText: `Invoice ${invoice.invoiceNumber} has been generated for the ${packageRow.package_name} package.`,
        invoiceId: invoice.id,
        matterId: Number(matterRow.id),
        notificationTypeCode: 'invoice_generated',
        priorityCode: 'normal',
        title: 'Invoice generated',
      });
      await this.insertNotifications(connection, clientRecipients, {
        bodyText: `You selected the ${packageRow.package_name} package for ${matterRow.matter_number}.`,
        invoiceId: invoice.id,
        matterId: Number(matterRow.id),
        notificationTypeCode: 'proposal',
        priorityCode: 'normal',
        title: 'Package selected',
      });

      const adminRecipients = await this.getMatterAdminRecipientUserIds(
        connection,
        Number(matterRow.id)
      );
      await this.insertNotifications(connection, adminRecipients, {
        bodyText: `${currentClient.name} selected the ${packageRow.package_name} package.`,
        invoiceId: invoice.id,
        matterId: Number(matterRow.id),
        notificationTypeCode: 'proposal',
        priorityCode: 'normal',
        title: 'Package selected',
      });

      await this.insertAuditEvent(connection, {
        actionCode: 'package.selected',
        actionLabel: 'Matter package selected',
        actorRoleCodeSnapshot: 'client',
        actorUserId: Number(userRow.id),
        entityPk: Number(packageRow.id),
        entityTableName: 'matter_packages',
        sourceModule: 'Client Dashboard',
        summaryNewValue: packageRow.package_name,
        summaryOldValue: matterPublicId,
      });
    });

    return {
      generatedInvoiceId,
      selectedPackageId: matterPackagePublicId,
      snapshot: await this.getSnapshot(currentClient),
    };
  }

  public async sendMessage(
    currentClient: PlatformUser,
    threadPublicId: string,
    content: string,
    attachmentUploadIds: string[] = []
  ) {
    await this.initialize();

    const trimmedContent = content.trim();
    const uniqueAttachmentUploadIds = [...new Set(attachmentUploadIds.map((value) => value.trim()).filter(Boolean))];

    if (!trimmedContent && uniqueAttachmentUploadIds.length === 0) {
      return this.getSnapshot(currentClient);
    }

    await withTransaction(this.pool, async (connection) => {
      const context = await this.resolveClientContext(connection, currentClient.id);
      const userRow = await selectOne<RowDataPacket>(
        connection,
        'SELECT id FROM users WHERE public_id = ? LIMIT 1',
        [currentClient.id]
      );

      if (!userRow?.id) {
        throw notFound('current_user_not_found', 'Current user could not be resolved.');
      }

      const threadRow = await selectOne<RowDataPacket>(
        connection,
        `SELECT
           ct.id,
           ct.closed_at,
           ct.status_code,
           ct.subject,
           m.title AS matter_title
         FROM conversation_threads ct
         LEFT JOIN matters m
           ON m.id = ct.matter_id
         WHERE ct.public_id = ?
           AND ct.client_account_id = ?
           AND ct.archived_at IS NULL
         LIMIT 1`,
        [threadPublicId, context.clientAccountId]
      );

      if (!threadRow?.id) {
        throw forbidden('thread_forbidden', 'You do not have access to this thread.');
      }

      if (threadRow.closed_at || threadRow.status_code === 'resolved') {
        throw badRequest('thread_closed', 'This conversation is closed.');
      }

      let attachmentRows: AttachmentUploadRow[] = [];

      if (uniqueAttachmentUploadIds.length > 0) {
        const placeholders = uniqueAttachmentUploadIds.map(() => '?').join(', ');
        attachmentRows = await selectAll<AttachmentUploadRow>(
          connection,
          `SELECT
             dui.public_id,
             dui.thread_public_id,
             dui.document_version_id,
             dui.status_code
           FROM document_upload_intents dui
           WHERE dui.public_id IN (${placeholders})
             AND dui.owner_user_id = ?
             AND dui.owner_client_account_id = ?`,
          [...uniqueAttachmentUploadIds, Number(userRow.id), context.clientAccountId]
        );

        if (attachmentRows.length !== uniqueAttachmentUploadIds.length) {
          throw forbidden(
            'message_attachment_forbidden',
            'One or more selected attachments are not available for this thread.'
          );
        }

        for (const attachment of attachmentRows) {
          if (attachment.thread_public_id !== threadPublicId) {
            throw forbidden(
              'message_attachment_thread_mismatch',
              'Attachments must belong to the active conversation thread.'
            );
          }

          if (!attachment.document_version_id || !['stored', 'attached'].includes(attachment.status_code)) {
            throw conflict(
              'message_attachment_not_ready',
              'One or more attachments are not ready to be sent yet.'
            );
          }
        }
      }

      const createdAt = toMysqlDateTime(nowUtc());
      const messageBody = trimmedContent || 'Attachment shared';
      const [messageInsert] = await connection.execute(
        `INSERT INTO messages (
          public_id, thread_id, sender_user_id, sender_counsel_partner_id, sender_system_code,
          message_type_code, body_text, visible_to_client, reply_to_message_id, sent_at, edited_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createPublicId(),
          Number(threadRow.id),
          Number(userRow.id),
          null,
          null,
          attachmentRows.length > 0 ? 'file' : 'text',
          messageBody,
          1,
          null,
          createdAt,
          null,
          null,
        ]
      );
      const messageId = Number((messageInsert as { insertId: number }).insertId);

      if (attachmentRows.length > 0) {
        for (const [index, attachment] of attachmentRows.entries()) {
          await connection.execute(
            `INSERT INTO message_document_versions (
              message_id, document_version_id, sort_order, created_at
            ) VALUES (?, ?, ?, ?)`,
            [messageId, Number(attachment.document_version_id), index + 1, createdAt]
          );
        }

        const placeholders = attachmentRows.map(() => '?').join(', ');
        await connection.execute(
          `UPDATE document_upload_intents
           SET status_code = 'attached'
           WHERE public_id IN (${placeholders})`,
          attachmentRows.map((attachment) => attachment.public_id)
        );
      }

      await connection.execute(
        `INSERT INTO message_reads (
          message_id, user_id, read_at
        ) VALUES (?, ?, ?)`,
        [messageId, Number(userRow.id), createdAt]
      );

      await connection.execute(
        `UPDATE conversation_threads
         SET status_code = 'waiting',
             last_message_at = ?,
             updated_at = ?
         WHERE id = ?`,
        [createdAt, createdAt, Number(threadRow.id)]
      );

      await domainEventService.publishThreadMessage(connection, {
        actorRoleCodeSnapshot: 'client',
        actorUserId: Number(userRow.id),
        bodyText: messageBody,
        entityLabel:
          String(threadRow?.matter_title || threadRow?.subject || 'A new message is waiting in the portal inbox.'),
        notificationTitle: String(threadRow?.matter_title || threadRow?.subject || 'New message'),
        senderUserId: Number(userRow.id),
        sourceModule: 'Client Dashboard',
        threadId: Number(threadRow.id),
      });
    });

    return this.getSnapshot(currentClient);
  }

  public async markThreadRead(currentClient: PlatformUser, threadPublicId: string) {
    await this.initialize();

    await withTransaction(this.pool, async (connection) => {
      const context = await this.resolveClientContext(connection, currentClient.id);
      const userRow = await selectOne<RowDataPacket>(
        connection,
        'SELECT id FROM users WHERE public_id = ? LIMIT 1',
        [currentClient.id]
      );

      if (!userRow?.id) {
        throw notFound('current_user_not_found', 'Current user could not be resolved.');
      }

      const threadRow = await selectOne<RowDataPacket>(
        connection,
        `SELECT id
         FROM conversation_threads
         WHERE public_id = ?
           AND client_account_id = ?
           AND archived_at IS NULL
         LIMIT 1`,
        [threadPublicId, context.clientAccountId]
      );

      if (!threadRow?.id) {
        throw forbidden('thread_forbidden', 'You do not have access to this thread.');
      }

      await connection.execute(
        `INSERT IGNORE INTO message_reads (message_id, user_id, read_at)
         SELECT msg.id, ?, UTC_TIMESTAMP(6)
         FROM messages msg
         WHERE msg.thread_id = ?
           AND msg.deleted_at IS NULL
           AND msg.visible_to_client = 1
           AND (msg.sender_user_id IS NULL OR msg.sender_user_id <> ?)`,
        [Number(userRow.id), Number(threadRow.id), Number(userRow.id)]
      );

      await connection.execute(
        `UPDATE thread_participants
         SET last_read_at = UTC_TIMESTAMP(6),
             last_read_message_id = (
               SELECT MAX(msg.id)
               FROM messages msg
               WHERE msg.thread_id = ?
                 AND msg.deleted_at IS NULL
                 AND msg.visible_to_client = 1
             )
         WHERE thread_id = ?
           AND client_contact_user_id = ?`,
        [Number(threadRow.id), Number(threadRow.id), Number(userRow.id)]
      );

      await connection.execute(
        `UPDATE notifications
         SET is_read = 1,
             read_at = COALESCE(read_at, UTC_TIMESTAMP(6))
         WHERE thread_id = ?
           AND recipient_user_id = ?
           AND notification_type_code = 'message_received'
           AND is_read = 0`,
        [Number(threadRow.id), Number(userRow.id)]
      );
    });

    return this.getSnapshot(currentClient);
  }

  private async getClientRecipientUserIds(connection: PoolConnection, clientAccountId: number) {
    const rows = await selectAll<RowDataPacket & { user_id: number }>(
      connection,
      `SELECT DISTINCT cac.user_id
       FROM client_account_contacts cac
       WHERE cac.client_account_id = ?
         AND cac.portal_access_enabled = 1
         AND cac.archived_at IS NULL`,
      [clientAccountId]
    );

    return rows.map((row) => Number(row.user_id));
  }

  private async getMatterAdminRecipientUserIds(connection: PoolConnection, matterId: number) {
    const rows = await selectAll<RowDataPacket & { user_id: number }>(
      connection,
      `SELECT DISTINCT user_id
       FROM (
         SELECT m.opened_by_user_id AS user_id
         FROM matters m
         WHERE m.id = ?
         UNION
         SELECT ca.owner_user_id AS user_id
         FROM matters m
         INNER JOIN client_accounts ca ON ca.id = m.client_account_id
         WHERE m.id = ?
         UNION
         SELECT ma.internal_user_id AS user_id
         FROM matter_assignments ma
         WHERE ma.matter_id = ?
           AND ma.removed_at IS NULL
           AND ma.internal_user_id IS NOT NULL
       ) recipients
       WHERE user_id IS NOT NULL`,
      [matterId, matterId, matterId]
    );

    return rows.map((row) => Number(row.user_id));
  }

  private async insertNotifications(
    connection: PoolConnection,
    recipientUserIds: number[],
    input: {
      bodyText: string;
      invoiceId?: number | null;
      matterId?: number | null;
      notificationTypeCode: string;
      priorityCode: string;
      title: string;
    }
  ) {
    if (recipientUserIds.length === 0) {
      return;
    }

    const createdAt = toMysqlDateTime(nowUtc());

    for (const recipientUserId of recipientUserIds) {
      await connection.execute(
        `INSERT INTO notifications (
           public_id,
           recipient_user_id,
           notification_type_code,
           title,
           body_text,
           priority_code,
           matter_id,
           invoice_id,
           thread_id,
           event_id,
           document_id,
           is_read,
           read_at,
           dismissed_at,
           created_at,
           expires_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 0, NULL, NULL, ?, NULL)`,
        [
          createPublicId(),
          recipientUserId,
          input.notificationTypeCode,
          input.title,
          input.bodyText,
          input.priorityCode,
          input.matterId || null,
          input.invoiceId || null,
          createdAt,
        ]
      );
    }
  }

  private async insertAuditEvent(
    connection: PoolConnection,
    input: {
      actionCode: string;
      actionLabel: string;
      actorRoleCodeSnapshot: string;
      actorUserId: number | null;
      entityPk: number | null;
      entityTableName: string;
      sourceModule: string;
      summaryNewValue?: string | null;
      summaryOldValue?: string | null;
    }
  ) {
    await connection.execute(
      `INSERT INTO audit_events (
         public_id,
         actor_user_id,
         actor_role_code_snapshot,
         entity_table_name,
         entity_pk,
         action_code,
         action_label,
         source_module,
         request_correlation_id,
         ip_address,
         user_agent,
         summary_old_value,
         summary_new_value,
         occurred_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)`,
      [
        createPublicId(),
        input.actorUserId,
        input.actorRoleCodeSnapshot,
        input.entityTableName,
        input.entityPk,
        input.actionCode,
        input.actionLabel,
        input.sourceModule,
        input.summaryOldValue || null,
        input.summaryNewValue || null,
        toMysqlDateTime(nowUtc()),
      ]
    );
  }

  private async findActiveInvoiceForPackage(connection: PoolConnection, matterPackageId: number) {
    return selectOne<ExistingPackageInvoiceRow>(
      connection,
      `SELECT id, public_id, status_code, amount_paid, archived_at
       FROM invoices
       WHERE matter_package_id = ?
         AND archived_at IS NULL
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [matterPackageId]
    );
  }

  private moneyToMinor(value: number | string) {
    const normalized = String(value).trim();
    const [wholePart, fractionPart = ''] = normalized.split('.');
    return Number(wholePart) * 100 + Number(fractionPart.padEnd(2, '0').slice(0, 2));
  }

  private minorToDecimal(minorUnits: number) {
    return (minorUnits / 100).toFixed(2);
  }

  private normalizeState(value: string | null | undefined) {
    return value
      ? value
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
      : '';
  }

  private async getInvoiceSettings(connection: PoolConnection) {
    const row = await selectOne<InvoiceSettingsRow>(
      connection,
      `SELECT
         business_state,
         gst_enabled,
         default_gst_rate_bps,
         tax_mode_code,
         prices_include_tax,
         fallback_tax_type_code,
         payment_terms_days,
         reverse_charge_note
       FROM invoice_settings
       WHERE id = 1
       LIMIT 1`
    );

    return (
      row || {
        business_state: 'Not configured',
        default_gst_rate_bps: 1800,
        fallback_tax_type_code: 'igst' as const,
        gst_enabled: 1,
        payment_terms_days: 7,
        prices_include_tax: 0,
        reverse_charge_note: 'Tax payable under reverse charge where applicable.',
        tax_mode_code: 'forward_charge' as const,
      }
    );
  }

  private async getTaxRateId(connection: PoolConnection, rateBps: number) {
    const row = await selectOne<TaxRateIdRow>(
      connection,
      `SELECT id
       FROM tax_rates
       WHERE is_active = 1
         AND ROUND(rate_percent * 100) = ?
       ORDER BY effective_from DESC, id DESC
       LIMIT 1`,
      [rateBps]
    );

    return row?.id || null;
  }

  private async calculateInvoiceTax(
    connection: PoolConnection,
    amount: number,
    clientState: string | null | undefined
  ) {
    const settings = await this.getInvoiceSettings(connection);
    const grossMinor = this.moneyToMinor(amount);
    const rateBps =
      settings.gst_enabled && settings.tax_mode_code === 'forward_charge'
        ? Number(settings.default_gst_rate_bps || 0)
        : 0;

    if (!rateBps) {
      return {
        dueDateDays: Number(settings.payment_terms_days || 7),
        lineSubtotal: this.minorToDecimal(grossMinor),
        lineTotal: this.minorToDecimal(grossMinor),
        subtotal: this.minorToDecimal(grossMinor),
        taxable: this.minorToDecimal(grossMinor),
        tax: '0.00',
        taxLines: [] as Array<{
          amount: string;
          code: string;
          name: string;
          percent: string;
          sortOrder: number;
          taxRateId: number | null;
          taxable: string;
        }>,
        total: this.minorToDecimal(grossMinor),
      };
    }

    const taxableMinor = settings.prices_include_tax
      ? Math.round((grossMinor * 10000) / (10000 + rateBps))
      : grossMinor;
    const taxMinor = settings.prices_include_tax
      ? grossMinor - taxableMinor
      : Math.round((taxableMinor * rateBps) / 10000);
    const totalMinor = settings.prices_include_tax ? grossMinor : taxableMinor + taxMinor;
    const businessState = this.normalizeState(settings.business_state);
    const normalizedClientState = this.normalizeState(clientState);
    const taxType =
      businessState && businessState !== 'notconfigured' && normalizedClientState
        ? businessState === normalizedClientState
          ? 'cgst_sgst'
          : 'igst'
        : settings.fallback_tax_type_code;
    const taxRateId = await this.getTaxRateId(connection, rateBps);

    if (taxType === 'none') {
      return {
        dueDateDays: Number(settings.payment_terms_days || 7),
        lineSubtotal: this.minorToDecimal(taxableMinor),
        lineTotal: this.minorToDecimal(taxableMinor),
        subtotal: this.minorToDecimal(taxableMinor),
        taxable: this.minorToDecimal(taxableMinor),
        tax: '0.00',
        taxLines: [],
        total: this.minorToDecimal(taxableMinor),
      };
    }

    const taxLines =
      taxType === 'cgst_sgst'
        ? [
            {
              amount: this.minorToDecimal(Math.floor(taxMinor / 2)),
              code: 'CGST',
              name: 'CGST',
              percent: (rateBps / 200).toFixed(2),
              sortOrder: 1,
              taxRateId,
              taxable: this.minorToDecimal(taxableMinor),
            },
            {
              amount: this.minorToDecimal(taxMinor - Math.floor(taxMinor / 2)),
              code: 'SGST',
              name: 'SGST',
              percent: (rateBps / 200).toFixed(2),
              sortOrder: 2,
              taxRateId,
              taxable: this.minorToDecimal(taxableMinor),
            },
          ]
        : [
            {
              amount: this.minorToDecimal(taxMinor),
              code: 'IGST',
              name: 'IGST',
              percent: (rateBps / 100).toFixed(2),
              sortOrder: 1,
              taxRateId,
              taxable: this.minorToDecimal(taxableMinor),
            },
          ];

    return {
      dueDateDays: Number(settings.payment_terms_days || 7),
      lineSubtotal: this.minorToDecimal(taxableMinor),
      lineTotal: this.minorToDecimal(totalMinor),
      subtotal: this.minorToDecimal(taxableMinor),
      taxable: this.minorToDecimal(taxableMinor),
      tax: this.minorToDecimal(taxMinor),
      taxLines,
      total: this.minorToDecimal(totalMinor),
    };
  }

  private async createPackageInvoice(
    connection: PoolConnection,
    input: {
      actorUserId: number;
      clientAccountId: number;
      matterId: number;
      matterPackageId: number;
      packageName: string;
      totalAmount: number;
    }
  ) {
    const invoicePublicId = createPublicId();
    const invoiceNumber = await allocateBusinessNumber(connection, 'invoice', 'INV');
    const createdAt = toMysqlDateTime(nowUtc());
    const issueDate = nowUtc().slice(0, 10);
    const billingSeed = await selectOne<BillingSnapshotSeedRow>(
      connection,
      `SELECT
         ca.billing_name,
         ca.primary_email AS billing_email,
         ca.primary_phone AS billing_phone,
         ca.gstin,
         addr.line1 AS address_line1,
         addr.line2 AS address_line2,
         addr.city,
         addr.state,
         addr.postal_code,
         addr.country_code
       FROM client_accounts ca
       LEFT JOIN client_addresses addr
         ON addr.client_account_id = ca.id
         AND addr.is_primary = 1
         AND addr.archived_at IS NULL
       WHERE ca.id = ?
       LIMIT 1`,
      [input.clientAccountId]
    );
    const tax = await this.calculateInvoiceTax(connection, input.totalAmount, billingSeed?.state || null);
    const dueDate = addDaysUtc(tax.dueDateDays).slice(0, 10);

    const [invoiceInsert] = await connection.execute(
      `INSERT INTO invoices (
         public_id,
         invoice_number,
         client_account_id,
         matter_id,
         matter_package_id,
         subscription_id,
         invoice_type_code,
         status_code,
         currency_code,
         issue_date,
         due_date,
         subtotal_amount,
         discount_amount,
         tax_amount,
         total_amount,
         amount_paid,
         amount_refunded,
         amount_due,
         created_by_user_id,
         created_at,
         updated_at,
         archived_at
       ) VALUES (?, ?, ?, ?, ?, NULL, 'matter-package', 'sent', 'INR', ?, ?, ?, 0, ?, ?, 0, 0, ?, ?, ?, ?, NULL)`,
      [
        invoicePublicId,
        invoiceNumber,
        input.clientAccountId,
        input.matterId,
        input.matterPackageId,
        issueDate,
        dueDate,
        tax.subtotal,
        tax.tax,
        tax.total,
        tax.total,
        input.actorUserId,
        createdAt,
        createdAt,
      ]
    );
    const invoiceId = Number((invoiceInsert as { insertId: number }).insertId);

    await connection.execute(
      `INSERT INTO invoice_billing_snapshots (
         invoice_id,
         billing_name,
         billing_email,
         billing_phone,
         address_line1,
         address_line2,
         city,
         state,
         postal_code,
         country_code,
         gstin,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceId,
        billingSeed?.billing_name || 'Billing Contact',
        billingSeed?.billing_email || '',
        billingSeed?.billing_phone || '',
        billingSeed?.address_line1 || 'Address pending',
        billingSeed?.address_line2 || null,
        billingSeed?.city || '',
        billingSeed?.state || '',
        billingSeed?.postal_code || '',
        billingSeed?.country_code || 'IN',
        billingSeed?.gstin || null,
        createdAt,
      ]
    );

    const [lineInsert] = await connection.execute(
      `INSERT INTO invoice_lines (
         invoice_id,
         line_type_code,
         service_id,
         subscription_plan_id,
         description,
         quantity,
         unit_price,
         line_subtotal,
         discount_amount,
         taxable_amount,
         line_total,
         sort_order,
         created_at
       ) VALUES (?, 'service-package', NULL, NULL, ?, 1, ?, ?, 0, ?, ?, 1, ?)`,
      [
        invoiceId,
        input.packageName,
        tax.lineSubtotal,
        tax.lineSubtotal,
        tax.taxable,
        tax.lineTotal,
        createdAt,
      ]
    );
    const invoiceLineId = Number((lineInsert as { insertId: number }).insertId);

    for (const taxLine of tax.taxLines) {
      await connection.execute(
        `INSERT INTO invoice_line_taxes (
           invoice_line_id,
           tax_rate_id,
           tax_code_snapshot,
           tax_name_snapshot,
           tax_percent_snapshot,
           taxable_amount,
           tax_amount,
           sort_order,
           created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceLineId,
          taxLine.taxRateId,
          taxLine.code,
          taxLine.name,
          taxLine.percent,
          taxLine.taxable,
          taxLine.amount,
          taxLine.sortOrder,
          createdAt,
        ]
      );
    }

    await connection.execute(
      `INSERT INTO invoice_installments (
         invoice_id,
         installment_no,
         due_date,
         amount_due,
         amount_paid,
         amount_remaining,
         status_code,
         paid_at,
         created_at
       ) VALUES (?, 1, ?, ?, 0, ?, 'pending', NULL, ?)`,
      [invoiceId, dueDate, tax.total, tax.total, createdAt]
    );

    return {
      id: invoiceId,
      invoiceLineId,
      invoiceNumber,
      publicId: invoicePublicId,
      totalAmount: Number(tax.total),
    };
  }

  private parsePreferredWindow(preferredDate: string, preferredTime: string) {
    const trimmedDate = preferredDate.trim();
    const trimmedTime = preferredTime.trim();

    if (!trimmedDate || !trimmedTime || !trimmedTime.includes('-')) {
      return { end: undefined, start: undefined };
    }

    const [startLabel, endLabel] = trimmedTime.split('-').map((part) => part.trim());

    const parse = (label: string) => {
      const [timePart, period] = label.split(' ');
      const [hourRaw, minuteRaw] = timePart.split(':').map((value) => Number(value));

      let hour = hourRaw;
      if (period.toUpperCase() === 'PM' && hour < 12) {
        hour += 12;
      }
      if (period.toUpperCase() === 'AM' && hour === 12) {
        hour = 0;
      }

      return new Date(`${trimmedDate}T${String(hour).padStart(2, '0')}:${String(
        minuteRaw
      ).padStart(2, '0')}:00.000Z`);
    };

    return {
      end: parse(endLabel),
      start: parse(startLabel),
    };
  }

  private async fetchMatters(
    connection: PoolConnection,
    clientAccountId: number,
    currentClient: PlatformUser
  ): Promise<Matter[]> {
    const matters = await selectAll<MatterRow>(
      connection,
      `SELECT
         m.id,
         m.public_id,
         m.matter_number,
         m.title,
         m.issue_summary,
         m.current_stage_code,
         ms.label AS current_stage_label,
         m.operational_status_code,
         m.consultation_mode_code,
         pur.urgency_code,
         ld.domain_name AS legal_domain_name,
         m.priority_code,
         m.quoted_total_amount,
         m.paid_total_amount,
         m.due_total_amount,
         m.created_at,
         m.last_activity_at
       FROM matters m
       INNER JOIN matter_stages ms ON ms.code = m.current_stage_code
       INNER JOIN pricing_urgency_rules pur ON pur.id = m.urgency_rule_id
       INNER JOIN legal_domains ld ON ld.id = m.legal_domain_id
       WHERE m.client_account_id = ? AND m.archived_at IS NULL
       ORDER BY m.last_activity_at DESC`,
      [clientAccountId]
    );

    if (matters.length === 0) {
      return [];
    }

    const matterIds = matters.map((matter) => matter.id);
    const matterIdPlaceholders = matterIds.map(() => '?').join(', ');
    const assignments = await selectAll<MatterAssignmentRow>(
      connection,
      `SELECT
         ma.matter_id,
         ma.assignment_role_code,
         COALESCE(u.display_name, cp.full_name) AS assigned_name,
         ma.fee_agreed_amount,
         ma.fee_paid_amount,
         ma.fee_due_amount
       FROM matter_assignments ma
       LEFT JOIN users u ON u.id = ma.internal_user_id
       LEFT JOIN counsel_partners cp ON cp.id = ma.counsel_partner_id
       WHERE ma.matter_id IN (${matterIdPlaceholders}) AND ma.assignment_status_code = 'active'`,
      matterIds
    );
    const services = await selectAll<MatterServiceRow>(
      connection,
      `SELECT ms.matter_id, s.service_code
       FROM matter_services ms
       INNER JOIN services s ON s.id = ms.service_id
       WHERE ms.matter_id IN (${matterIdPlaceholders})
       ORDER BY ms.created_at ASC`,
      matterIds
    );
    const notes = await selectAll<MatterUpdateRow>(
      connection,
      `SELECT matter_id, body_text, visible_to_client
       FROM matter_updates
       WHERE matter_id IN (${matterIdPlaceholders})
         AND visible_to_client = 1
       ORDER BY created_at ASC`,
      matterIds
    );
    const packageRows = await selectAll<RowDataPacket>(
      connection,
      `SELECT m.id AS matter_id, mp.public_id
       FROM matters m
       LEFT JOIN matter_packages mp
         ON mp.id = m.selected_matter_package_id
       WHERE m.id IN (${matterIdPlaceholders})`,
      matterIds
    );

    return matters.map((matter) => {
      const matterAssignments = assignments.filter((entry) => entry.matter_id === matter.id);
      const matterServices = services
        .filter((entry) => entry.matter_id === matter.id)
        .map((entry) => entry.service_code);
      const matterNotes = notes.filter((entry) => entry.matter_id === matter.id);
      const matterPackage = packageRows.find((entry) => Number(entry.matter_id) === matter.id);

      return {
        assignedCounsel:
          matterAssignments.find((entry) =>
            ['counsel', 'lead_counsel'].includes(entry.assignment_role_code)
          )?.assigned_name ||
          undefined,
        assignedStaff:
          matterAssignments.find((entry) =>
            ['billing_owner', 'case_manager', 'internal_owner', 'staff'].includes(entry.assignment_role_code)
          )?.assigned_name || undefined,
        clientId: currentClient.id,
        clientName: currentClient.name,
        clientVisibleNotes: matterNotes
          .filter((entry) => Boolean(entry.visible_to_client))
          .map((entry) => entry.body_text),
        consultationMode: matter.consultation_mode_code as Matter['consultationMode'],
        createdAt: toIso(matter.created_at),
        dueAmount: toAmount(matter.due_total_amount),
        expertiseArea: matter.legal_domain_name,
        id: matter.public_id,
        internalNotes: [],
        issueSummary: matter.issue_summary,
        lastUpdated: toIso(matter.last_activity_at),
        lifecycleStage: matter.current_stage_code as Matter['lifecycleStage'],
        meetingLink: undefined,
        operationalStatus: matter.operational_status_code as Matter['operationalStatus'],
        packageId: matterPackage ? String(matterPackage.public_id) : undefined,
        paidAmount: toAmount(matter.paid_total_amount),
        priority: matter.priority_code as Matter['priority'],
        referenceCode: matter.matter_number,
        selectedServices: matterServices,
        stages: buildStages(matter.current_stage_code as Matter['lifecycleStage']),
        title: matter.title,
        totalFee: toAmount(matter.quoted_total_amount),
        urgency: matter.urgency_code as Matter['urgency'],
      } satisfies Matter;
    });
  }

  private async fetchPackages(connection: PoolConnection, clientAccountId: number): Promise<MatterPackage[]> {
    const packages = await selectAll<PackageRow>(
      connection,
      `SELECT
         mp.id,
         mp.public_id,
         mp.package_name,
         mp.description,
         mp.total_price,
         mp.display_order,
         mp.is_recommended,
         mp.proposal_version_no,
         mp.published_at,
         mp.superseded_at,
         mp.selected_at,
         mp.created_at,
         creator.display_name AS created_by,
         m.public_id AS matter_public_id,
         m.selected_matter_package_id AS matter_selected_package_id
       FROM matter_packages mp
       INNER JOIN matters m ON m.id = mp.matter_id
       INNER JOIN users creator ON creator.id = mp.created_by_user_id
       WHERE m.client_account_id = ?
         AND mp.archived_at IS NULL
         AND mp.published_at IS NOT NULL
       ORDER BY mp.proposal_version_no DESC, mp.display_order ASC, mp.created_at ASC`,
      [clientAccountId]
    );

    if (packages.length === 0) {
      return [];
    }

    const services = await selectAll<PackageServiceRow>(
      connection,
      `SELECT mps.matter_package_id, mp.public_id, s.service_code
       FROM matter_package_services mps
       INNER JOIN matter_packages mp ON mp.id = mps.matter_package_id
       INNER JOIN services s ON s.id = mps.service_id
       WHERE mp.archived_at IS NULL`
    );

    const features = await selectAll<PackageFeatureRow>(
      connection,
      `SELECT mpf.matter_package_id, mp.public_id, mpf.feature_text
       FROM matter_package_features mpf
       INNER JOIN matter_packages mp ON mp.id = mpf.matter_package_id
       WHERE mp.archived_at IS NULL
       ORDER BY mpf.sort_order ASC, mpf.id ASC`
    );

    return packages.map((entry) => ({
      createdAt: toIso(entry.created_at),
      createdBy: entry.created_by,
      description: entry.description || '',
      displayOrder: Number(entry.display_order || 0),
      features: features
        .filter((feature) => feature.public_id === entry.public_id)
        .map((feature) => feature.feature_text),
      id: entry.public_id,
      isRecommended: Boolean(entry.is_recommended),
      isSelected: Number(entry.matter_selected_package_id || 0) === Number(entry.id),
      matterId: entry.matter_public_id,
      name: entry.package_name,
      price: toAmount(entry.total_price),
      proposalStatus:
        entry.superseded_at
          ? 'superseded'
          : entry.selected_at
            ? 'selected'
            : 'published',
      proposalVersion: Number(entry.proposal_version_no),
      publishedAt: entry.published_at ? toIso(entry.published_at) : undefined,
      selectedAt: entry.selected_at ? toIso(entry.selected_at) : undefined,
      services: services
        .filter((service) => service.public_id === entry.public_id)
        .map((service) => service.service_code),
      supersededAt: entry.superseded_at ? toIso(entry.superseded_at) : undefined,
    }));
  }

  private async fetchInvoices(
    connection: PoolConnection,
    clientAccountId: number,
    clientPublicUserId: string,
    clientName: string
  ): Promise<Invoice[]> {
    const invoices = await selectAll<InvoiceRow>(
      connection,
      `SELECT
         i.id,
         i.public_id,
         i.status_code,
         i.issue_date,
         i.due_date,
         i.subtotal_amount,
         i.discount_amount,
         i.tax_amount,
         i.total_amount,
         i.amount_paid,
         i.amount_refunded,
         i.amount_due,
         m.public_id AS matter_public_id,
         m.matter_number,
         m.title AS matter_title,
         ca.display_name AS client_name
       FROM invoices i
       INNER JOIN client_accounts ca ON ca.id = i.client_account_id
       LEFT JOIN matters m ON m.id = i.matter_id
       WHERE i.client_account_id = ? AND i.archived_at IS NULL
       ORDER BY i.issue_date DESC`,
      [clientAccountId]
    );

    if (invoices.length === 0) {
      return [];
    }

    const invoiceIds = invoices.map((invoice) => invoice.id);
    const placeholders = invoiceIds.map(() => '?').join(', ');
    const lines = await selectAll<InvoiceLineRow>(
      connection,
      `SELECT invoice_id, description, quantity, unit_price AS rate, line_subtotal
       FROM invoice_lines
       WHERE invoice_id IN (${placeholders})
       ORDER BY sort_order ASC, id ASC`,
      invoiceIds
    );
    const payments = await selectAll<RowDataPacket>(
      connection,
      `SELECT
         pa.invoice_id,
         MAX(pt.captured_at) AS paid_at
       FROM payment_allocations pa
       INNER JOIN payment_transactions pt ON pt.id = pa.payment_transaction_id
       WHERE pa.invoice_id IN (${placeholders})
       GROUP BY pa.invoice_id`,
      invoiceIds
    );

    return invoices.map((invoice) => ({
      amount: toAmount(invoice.subtotal_amount),
      clientId: clientPublicUserId,
      clientName,
      discount: toAmount(invoice.discount_amount),
      dueDate: String(invoice.due_date),
      id: invoice.public_id,
      issueDate: String(invoice.issue_date),
      items: lines
        .filter((line) => line.invoice_id === invoice.id)
        .map(
          (line) =>
            ({
              amount: toAmount(line.line_subtotal),
              description: line.description,
              quantity: toAmount(line.quantity),
              rate: toAmount(line.rate),
            }) satisfies InvoiceItem
        ),
      matterId: invoice.matter_public_id || '',
      matterRef: invoice.matter_number || '',
      matterTitle: invoice.matter_title || '',
      paidDate: payments.find((payment) => Number(payment.invoice_id) === invoice.id)?.paid_at
        ? toIso(payments.find((payment) => Number(payment.invoice_id) === invoice.id)?.paid_at)
        : undefined,
      status: invoice.status_code as Invoice['status'],
      tax: toAmount(invoice.tax_amount),
      totalAmount: toAmount(invoice.total_amount),
    }));
  }

  private async fetchPayments(
    connection: PoolConnection,
    clientAccountId: number,
    clientPublicUserId: string,
    clientName: string
  ): Promise<Payment[]> {
    const rows = await selectAll<PaymentRow>(
      connection,
      `SELECT
         pt.public_id AS payment_public_id,
         pt.gateway_provider_code,
         pt.gateway_payment_ref,
         pt.status_code,
         pt.initiated_at,
         pa.amount_applied,
         inv.public_id AS invoice_public_id,
         m.public_id AS matter_public_id,
         COALESCE(creator.display_name, 'System') AS created_by_name,
         ca.display_name AS client_name
       FROM payment_transactions pt
       INNER JOIN payment_allocations pa ON pa.payment_transaction_id = pt.id
       INNER JOIN invoices inv ON inv.id = pa.invoice_id
       INNER JOIN client_accounts ca ON ca.id = pt.client_account_id
       LEFT JOIN matters m ON m.id = inv.matter_id
       LEFT JOIN users creator ON creator.id = pt.created_by_user_id
       WHERE pt.client_account_id = ?
       ORDER BY pt.initiated_at DESC`,
      [clientAccountId]
    );

    return rows.map((row) => ({
      amount: toAmount(row.amount_applied),
      clientId: clientPublicUserId,
      clientName: row.client_name || clientName,
      id: row.payment_public_id,
      invoiceId: row.invoice_public_id,
      matterId: row.matter_public_id || '',
      method: paymentMethodFromProvider(row.gateway_provider_code),
      recordedBy: row.created_by_name || 'System',
      reference: row.gateway_payment_ref || row.payment_public_id,
      status: paymentStatusToUi(row.status_code),
      timestamp: toIso(row.initiated_at),
    }));
  }

  private async fetchEvents(
    connection: PoolConnection,
    clientAccountId: number,
    clientPublicUserId: string,
    clientName: string
  ): Promise<PlatformEvent[]> {
    const rows = await selectAll<EventRow>(
      connection,
      `SELECT
         e.public_id,
         e.title,
         e.event_type_code,
         e.status_code,
         e.scheduled_start_at,
         e.scheduled_end_at,
         e.mode_code,
         e.location_text,
         e.join_url,
         e.client_visible_flag,
         e.notes,
         m.public_id AS matter_public_id,
         m.title AS matter_title,
         ca.display_name AS client_name,
         TIMESTAMPDIFF(MINUTE, e.scheduled_start_at, e.scheduled_end_at) AS duration_minutes,
         CASE
           WHEN e.join_url IS NOT NULL AND e.status_code = 'upcoming' THEN 'Join Call'
           WHEN e.mode_code = 'court' THEN 'View Details'
           ELSE 'Await Confirmation'
         END AS action_cta
       FROM events e
       INNER JOIN client_accounts ca ON ca.id = e.client_account_id
       LEFT JOIN matters m ON m.id = e.matter_id
       WHERE e.client_account_id = ?
         AND e.client_visible_flag = 1
       ORDER BY e.scheduled_start_at ASC`,
      [clientAccountId]
    );

    return rows.map((row) => ({
      actionCTA: row.action_cta,
      clientId: clientPublicUserId,
      clientName: row.client_name || clientName,
      date: toDateOnly(row.scheduled_start_at),
      duration: Number(row.duration_minutes || 0),
      id: row.public_id,
      location: row.location_text || undefined,
      matterId: row.matter_public_id || '',
      matterTitle: row.matter_title || row.title,
      meetLink: row.join_url || undefined,
      mode: row.mode_code as PlatformEvent['mode'],
      notes: row.notes || '',
      status: row.status_code as PlatformEvent['status'],
      time: toTimeLabel(row.scheduled_start_at),
      title: row.title,
      type: row.event_type_code as PlatformEvent['type'],
      visibleToClient: Boolean(row.client_visible_flag),
    }));
  }

  private async fetchDocuments(
    connection: PoolConnection,
    clientAccountId: number,
    clientPublicUserId: string,
    clientName: string
  ): Promise<PlatformDocument[]> {
    const rows = await selectAll<DocumentRow>(
      connection,
      `SELECT
         d.public_id AS document_public_id,
         d.category_code,
         d.visibility_scope_code,
         d.current_version_no,
         dv.id AS version_id,
         dv.original_file_name,
         dv.file_size_bytes,
         dv.checksum_sha256,
         dv.uploaded_at,
         dv.virus_scan_status_code AS review_state,
         uploader.display_name AS uploader_name,
         m.public_id AS matter_public_id,
         m.title AS matter_title
       FROM documents d
       INNER JOIN document_versions dv
         ON dv.document_id = d.id
         AND dv.is_current = 1
       LEFT JOIN users uploader ON uploader.id = dv.uploaded_by_user_id
       LEFT JOIN matter_documents md ON md.document_id = d.id
       LEFT JOIN matters m ON m.id = md.matter_id
       WHERE d.owner_client_account_id = ?
         AND d.archived_at IS NULL
         AND d.visibility_scope_code IN ('client', 'client-portal', 'shared')
       ORDER BY dv.uploaded_at DESC`,
      [clientAccountId]
    );

    return rows.map((row) => ({
      clientId: clientPublicUserId,
      clientName,
      docCategory: row.category_code,
      id: row.document_public_id,
      matterId: row.matter_public_id || '',
      matterTitle: row.matter_title || '',
      name: row.original_file_name,
      reviewState: documentReviewState(
        row.review_state === 'clean' ? 'reviewed' : row.review_state === 'pending' ? 'unreviewed' : 'needs-client-action'
      ),
      size: toAmount(row.file_size_bytes),
      type: row.original_file_name.split('.').slice(-1)[0]?.toUpperCase() || 'BIN',
      uploadedAt: toDateOnly(row.uploaded_at),
      uploadedBy: row.uploader_name || clientName,
      visibility: row.visibility_scope_code === 'internal' ? 'internal' : 'client',
    }));
  }

  private async fetchThreads(
    connection: PoolConnection,
    clientAccountId: number,
    clientPublicUserId: string,
    clientName: string
  ): Promise<MessageThread[]> {
    const rows = await selectAll<ThreadRow>(
      connection,
      `SELECT
         ct.public_id,
         ct.thread_type_code,
         ct.subject,
         ct.status_code,
         (
           SELECT msg.body_text
           FROM messages msg
           WHERE msg.thread_id = ct.id
             AND msg.visible_to_client = 1
             AND msg.deleted_at IS NULL
           ORDER BY msg.sent_at DESC, msg.id DESC
           LIMIT 1
         ) AS last_message_text,
         ct.last_message_at,
         owner.display_name AS assigned_name,
         m.public_id AS matter_public_id,
         m.matter_number,
         m.title AS matter_title,
         m.current_stage_code,
         pur.urgency_code,
         ca.display_name AS client_name,
         (
           SELECT COUNT(*)
           FROM messages msg
           LEFT JOIN message_reads mr
             ON mr.message_id = msg.id
             AND mr.user_id = client_user.id
           WHERE msg.thread_id = ct.id
             AND msg.visible_to_client = 1
             AND (msg.sender_user_id IS NULL OR msg.sender_user_id != client_user.id)
             AND mr.id IS NULL
         ) AS unread_count
       FROM conversation_threads ct
       INNER JOIN client_accounts ca ON ca.id = ct.client_account_id
       INNER JOIN client_account_contacts cac ON cac.client_account_id = ca.id AND cac.is_primary = 1
       INNER JOIN users client_user ON client_user.id = cac.user_id
       LEFT JOIN users owner ON owner.id = ct.assigned_owner_user_id
       LEFT JOIN matters m ON m.id = ct.matter_id
       LEFT JOIN pricing_urgency_rules pur ON pur.id = m.urgency_rule_id
       WHERE ct.client_account_id = ? AND ct.archived_at IS NULL
       ORDER BY ct.last_message_at DESC, ct.created_at DESC`,
      [clientAccountId]
    );

    return rows.map((row) => ({
      assignedTo: row.assigned_name || 'Client Intake Desk',
      clientId: clientPublicUserId,
      clientName: row.client_name || clientName,
      id: row.public_id,
      lastMessage: row.last_message_text || row.subject || 'No messages yet',
      lastMessageAt: row.last_message_at ? toIso(row.last_message_at) : nowUtc(),
      matterId: row.matter_public_id || '',
      matterRef: row.matter_number || '',
      matterTitle: row.matter_title || row.subject || 'General Support',
      stage: (row.current_stage_code || 'request-received') as MessageThread['stage'],
      status: row.status_code as MessageThread['status'],
      unreadCount: Number(row.unread_count || 0),
      urgency: (row.urgency_code || 'standard') as MessageThread['urgency'],
    }));
  }

  private async fetchMessages(
    connection: PoolConnection,
    clientAccountId: number,
    currentUserPublicId: string
  ): Promise<ChatMessage[]> {
    const rows = await selectAll<MessageRow>(
      connection,
      `SELECT
         msg.public_id AS message_public_id,
         ct.public_id AS thread_public_id,
         msg.body_text,
         msg.sent_at,
         CASE
           WHEN msg.sender_system_code IS NOT NULL
             OR (msg.body_text = ? AND msg.sent_at = ct.created_at)
           THEN CONCAT('system:', COALESCE(msg.sender_system_code, 'global_lmg'))
           ELSE COALESCE(sender.public_id, CONCAT('system:', COALESCE(msg.sender_system_code, 'unknown')))
         END AS sender_user_public_id,
         CASE
           WHEN msg.sender_system_code IS NOT NULL
             OR (msg.body_text = ? AND msg.sent_at = ct.created_at)
           THEN 'Global LMG'
           ELSE COALESCE(sender.display_name, cp.full_name, 'System')
         END AS sender_name,
         CASE
           WHEN msg.sender_system_code IS NOT NULL
             OR (msg.body_text = ? AND msg.sent_at = ct.created_at)
           THEN 'system'
           WHEN sender.actor_type_code = 'client' THEN 'client'
           ELSE 'admin'
         END AS sender_role,
         CASE WHEN mr.id IS NOT NULL THEN 1 ELSE 0 END AS is_read,
         GROUP_CONCAT(CONCAT(d.public_id, '\u001F', dv.original_file_name) ORDER BY mdv.sort_order ASC SEPARATOR '\u001E') AS attachment_refs
      FROM messages msg
      INNER JOIN conversation_threads ct ON ct.id = msg.thread_id
      INNER JOIN client_accounts ca ON ca.id = ct.client_account_id
      LEFT JOIN users sender ON sender.id = msg.sender_user_id
      LEFT JOIN counsel_partners cp ON cp.id = msg.sender_counsel_partner_id
      LEFT JOIN message_document_versions mdv ON mdv.message_id = msg.id
      LEFT JOIN document_versions dv ON dv.id = mdv.document_version_id
      LEFT JOIN documents d ON d.id = dv.document_id
      LEFT JOIN users viewer_user ON viewer_user.public_id = ?
      LEFT JOIN message_reads mr
        ON mr.message_id = msg.id
        AND mr.user_id = viewer_user.id
      WHERE ca.id = ?
        AND (msg.visible_to_client = 1 OR msg.sender_user_id = viewer_user.id)
      GROUP BY
        msg.id,
        msg.public_id,
        ct.public_id,
        msg.body_text,
        msg.sent_at,
        sender.public_id,
        sender.display_name,
        cp.full_name,
        sender.actor_type_code,
        msg.sender_system_code,
        ct.created_at,
        mr.id
      ORDER BY msg.sent_at ASC, msg.id ASC`,
      [
        AUTOMATIC_REQUEST_ACKNOWLEDGEMENT,
        AUTOMATIC_REQUEST_ACKNOWLEDGEMENT,
        AUTOMATIC_REQUEST_ACKNOWLEDGEMENT,
        currentUserPublicId,
        clientAccountId,
      ]
    );

    return rows.map((row) => ({
      attachments: parseAttachmentRefs(row.attachment_refs),
      content: row.body_text,
      id: row.message_public_id,
      read: Boolean(row.is_read),
      senderId: row.sender_user_public_id || 'system',
      senderName: row.sender_name || 'System',
      senderRole: row.sender_role as ChatMessage['senderRole'],
      threadId: row.thread_public_id,
      timestamp: toIso(row.sent_at),
    }));
  }

  private async fetchLeads(
    connection: PoolConnection,
    clientAccountId: number,
    currentUserPublicId: string
  ): Promise<Lead[]> {
    const rows = await selectAll<LeadRow>(
      connection,
      `SELECT
         sr.public_id,
         sr.status_code,
         sr.contact_name_snapshot,
         sr.issue_summary,
         sr.consultation_mode_code,
         sr.preferred_start_at,
         sr.preferred_end_at,
         sr.created_at AS request_created_at,
         pur.urgency_code,
         GROUP_CONCAT(s.service_code ORDER BY rs.sort_order SEPARATOR ',') AS selected_services,
         owner.display_name AS owner_name,
         sr.title
       FROM service_requests sr
       INNER JOIN pricing_urgency_rules pur ON pur.id = sr.urgency_rule_id
       LEFT JOIN request_services rs ON rs.service_request_id = sr.id
       LEFT JOIN services s ON s.id = rs.service_id
       LEFT JOIN client_accounts ca ON ca.id = sr.client_account_id
       LEFT JOIN users owner ON owner.id = ca.owner_user_id
       WHERE sr.client_account_id = ? AND sr.archived_at IS NULL AND sr.status_code <> 'converted'
       GROUP BY sr.id
       ORDER BY sr.created_at DESC`,
      [clientAccountId]
    );

    return rows.map((row) => ({
      assignedOwner: row.owner_name || 'Client Intake Desk',
      consultationMode: row.consultation_mode_code as Lead['consultationMode'],
      consultationStatus: row.preferred_start_at ? 'scheduled' : 'not-scheduled',
      createdAt: toIso(row.request_created_at),
      expertiseArea: row.title,
      id: row.public_id,
      issueSummary: row.issue_summary,
      notes: 'Request is in the intake queue.',
      paymentStatus: 'none',
      preferredSlot:
        row.preferred_start_at && row.preferred_end_at
          ? `${toDateOnly(row.preferred_start_at)} ${toTimeLabel(row.preferred_start_at)} - ${toTimeLabel(row.preferred_end_at)}`
          : 'To be confirmed',
      selectedServices: row.selected_services ? row.selected_services.split(',') : [],
      status: row.status_code as Lead['status'],
      urgency: row.urgency_code as Lead['urgency'],
      userId: currentUserPublicId,
    }));
  }

  private async fetchStaff(connection: PoolConnection) {
    const rows = await selectAll<StaffRow>(
      connection,
      `SELECT
         u.public_id,
         u.display_name,
         u.avatar_url,
         sp.job_title,
         sp.employment_status_code,
         manager.display_name AS manager_name,
         COUNT(DISTINCT ma.id) AS active_assignments
       FROM staff_profiles sp
       INNER JOIN users u ON u.id = sp.user_id
       LEFT JOIN users manager ON manager.id = sp.manager_user_id
       LEFT JOIN matter_assignments ma
         ON ma.internal_user_id = u.id
         AND ma.assignment_status_code = 'active'
       GROUP BY u.id, u.public_id, u.display_name, u.avatar_url, sp.job_title, sp.employment_status_code, manager.display_name
       ORDER BY u.display_name ASC`
    );

    return rows.map((row) => ({
      assignedMatters: Number(row.active_assignments || 0),
      avatar: row.avatar_url || '',
      id: row.public_id,
      name: row.display_name,
      role: row.job_title,
      status: row.employment_status_code as 'active' | 'inactive' | 'on-leave',
      teamLead: row.manager_name || 'Unassigned',
      workload: workloadFromCount(Number(row.active_assignments || 0)),
    }));
  }

  private async fetchAdvocates(connection: PoolConnection) {
    const advocates = await selectAll<AdvocateRow>(
      connection,
      `SELECT
         cp.public_id AS counsel_public_id,
         cp.full_name,
         cp.city,
         cp.years_experience,
         cp.availability_status_code,
         COUNT(DISTINCT ma.id) AS active_assignments,
         SUM(ma.fee_agreed_amount) AS fee_agreed_amount,
         SUM(ma.fee_paid_amount) AS fee_paid_amount,
         SUM(ma.fee_due_amount) AS fee_due_amount
       FROM counsel_partners cp
       LEFT JOIN matter_assignments ma
         ON ma.counsel_partner_id = cp.id
         AND ma.assignment_status_code = 'active'
       WHERE cp.archived_at IS NULL
       GROUP BY cp.id, cp.public_id, cp.full_name, cp.city, cp.years_experience, cp.availability_status_code
       ORDER BY cp.full_name ASC`
    );

    if (advocates.length === 0) {
      return [];
    }

    const expertise = await selectAll<AdvocateExpertiseRow>(
      connection,
      `SELECT
         cp.public_id AS counsel_public_id,
         ld.domain_name AS expertise_label
       FROM counsel_partner_expertise cpe
       INNER JOIN counsel_partners cp ON cp.id = cpe.counsel_partner_id
       INNER JOIN legal_domains ld ON ld.id = cpe.legal_domain_id
       ORDER BY ld.domain_name ASC`
    );

    return advocates.map((row) => ({
      activeAssignments: Number(row.active_assignments || 0),
      availability: row.availability_status_code as 'available' | 'busy' | 'unavailable',
      avatar: '',
      expertise: expertise
        .filter((entry) => entry.counsel_public_id === row.counsel_public_id)
        .map((entry) => entry.expertise_label),
      feeAgreed: toAmount(row.fee_agreed_amount),
      feePaid: toAmount(row.fee_paid_amount),
      feePending: toAmount(row.fee_due_amount),
      id: row.counsel_public_id,
      location: row.city,
      name: row.full_name,
      workload: workloadFromCount(Number(row.active_assignments || 0)),
      yearsExperience: Number(row.years_experience || 0),
    }));
  }

  private async fetchAuditEntries(connection: PoolConnection) {
    const rows = await selectAll<AuditRow>(
      connection,
      `SELECT
         ae.public_id,
         COALESCE(actor.display_name, 'System') AS actor_name,
         ae.actor_role_code_snapshot,
         ae.entity_table_name,
         ae.action_label,
         ae.source_module,
         ae.summary_old_value,
         ae.summary_new_value,
         ae.occurred_at,
         NULL AS entity_public_id
       FROM audit_events ae
       LEFT JOIN users actor ON actor.id = ae.actor_user_id
       ORDER BY ae.occurred_at DESC
       LIMIT 100`
    );

    return rows.map((row) => ({
      action: row.action_label,
      actor: row.actor_name || 'System',
      actorRole: row.actor_role_code_snapshot as 'case-manager' | 'billing-admin' | 'ops-admin' | 'client' | 'system',
      entityId: row.entity_public_id || String(row.public_id),
      entityType: row.entity_table_name.replace(/s$/, '') as 'matter' | 'invoice' | 'payment' | 'document' | 'event' | 'user' | 'lead' | 'message',
      id: row.public_id,
      newValue: row.summary_new_value || undefined,
      oldValue: row.summary_old_value || undefined,
      sourceModule: row.source_module,
      timestamp: toIso(row.occurred_at),
    }));
  }
}
