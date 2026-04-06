import { createHash } from 'node:crypto';
import { fromMysqlDateTime, nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { createPublicId } from '../../lib/ids.js';
import { conflict, forbidden, notFound } from '../../lib/httpErrors.js';
import { selectAll, selectOne, withConnection, withTransaction } from '../../lib/mysqlUtils.js';
import { ensurePlatformReady } from '../platform/bootstrap.js';
import { domainEventService } from '../domainEvents/service.js';
import { allocateBusinessNumber } from '../platform/sequences.js';
import { buildStages, createEmptyDashboardSnapshot } from './helpers.js';
const toAmount = (value) => Number(value || 0);
const toDateOnly = (value) => {
    const iso = fromMysqlDateTime(value);
    return iso ? iso.slice(0, 10) : '';
};
const toTimeLabel = (value) => {
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
const toIso = (value) => fromMysqlDateTime(value) || nowUtc();
const workloadFromCount = (count) => {
    if (count >= 4) {
        return 'heavy';
    }
    if (count >= 2) {
        return 'moderate';
    }
    return 'light';
};
const paymentMethodFromProvider = (value) => {
    switch (value) {
        case 'bank-transfer':
        case 'cash':
        case 'cheque':
            return value;
        default:
            return 'online';
    }
};
const paymentStatusToUi = (value) => {
    if (value === 'failed') {
        return 'failed';
    }
    if (value === 'refunded' || value === 'partially-refunded') {
        return 'refunded';
    }
    return 'success';
};
const documentReviewState = (value) => {
    if (value === 'reviewed' || value === 'needs-client-action') {
        return value;
    }
    return 'unreviewed';
};
const hashDocumentChecksum = (name, size) => createHash('sha256').update(`${name}:${size}`).digest('hex');
const splitAttachmentNames = (value) => value
    ? value
        .split('|||')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : undefined;
export class NormalizedDashboardRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async initialize() {
        await ensurePlatformReady();
    }
    async resolveClientContext(connection, userPublicId) {
        const row = await selectOne(connection, `SELECT
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
       LIMIT 1`, [userPublicId]);
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
            },
        };
    }
    async hydrateCurrentClient(connection, userPublicId) {
        const row = await selectOne(connection, `SELECT
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
       LIMIT 1`, [userPublicId]);
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
        };
    }
    async buildSnapshot(connection, currentClient) {
        const context = await this.resolveClientContext(connection, currentClient.id);
        const resolvedCurrentClient = await this.hydrateCurrentClient(connection, currentClient.id);
        const matters = await this.fetchMatters(connection, context.clientAccountId, resolvedCurrentClient);
        const packages = await this.fetchPackages(connection, context.clientAccountId);
        const invoices = await this.fetchInvoices(connection, context.clientAccountId, resolvedCurrentClient.id, resolvedCurrentClient.name);
        const payments = await this.fetchPayments(connection, context.clientAccountId, resolvedCurrentClient.id, resolvedCurrentClient.name);
        const events = await this.fetchEvents(connection, context.clientAccountId, resolvedCurrentClient.id, resolvedCurrentClient.name);
        const documents = await this.fetchDocuments(connection, context.clientAccountId, resolvedCurrentClient.id, resolvedCurrentClient.name);
        const threads = await this.fetchThreads(connection, context.clientAccountId, resolvedCurrentClient.id, resolvedCurrentClient.name);
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
        };
    }
    async getSnapshot(currentClient) {
        await this.initialize();
        return withConnection(this.pool, (connection) => this.buildSnapshot(connection, currentClient));
    }
    async submitRequest(currentClient, request) {
        await this.initialize();
        await withTransaction(this.pool, async (connection) => {
            const context = await this.resolveClientContext(connection, currentClient.id);
            const currentUserRow = await selectOne(connection, 'SELECT id FROM users WHERE public_id = ? LIMIT 1', [currentClient.id]);
            if (!currentUserRow?.id) {
                throw notFound('current_user_not_found', 'Current user could not be resolved.');
            }
            const legalDomainRow = await selectOne(connection, 'SELECT id, domain_name FROM legal_domains WHERE domain_code = ? LIMIT 1', [request.legalDomain]);
            const urgencyRuleRow = await selectOne(connection, 'SELECT id, urgency_code, surcharge_value FROM pricing_urgency_rules WHERE urgency_code = ? LIMIT 1', [request.urgency]);
            const consultationRuleRow = await selectOne(connection, 'SELECT surcharge_value FROM pricing_consultation_mode_rules WHERE consultation_mode_code = ? LIMIT 1', [request.consultationMode]);
            const pricingSlabRow = await selectOne(connection, `SELECT min_service_count, max_service_count, base_amount, per_extra_service_amount
         FROM pricing_service_slabs
         WHERE min_service_count <= ? AND (max_service_count IS NULL OR max_service_count >= ?)
         ORDER BY min_service_count DESC
         LIMIT 1`, [request.services.length, request.services.length]);
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
            const scaledAmount = request.services.length <= 2
                ? baseAmount
                : baseAmount + Math.max(request.services.length - 2, 0) * perExtra;
            const quotedAmount = scaledAmount + consultationSurcharge + urgencySurcharge;
            const title = `${String(legalDomainRow.domain_name)} Request`;
            const summary = request.caseDetails.trim().slice(0, 500);
            const preferredWindow = this.parsePreferredWindow(request.preferredDate, request.preferredTime);
            const currentUserId = Number(currentUserRow.id);
            const ownerUserIdRow = await selectOne(connection, `SELECT owner_user_id
         FROM client_accounts
         WHERE id = ?
         LIMIT 1`, [context.clientAccountId]);
            const ownerUserId = Number(ownerUserIdRow?.owner_user_id || currentUserId);
            const createdAt = toMysqlDateTime(nowUtc());
            const uniqueDocumentUploadIds = [...new Set(request.documentUploadIds.map((value) => value.trim()).filter(Boolean))];
            let requestUploadRows = [];
            if (uniqueDocumentUploadIds.length > 0) {
                const placeholders = uniqueDocumentUploadIds.map(() => '?').join(', ');
                requestUploadRows = await selectAll(connection, `SELECT
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
             AND dui.owner_client_account_id = ?`, [...uniqueDocumentUploadIds, currentUserId, context.clientAccountId]);
                if (requestUploadRows.length !== uniqueDocumentUploadIds.length) {
                    throw forbidden('request_document_forbidden', 'One or more uploaded documents are not available for this request.');
                }
                for (const upload of requestUploadRows) {
                    if (!upload.document_id ||
                        !upload.document_version_id ||
                        !['stored', 'attached'].includes(upload.status_code)) {
                        throw conflict('request_document_not_ready', 'One or more uploaded documents are not ready to be attached yet.');
                    }
                    if (upload.request_public_id ||
                        upload.matter_public_id ||
                        upload.invoice_public_id ||
                        upload.thread_public_id) {
                        throw conflict('request_document_already_linked', 'One or more uploaded documents are already linked to another record.');
                    }
                }
            }
            const [requestInsert] = await connection.execute(`INSERT INTO service_requests (
          public_id, request_number, client_account_id, requested_by_user_id, status_code, title,
          issue_summary, detailed_description, legal_domain_id, consultation_mode_code, urgency_rule_id,
          preferred_start_at, preferred_end_at, contact_name_snapshot, contact_email_snapshot,
          contact_mobile_snapshot, whatsapp_same_as_mobile, past_legal_action_flag, quote_total_amount,
          submitted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
            ]);
            const serviceRequestId = Number(requestInsert.insertId);
            for (const [index, serviceCode] of request.services.entries()) {
                const serviceRow = await selectOne(connection, 'SELECT id FROM services WHERE service_code = ? LIMIT 1', [serviceCode]);
                if (!serviceRow?.id) {
                    continue;
                }
                await connection.execute(`INSERT INTO request_services (
            service_request_id, service_id, sort_order, quoted_base_fee, created_at
          ) VALUES (?, ?, ?, ?, ?)`, [serviceRequestId, Number(serviceRow.id), index + 1, 0, createdAt]);
            }
            const [quoteInsert] = await connection.execute(`INSERT INTO pricing_quotes (
          public_id, service_request_id, version_no, service_count, base_amount, urgency_surcharge_amount,
          consultation_mode_surcharge_amount, discount_amount, tax_amount, total_amount, currency_code,
          is_final, accepted_at, created_by_user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
            ]);
            const quoteId = Number(quoteInsert.insertId);
            const quoteLines = [
                ['service-bundle', null, `${request.services.length} services selected`, 1, scaledAmount, scaledAmount],
                ['urgency', null, `Urgency: ${request.urgency}`, 1, urgencySurcharge, urgencySurcharge],
                ['consultation', null, `Consultation: ${request.consultationMode}`, 1, consultationSurcharge, consultationSurcharge],
            ];
            for (const [index, [lineTypeCode, serviceId, description, quantity, unitAmount, lineAmount]] of quoteLines.entries()) {
                await connection.execute(`INSERT INTO pricing_quote_lines (
            pricing_quote_id, line_type_code, service_id, pricing_rule_source_code, description, quantity,
            unit_amount, line_amount, sort_order, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [quoteId, lineTypeCode, serviceId, 'rule-engine', description, quantity, unitAmount, lineAmount, index + 1, createdAt]);
            }
            await connection.execute(`INSERT INTO request_status_history (
          service_request_id, from_status_code, to_status_code, changed_by_user_id, change_note, changed_at
        ) VALUES (?, ?, ?, ?, ?, ?)`, [serviceRequestId, null, 'new-lead', currentUserId, 'Client request submitted from dashboard.', createdAt]);
            const [matterInsert] = await connection.execute(`INSERT INTO matters (
          public_id, matter_number, service_request_id, client_account_id, opened_by_user_id, legal_domain_id,
          title, issue_summary, detailed_description, current_stage_code, operational_status_code,
          consultation_mode_code, urgency_rule_id, priority_code, quoted_total_amount, paid_total_amount,
          refunded_total_amount, due_total_amount, opened_at, last_activity_at, closed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
            ]);
            const matterId = Number(matterInsert.insertId);
            for (const serviceCode of request.services) {
                const serviceRow = await selectOne(connection, 'SELECT id FROM services WHERE service_code = ? LIMIT 1', [serviceCode]);
                if (!serviceRow?.id) {
                    continue;
                }
                await connection.execute(`INSERT INTO matter_services (
            matter_id, service_id, final_fee, service_status_code, completed_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)`, [matterId, Number(serviceRow.id), 0, 'selected', null, createdAt]);
            }
            await connection.execute(`INSERT INTO matter_stage_history (
          matter_id, stage_code, entered_at, exited_at, changed_by_user_id, visible_to_client, change_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`, [matterId, 'request-received', createdAt, null, currentUserId, 1, 'Matter created from client request.']);
            await connection.execute(`INSERT INTO matter_updates (
          matter_id, update_type_code, title, body_text, visible_to_client, created_by_user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                matterId,
                'note',
                'Request Submitted',
                'Request submitted from the client dashboard. Our intake team is reviewing the details.',
                1,
                ownerUserId,
                createdAt,
            ]);
            await connection.execute(`INSERT INTO matter_updates (
          matter_id, update_type_code, title, body_text, visible_to_client, created_by_user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                matterId,
                'note',
                'Internal Intake Note',
                request.pastLegalAction
                    ? 'Client reported prior legal action in the intake flow.'
                    : 'Client reported no prior legal action.',
                0,
                ownerUserId,
                createdAt,
            ]);
            await connection.execute(`INSERT INTO matter_assignments (
          matter_id, assignment_role_code, internal_user_id, counsel_partner_id, is_primary,
          fee_agreed_amount, fee_paid_amount, fee_due_amount, assigned_by_user_id, assigned_at,
          removed_at, assignment_status_code, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [matterId, 'case_manager', ownerUserId, null, 1, null, null, null, ownerUserId, createdAt, null, 'active', 'Auto-assigned account owner for intake.']);
            const [threadInsert] = await connection.execute(`INSERT INTO conversation_threads (
          public_id, thread_number, thread_type_code, client_account_id, matter_id, subject, status_code,
          created_by_user_id, assigned_owner_user_id, last_message_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                threadPublicId,
                threadNumber,
                'matter',
                context.clientAccountId,
                matterId,
                title,
                'active',
                ownerUserId,
                ownerUserId,
                createdAt,
                createdAt,
                createdAt,
            ]);
            const threadId = Number(threadInsert.insertId);
            await connection.execute(`INSERT INTO thread_participants (
          thread_id, participant_role_code, internal_user_id, client_contact_user_id, counsel_partner_id,
          is_active, joined_at, left_at, last_read_message_id, last_read_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [threadId, 'client', null, currentUserId, null, 1, createdAt, null, null, null]);
            await connection.execute(`INSERT INTO thread_participants (
          thread_id, participant_role_code, internal_user_id, client_contact_user_id, counsel_partner_id,
          is_active, joined_at, left_at, last_read_message_id, last_read_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [threadId, 'staff', ownerUserId, null, null, 1, createdAt, null, null, null]);
            const systemMessage = await connection.execute(`INSERT INTO messages (
          public_id, thread_id, sender_user_id, sender_counsel_partner_id, sender_system_code,
          message_type_code, body_text, visible_to_client, reply_to_message_id, sent_at, edited_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
            ]);
            const systemMessageId = Number(systemMessage[0].insertId);
            await connection.execute(`INSERT INTO message_reads (
          message_id, user_id, read_at
        ) VALUES (?, ?, ?)`, [systemMessageId, currentUserId, createdAt]);
            await connection.execute(`INSERT INTO messages (
          public_id, thread_id, sender_user_id, sender_counsel_partner_id, sender_system_code,
          message_type_code, body_text, visible_to_client, reply_to_message_id, sent_at, edited_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                createPublicId(),
                threadId,
                ownerUserId,
                null,
                null,
                'text',
                'We have received your request. A case manager will confirm the next step shortly.',
                1,
                null,
                createdAt,
                null,
                null,
            ]);
            if (preferredWindow.start && preferredWindow.end) {
                await connection.execute(`INSERT INTO events (
            public_id, client_account_id, matter_id, title, event_type_code, status_code,
            scheduled_start_at, scheduled_end_at, timezone_name, mode_code, location_text,
            meeting_provider_code, external_meeting_id, join_url, host_url, client_visible_flag,
            notes, created_by_user_id, cancelled_by_user_id, created_at, updated_at, cancelled_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
                ]);
            }
            if (requestUploadRows.length > 0) {
                for (const upload of requestUploadRows) {
                    await connection.execute(`INSERT INTO request_documents (
              service_request_id, document_id, link_role_code, created_at
            ) VALUES (?, ?, ?, ?)`, [serviceRequestId, Number(upload.document_id), 'intake', documentTimestamp]);
                    await connection.execute(`INSERT INTO matter_documents (
              matter_id, document_id, link_role_code, created_at
            ) VALUES (?, ?, ?, ?)`, [matterId, Number(upload.document_id), 'client', documentTimestamp]);
                }
                const placeholders = requestUploadRows.map(() => '?').join(', ');
                await connection.execute(`UPDATE document_upload_intents
           SET status_code = 'attached',
               request_public_id = ?,
               matter_public_id = ?
           WHERE public_id IN (${placeholders})`, [serviceRequestPublicId, matterPublicId, ...requestUploadRows.map((upload) => upload.public_id)]);
            }
            else {
                for (const document of request.documents) {
                    const [documentInsert] = await connection.execute(`INSERT INTO documents (
              public_id, document_number, owner_client_account_id, title, category_code,
              visibility_scope_code, current_version_no, created_by_user_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
                    ]);
                    const documentId = Number(documentInsert.insertId);
                    await connection.execute(`INSERT INTO document_versions (
              public_id, document_id, version_no, storage_driver_code, storage_path, original_file_name,
              mime_type, file_extension, file_size_bytes, checksum_sha256, virus_scan_status_code,
              uploaded_by_user_id, uploaded_at, is_current, retention_hold_flag
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
                    ]);
                    await connection.execute(`INSERT INTO request_documents (
              service_request_id, document_id, link_role_code, created_at
            ) VALUES (?, ?, ?, ?)`, [serviceRequestId, documentId, 'intake', documentTimestamp]);
                    await connection.execute(`INSERT INTO matter_documents (
              matter_id, document_id, link_role_code, created_at
            ) VALUES (?, ?, ?, ?)`, [matterId, documentId, 'client', documentTimestamp]);
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
    async sendMessage(currentClient, threadPublicId, content, attachmentUploadIds = []) {
        await this.initialize();
        const trimmedContent = content.trim();
        const uniqueAttachmentUploadIds = [...new Set(attachmentUploadIds.map((value) => value.trim()).filter(Boolean))];
        if (!trimmedContent && uniqueAttachmentUploadIds.length === 0) {
            return this.getSnapshot(currentClient);
        }
        await withTransaction(this.pool, async (connection) => {
            const context = await this.resolveClientContext(connection, currentClient.id);
            const userRow = await selectOne(connection, 'SELECT id FROM users WHERE public_id = ? LIMIT 1', [currentClient.id]);
            if (!userRow?.id) {
                throw notFound('current_user_not_found', 'Current user could not be resolved.');
            }
            const threadRow = await selectOne(connection, `SELECT
           ct.id,
           ct.subject,
           m.title AS matter_title
         FROM conversation_threads ct
         LEFT JOIN matters m
           ON m.id = ct.matter_id
         WHERE ct.public_id = ? AND ct.client_account_id = ?
         LIMIT 1`, [threadPublicId, context.clientAccountId]);
            if (!threadRow?.id) {
                throw forbidden('thread_forbidden', 'You do not have access to this thread.');
            }
            let attachmentRows = [];
            if (uniqueAttachmentUploadIds.length > 0) {
                const placeholders = uniqueAttachmentUploadIds.map(() => '?').join(', ');
                attachmentRows = await selectAll(connection, `SELECT
             dui.public_id,
             dui.thread_public_id,
             dui.document_version_id,
             dui.status_code
           FROM document_upload_intents dui
           WHERE dui.public_id IN (${placeholders})
             AND dui.owner_user_id = ?
             AND dui.owner_client_account_id = ?`, [...uniqueAttachmentUploadIds, Number(userRow.id), context.clientAccountId]);
                if (attachmentRows.length !== uniqueAttachmentUploadIds.length) {
                    throw forbidden('message_attachment_forbidden', 'One or more selected attachments are not available for this thread.');
                }
                for (const attachment of attachmentRows) {
                    if (attachment.thread_public_id !== threadPublicId) {
                        throw forbidden('message_attachment_thread_mismatch', 'Attachments must belong to the active conversation thread.');
                    }
                    if (!attachment.document_version_id || !['stored', 'attached'].includes(attachment.status_code)) {
                        throw conflict('message_attachment_not_ready', 'One or more attachments are not ready to be sent yet.');
                    }
                }
            }
            const createdAt = toMysqlDateTime(nowUtc());
            const messageBody = trimmedContent || 'Attachment shared';
            const [messageInsert] = await connection.execute(`INSERT INTO messages (
          public_id, thread_id, sender_user_id, sender_counsel_partner_id, sender_system_code,
          message_type_code, body_text, visible_to_client, reply_to_message_id, sent_at, edited_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
            ]);
            const messageId = Number(messageInsert.insertId);
            if (attachmentRows.length > 0) {
                for (const [index, attachment] of attachmentRows.entries()) {
                    await connection.execute(`INSERT INTO message_document_versions (
              message_id, document_version_id, sort_order, created_at
            ) VALUES (?, ?, ?, ?)`, [messageId, Number(attachment.document_version_id), index + 1, createdAt]);
                }
                const placeholders = attachmentRows.map(() => '?').join(', ');
                await connection.execute(`UPDATE document_upload_intents
           SET status_code = 'attached'
           WHERE public_id IN (${placeholders})`, attachmentRows.map((attachment) => attachment.public_id));
            }
            await connection.execute(`INSERT INTO message_reads (
          message_id, user_id, read_at
        ) VALUES (?, ?, ?)`, [messageId, Number(userRow.id), createdAt]);
            await connection.execute(`UPDATE conversation_threads
         SET last_message_at = ?, updated_at = ?
         WHERE id = ?`, [createdAt, createdAt, Number(threadRow.id)]);
            await domainEventService.publishThreadMessage(connection, {
                actorRoleCodeSnapshot: 'client',
                actorUserId: Number(userRow.id),
                bodyText: messageBody,
                entityLabel: String(threadRow?.matter_title || threadRow?.subject || 'A new message is waiting in the portal inbox.'),
                notificationTitle: String(threadRow?.matter_title || threadRow?.subject || 'New message'),
                senderUserId: Number(userRow.id),
                sourceModule: 'Client Dashboard',
                threadId: Number(threadRow.id),
            });
        });
        return this.getSnapshot(currentClient);
    }
    parsePreferredWindow(preferredDate, preferredTime) {
        const trimmedDate = preferredDate.trim();
        const trimmedTime = preferredTime.trim();
        if (!trimmedDate || !trimmedTime || !trimmedTime.includes('-')) {
            return { end: undefined, start: undefined };
        }
        const [startLabel, endLabel] = trimmedTime.split('-').map((part) => part.trim());
        const parse = (label) => {
            const [timePart, period] = label.split(' ');
            const [hourRaw, minuteRaw] = timePart.split(':').map((value) => Number(value));
            let hour = hourRaw;
            if (period.toUpperCase() === 'PM' && hour < 12) {
                hour += 12;
            }
            if (period.toUpperCase() === 'AM' && hour === 12) {
                hour = 0;
            }
            return new Date(`${trimmedDate}T${String(hour).padStart(2, '0')}:${String(minuteRaw).padStart(2, '0')}:00.000Z`);
        };
        return {
            end: parse(endLabel),
            start: parse(startLabel),
        };
    }
    async fetchMatters(connection, clientAccountId, currentClient) {
        const matters = await selectAll(connection, `SELECT
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
       ORDER BY m.last_activity_at DESC`, [clientAccountId]);
        if (matters.length === 0) {
            return [];
        }
        const matterIds = matters.map((matter) => matter.id);
        const matterIdPlaceholders = matterIds.map(() => '?').join(', ');
        const assignments = await selectAll(connection, `SELECT
         ma.matter_id,
         ma.assignment_role_code,
         COALESCE(u.display_name, cp.full_name) AS assigned_name,
         ma.fee_agreed_amount,
         ma.fee_paid_amount,
         ma.fee_due_amount
       FROM matter_assignments ma
       LEFT JOIN users u ON u.id = ma.internal_user_id
       LEFT JOIN counsel_partners cp ON cp.id = ma.counsel_partner_id
       WHERE ma.matter_id IN (${matterIdPlaceholders}) AND ma.assignment_status_code = 'active'`, matterIds);
        const services = await selectAll(connection, `SELECT ms.matter_id, s.service_code
       FROM matter_services ms
       INNER JOIN services s ON s.id = ms.service_id
       WHERE ms.matter_id IN (${matterIdPlaceholders})
       ORDER BY ms.created_at ASC`, matterIds);
        const notes = await selectAll(connection, `SELECT matter_id, body_text, visible_to_client
       FROM matter_updates
       WHERE matter_id IN (${matterIdPlaceholders})
       ORDER BY created_at ASC`, matterIds);
        const packageRows = await selectAll(connection, `SELECT matter_id, public_id
       FROM matter_packages
       WHERE matter_id IN (${matterIdPlaceholders}) AND archived_at IS NULL`, matterIds);
        return matters.map((matter) => {
            const matterAssignments = assignments.filter((entry) => entry.matter_id === matter.id);
            const matterServices = services
                .filter((entry) => entry.matter_id === matter.id)
                .map((entry) => entry.service_code);
            const matterNotes = notes.filter((entry) => entry.matter_id === matter.id);
            const matterPackage = packageRows.find((entry) => Number(entry.matter_id) === matter.id);
            return {
                assignedCounsel: matterAssignments.find((entry) => entry.assignment_role_code === 'counsel')?.assigned_name ||
                    undefined,
                assignedStaff: matterAssignments.find((entry) => ['case_manager', 'staff', 'billing_owner'].includes(entry.assignment_role_code))?.assigned_name || undefined,
                clientId: currentClient.id,
                clientName: currentClient.name,
                clientVisibleNotes: matterNotes
                    .filter((entry) => Boolean(entry.visible_to_client))
                    .map((entry) => entry.body_text),
                consultationMode: matter.consultation_mode_code,
                createdAt: toIso(matter.created_at),
                dueAmount: toAmount(matter.due_total_amount),
                expertiseArea: matter.legal_domain_name,
                id: matter.public_id,
                internalNotes: matterNotes
                    .filter((entry) => !Boolean(entry.visible_to_client))
                    .map((entry) => entry.body_text),
                issueSummary: matter.issue_summary,
                lastUpdated: toIso(matter.last_activity_at),
                lifecycleStage: matter.current_stage_code,
                meetingLink: undefined,
                operationalStatus: matter.operational_status_code,
                packageId: matterPackage ? String(matterPackage.public_id) : undefined,
                paidAmount: toAmount(matter.paid_total_amount),
                priority: matter.priority_code,
                referenceCode: matter.matter_number,
                selectedServices: matterServices,
                stages: buildStages(matter.current_stage_code),
                title: matter.title,
                totalFee: toAmount(matter.quoted_total_amount),
                urgency: matter.urgency_code,
            };
        });
    }
    async fetchPackages(connection, clientAccountId) {
        const packages = await selectAll(connection, `SELECT
         mp.id,
         mp.public_id,
         mp.package_name,
         mp.description,
         mp.total_price,
         mp.created_at,
         creator.display_name AS created_by,
         m.public_id AS matter_public_id
       FROM matter_packages mp
       INNER JOIN matters m ON m.id = mp.matter_id
       INNER JOIN users creator ON creator.id = mp.created_by_user_id
       WHERE m.client_account_id = ? AND mp.archived_at IS NULL
       ORDER BY mp.created_at DESC`, [clientAccountId]);
        if (packages.length === 0) {
            return [];
        }
        const services = await selectAll(connection, `SELECT mps.matter_package_id, mp.public_id, s.service_code
       FROM matter_package_services mps
       INNER JOIN matter_packages mp ON mp.id = mps.matter_package_id
       INNER JOIN services s ON s.id = mps.service_id
       WHERE mp.archived_at IS NULL`);
        return packages.map((entry) => ({
            createdAt: toIso(entry.created_at),
            createdBy: entry.created_by,
            description: entry.description || '',
            id: entry.public_id,
            matterId: entry.matter_public_id,
            name: entry.package_name,
            price: toAmount(entry.total_price),
            services: services
                .filter((service) => service.public_id === entry.public_id)
                .map((service) => service.service_code),
        }));
    }
    async fetchInvoices(connection, clientAccountId, clientPublicUserId, clientName) {
        const invoices = await selectAll(connection, `SELECT
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
       ORDER BY i.issue_date DESC`, [clientAccountId]);
        if (invoices.length === 0) {
            return [];
        }
        const invoiceIds = invoices.map((invoice) => invoice.id);
        const placeholders = invoiceIds.map(() => '?').join(', ');
        const lines = await selectAll(connection, `SELECT invoice_id, description, quantity, unit_price AS rate, line_subtotal
       FROM invoice_lines
       WHERE invoice_id IN (${placeholders})
       ORDER BY sort_order ASC, id ASC`, invoiceIds);
        const payments = await selectAll(connection, `SELECT
         pa.invoice_id,
         MAX(pt.captured_at) AS paid_at
       FROM payment_allocations pa
       INNER JOIN payment_transactions pt ON pt.id = pa.payment_transaction_id
       WHERE pa.invoice_id IN (${placeholders})
       GROUP BY pa.invoice_id`, invoiceIds);
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
                .map((line) => ({
                amount: toAmount(line.line_subtotal),
                description: line.description,
                quantity: toAmount(line.quantity),
                rate: toAmount(line.rate),
            })),
            matterId: invoice.matter_public_id || '',
            matterRef: invoice.matter_number || '',
            matterTitle: invoice.matter_title || '',
            paidDate: payments.find((payment) => Number(payment.invoice_id) === invoice.id)?.paid_at
                ? toIso(payments.find((payment) => Number(payment.invoice_id) === invoice.id)?.paid_at)
                : undefined,
            status: invoice.status_code,
            tax: toAmount(invoice.tax_amount),
            totalAmount: toAmount(invoice.total_amount),
        }));
    }
    async fetchPayments(connection, clientAccountId, clientPublicUserId, clientName) {
        const rows = await selectAll(connection, `SELECT
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
       ORDER BY pt.initiated_at DESC`, [clientAccountId]);
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
    async fetchEvents(connection, clientAccountId, clientPublicUserId, clientName) {
        const rows = await selectAll(connection, `SELECT
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
       ORDER BY e.scheduled_start_at ASC`, [clientAccountId]);
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
            mode: row.mode_code,
            notes: row.notes || '',
            status: row.status_code,
            time: toTimeLabel(row.scheduled_start_at),
            title: row.title,
            type: row.event_type_code,
            visibleToClient: Boolean(row.client_visible_flag),
        }));
    }
    async fetchDocuments(connection, clientAccountId, clientPublicUserId, clientName) {
        const rows = await selectAll(connection, `SELECT
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
       WHERE d.owner_client_account_id = ? AND d.archived_at IS NULL
       ORDER BY dv.uploaded_at DESC`, [clientAccountId]);
        return rows.map((row) => ({
            clientId: clientPublicUserId,
            clientName,
            docCategory: row.category_code,
            id: row.document_public_id,
            matterId: row.matter_public_id || '',
            matterTitle: row.matter_title || '',
            name: row.original_file_name,
            reviewState: documentReviewState(row.review_state === 'clean' ? 'reviewed' : row.review_state === 'pending' ? 'unreviewed' : 'needs-client-action'),
            size: toAmount(row.file_size_bytes),
            type: row.original_file_name.split('.').slice(-1)[0]?.toUpperCase() || 'BIN',
            uploadedAt: toDateOnly(row.uploaded_at),
            uploadedBy: row.uploader_name || clientName,
            visibility: row.visibility_scope_code === 'internal' ? 'internal' : 'client',
        }));
    }
    async fetchThreads(connection, clientAccountId, clientPublicUserId, clientName) {
        const rows = await selectAll(connection, `SELECT
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
       ORDER BY ct.last_message_at DESC, ct.created_at DESC`, [clientAccountId]);
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
            stage: (row.current_stage_code || 'request-received'),
            status: row.status_code,
            unreadCount: Number(row.unread_count || 0),
            urgency: (row.urgency_code || 'standard'),
        }));
    }
    async fetchMessages(connection, clientAccountId, currentUserPublicId) {
        const rows = await selectAll(connection, `SELECT
         msg.public_id AS message_public_id,
         ct.public_id AS thread_public_id,
         msg.body_text,
         msg.sent_at,
         sender.public_id AS sender_user_public_id,
         COALESCE(sender.display_name, cp.full_name, 'System') AS sender_name,
         CASE
           WHEN msg.sender_system_code IS NOT NULL THEN 'system'
           WHEN sender.actor_type_code = 'client' THEN 'client'
           ELSE 'admin'
         END AS sender_role,
         CASE WHEN mr.id IS NOT NULL THEN 1 ELSE 0 END AS is_read,
         GROUP_CONCAT(dv.original_file_name ORDER BY mdv.sort_order ASC SEPARATOR '|||') AS attachment_names
      FROM messages msg
      INNER JOIN conversation_threads ct ON ct.id = msg.thread_id
      INNER JOIN client_accounts ca ON ca.id = ct.client_account_id
      LEFT JOIN users sender ON sender.id = msg.sender_user_id
      LEFT JOIN counsel_partners cp ON cp.id = msg.sender_counsel_partner_id
      LEFT JOIN message_document_versions mdv ON mdv.message_id = msg.id
      LEFT JOIN document_versions dv ON dv.id = mdv.document_version_id
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
        mr.id
      ORDER BY msg.sent_at ASC, msg.id ASC`, [currentUserPublicId, clientAccountId]);
        return rows.map((row) => ({
            attachments: splitAttachmentNames(row.attachment_names),
            content: row.body_text,
            id: row.message_public_id,
            read: Boolean(row.is_read),
            senderId: row.sender_user_public_id || 'system',
            senderName: row.sender_name || 'System',
            senderRole: row.sender_role,
            threadId: row.thread_public_id,
            timestamp: toIso(row.sent_at),
        }));
    }
    async fetchLeads(connection, clientAccountId, currentUserPublicId) {
        const rows = await selectAll(connection, `SELECT
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
       ORDER BY sr.created_at DESC`, [clientAccountId]);
        return rows.map((row) => ({
            assignedOwner: row.owner_name || 'Client Intake Desk',
            consultationMode: row.consultation_mode_code,
            consultationStatus: row.preferred_start_at ? 'scheduled' : 'not-scheduled',
            createdAt: toIso(row.request_created_at),
            expertiseArea: row.title,
            id: row.public_id,
            issueSummary: row.issue_summary,
            notes: 'Request is in the intake queue.',
            paymentStatus: 'none',
            preferredSlot: row.preferred_start_at && row.preferred_end_at
                ? `${toDateOnly(row.preferred_start_at)} ${toTimeLabel(row.preferred_start_at)} - ${toTimeLabel(row.preferred_end_at)}`
                : 'To be confirmed',
            selectedServices: row.selected_services ? row.selected_services.split(',') : [],
            status: row.status_code,
            urgency: row.urgency_code,
            userId: currentUserPublicId,
        }));
    }
    async fetchStaff(connection) {
        const rows = await selectAll(connection, `SELECT
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
       ORDER BY u.display_name ASC`);
        return rows.map((row) => ({
            assignedMatters: Number(row.active_assignments || 0),
            avatar: row.avatar_url || '',
            id: row.public_id,
            name: row.display_name,
            role: row.job_title,
            status: row.employment_status_code,
            teamLead: row.manager_name || 'Unassigned',
            workload: workloadFromCount(Number(row.active_assignments || 0)),
        }));
    }
    async fetchAdvocates(connection) {
        const advocates = await selectAll(connection, `SELECT
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
       ORDER BY cp.full_name ASC`);
        if (advocates.length === 0) {
            return [];
        }
        const expertise = await selectAll(connection, `SELECT
         cp.public_id AS counsel_public_id,
         ld.domain_name AS expertise_label
       FROM counsel_partner_expertise cpe
       INNER JOIN counsel_partners cp ON cp.id = cpe.counsel_partner_id
       INNER JOIN legal_domains ld ON ld.id = cpe.legal_domain_id
       ORDER BY ld.domain_name ASC`);
        return advocates.map((row) => ({
            activeAssignments: Number(row.active_assignments || 0),
            availability: row.availability_status_code,
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
    async fetchAuditEntries(connection) {
        const rows = await selectAll(connection, `SELECT
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
       LIMIT 100`);
        return rows.map((row) => ({
            action: row.action_label,
            actor: row.actor_name || 'System',
            actorRole: row.actor_role_code_snapshot,
            entityId: row.entity_public_id || String(row.public_id),
            entityType: row.entity_table_name.replace(/s$/, ''),
            id: row.public_id,
            newValue: row.summary_new_value || undefined,
            oldValue: row.summary_old_value || undefined,
            sourceModule: row.source_module,
            timestamp: toIso(row.occurred_at),
        }));
    }
}
