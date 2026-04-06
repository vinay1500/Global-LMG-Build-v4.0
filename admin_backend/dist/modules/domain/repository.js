import { fromMysqlDateTime, nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { hashPassword } from '../../lib/authCrypto.js';
import { createPublicId } from '../../lib/ids.js';
import { badRequest, conflict, notFound } from '../../lib/httpErrors.js';
import { executeResult, selectAll, selectOne, withConnection, withTransaction } from '../../lib/mysqlUtils.js';
import { ensurePlatformReady } from '../platform/bootstrap.js';
import { domainEventService } from '../domainEvents/service.js';
const INTERNAL_ADMIN_ROLE_CODES = new Set([
    'ops_admin',
    'case_manager',
    'billing_admin',
    'messaging_desk',
    'management_viewer',
]);
const toNumber = (value) => Number(value || 0);
const toIso = (value) => fromMysqlDateTime(value) || '';
const mapMatterSummary = (row) => ({
    clientAccountId: row.client_account_public_id,
    clientName: row.client_display_name,
    consultationModeCode: row.consultation_mode_code,
    currentStageCode: row.current_stage_code,
    currentStageLabel: row.current_stage_label,
    id: row.public_id,
    issueSummary: row.issue_summary,
    lastActivityAt: toIso(row.last_activity_at),
    legalDomainName: row.legal_domain_name,
    matterNumber: row.matter_number,
    openedAt: toIso(row.opened_at),
    operationalStatusCode: row.operational_status_code,
    priorityCode: row.priority_code,
    title: row.title,
    totals: {
        due: toNumber(row.due_total_amount),
        paid: toNumber(row.paid_total_amount),
        quoted: toNumber(row.quoted_total_amount),
        refunded: toNumber(row.refunded_total_amount),
    },
    urgencyCode: row.urgency_code,
});
const mapDocumentVersion = (row) => ({
    checksumSha256: row.checksum_sha256,
    fileExtension: row.file_extension,
    fileSizeBytes: toNumber(row.file_size_bytes),
    id: row.public_id,
    isCurrent: Boolean(row.is_current),
    mimeType: row.mime_type,
    originalFileName: row.original_file_name,
    retentionHoldFlag: Boolean(row.retention_hold_flag),
    uploadedAt: toIso(row.uploaded_at),
    uploadedByUserId: row.uploaded_by_user_public_id,
    versionNo: row.version_no,
    virusScanStatusCode: row.virus_scan_status_code,
});
export class DomainRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async initialize() {
        await ensurePlatformReady();
    }
    async resolveClientAccountId(connection, clientAccountPublicId) {
        const row = await selectOne(connection, 'SELECT id AS client_account_id FROM client_accounts WHERE public_id = ? AND archived_at IS NULL LIMIT 1', [clientAccountPublicId]);
        if (!row?.client_account_id) {
            throw notFound('client_account_not_found', 'Client account not found.');
        }
        return Number(row.client_account_id);
    }
    async resolveMatterId(connection, matterPublicId) {
        const row = await selectOne(connection, 'SELECT id FROM matters WHERE public_id = ? AND archived_at IS NULL LIMIT 1', [matterPublicId]);
        if (!row?.id) {
            throw notFound('matter_not_found', 'Matter not found.');
        }
        return Number(row.id);
    }
    async resolveUserId(connection, userPublicId) {
        const row = await selectOne(connection, 'SELECT id FROM users WHERE public_id = ? AND archived_at IS NULL LIMIT 1', [userPublicId]);
        if (!row?.id) {
            throw notFound('user_not_found', 'User not found.');
        }
        return Number(row.id);
    }
    async resolveCounselId(connection, counselPublicId) {
        const row = await selectOne(connection, 'SELECT id FROM counsel_partners WHERE public_id = ? AND archived_at IS NULL LIMIT 1', [counselPublicId]);
        if (!row?.id) {
            throw notFound('counsel_partner_not_found', 'Counsel partner not found.');
        }
        return Number(row.id);
    }
    async resolveInvoiceId(connection, invoicePublicId) {
        const row = await selectOne(connection, 'SELECT id FROM invoices WHERE public_id = ? AND archived_at IS NULL LIMIT 1', [invoicePublicId]);
        if (!row?.id) {
            throw notFound('invoice_not_found', 'Invoice not found.');
        }
        return Number(row.id);
    }
    async resolvePaymentId(connection, paymentPublicId) {
        const row = await selectOne(connection, 'SELECT id FROM payment_transactions WHERE public_id = ? LIMIT 1', [paymentPublicId]);
        if (!row?.id) {
            throw notFound('payment_not_found', 'Payment not found.');
        }
        return Number(row.id);
    }
    async getMyClientAccount(userPublicId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            const account = await selectOne(connection, `SELECT
           ca.public_id,
           ca.client_code,
           ca.client_type_code,
           ca.legal_name,
           ca.display_name,
           ca.primary_email,
           ca.primary_phone,
           ca.onboarding_status_code,
           ca.account_status_code,
           owner.public_id AS owner_user_public_id
         FROM client_account_contacts cac
         INNER JOIN client_accounts ca
           ON ca.id = cac.client_account_id
           AND ca.archived_at IS NULL
         LEFT JOIN users owner
           ON owner.id = ca.owner_user_id
         INNER JOIN users u
           ON u.id = cac.user_id
         WHERE u.public_id = ?
           AND cac.archived_at IS NULL
         LIMIT 1`, [userPublicId]);
            if (!account) {
                throw notFound('client_account_not_found', 'Client account not found for the current user.');
            }
            return this.getClientAccountByPublicIdInternal(connection, account.public_id);
        });
    }
    async listClientMatters(clientAccountId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.listMattersInternal(connection, clientAccountId));
    }
    async getClientMatter(clientAccountId, matterPublicId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.getMatterInternal(connection, matterPublicId, clientAccountId));
    }
    async listClientDocuments(clientAccountId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.listDocumentsInternal(connection, clientAccountId));
    }
    async getClientDocument(clientAccountId, documentPublicId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.getDocumentInternal(connection, documentPublicId, clientAccountId));
    }
    async listClientEvents(clientAccountId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.listEventsInternal(connection, clientAccountId));
    }
    async listClientInvoices(clientAccountId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.listInvoicesInternal(connection, clientAccountId));
    }
    async getClientInvoice(clientAccountId, invoicePublicId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.getInvoiceInternal(connection, invoicePublicId, clientAccountId));
    }
    async listClientPayments(clientAccountId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.listPaymentsInternal(connection, clientAccountId));
    }
    async listClientRefunds(clientAccountId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.listRefundsInternal(connection, clientAccountId));
    }
    async listClientAccounts() {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            const rows = await selectAll(connection, `SELECT
           ca.public_id,
           ca.client_code,
           ca.client_type_code,
           ca.legal_name,
           ca.display_name,
           ca.primary_email,
           ca.primary_phone,
           ca.onboarding_status_code,
           ca.account_status_code,
           owner.public_id AS owner_user_public_id
         FROM client_accounts ca
         LEFT JOIN users owner
           ON owner.id = ca.owner_user_id
         WHERE ca.archived_at IS NULL
         ORDER BY ca.display_name ASC`);
            return rows.map((row) => ({
                accountStatusCode: row.account_status_code,
                clientCode: row.client_code,
                clientTypeCode: row.client_type_code,
                displayName: row.display_name,
                id: row.public_id,
                legalName: row.legal_name,
                onboardingStatusCode: row.onboarding_status_code,
                ownerUserId: row.owner_user_public_id,
                primaryEmail: row.primary_email,
                primaryPhone: row.primary_phone,
            }));
        });
    }
    async getClientAccountByPublicId(clientAccountPublicId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.getClientAccountByPublicIdInternal(connection, clientAccountPublicId));
    }
    async listCounselPartners() {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            const rows = await selectAll(connection, `SELECT
           cp.public_id,
           cp.counsel_code,
           cp.full_name,
           cp.organization_name,
           cp.email,
           cp.phone,
           cp.primary_jurisdiction,
           cp.city,
           cp.state,
           cp.country_code,
           cp.years_experience,
           cp.availability_status_code,
           cp.partner_status_code,
           invited.public_id AS invited_user_public_id,
           cp.bar_registration_number
         FROM counsel_partners cp
         LEFT JOIN users invited
           ON invited.id = cp.invited_user_id
         WHERE cp.archived_at IS NULL
         ORDER BY cp.full_name ASC`);
            return rows.map((row) => ({
                availabilityStatusCode: row.availability_status_code,
                counselCode: row.counsel_code,
                email: row.email,
                fullName: row.full_name,
                id: row.public_id,
                locationLabel: [row.city, row.state, row.country_code].filter(Boolean).join(', '),
                organizationName: row.organization_name,
                partnerStatusCode: row.partner_status_code,
                phone: row.phone,
                yearsExperience: row.years_experience,
            }));
        });
    }
    async getCounselPartnerByPublicId(counselPublicId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            const row = await selectOne(connection, `SELECT
           cp.public_id,
           cp.counsel_code,
           cp.full_name,
           cp.organization_name,
           cp.email,
           cp.phone,
           cp.primary_jurisdiction,
           cp.city,
           cp.state,
           cp.country_code,
           cp.years_experience,
           cp.availability_status_code,
           cp.partner_status_code,
           invited.public_id AS invited_user_public_id,
           cp.bar_registration_number
         FROM counsel_partners cp
         LEFT JOIN users invited
           ON invited.id = cp.invited_user_id
         WHERE cp.public_id = ?
           AND cp.archived_at IS NULL
         LIMIT 1`, [counselPublicId]);
            if (!row) {
                throw notFound('counsel_partner_not_found', 'Counsel partner not found.');
            }
            const expertise = await selectAll(connection, `SELECT
           ld.domain_code,
           ld.domain_name,
           cpe.proficiency_level_code,
           s.service_code,
           s.service_name,
           cpe.years_experience
         FROM counsel_partner_expertise cpe
         INNER JOIN legal_domains ld
           ON ld.id = cpe.legal_domain_id
         LEFT JOIN services s
           ON s.id = cpe.service_id
         INNER JOIN counsel_partners cp
           ON cp.id = cpe.counsel_partner_id
         WHERE cp.public_id = ?
         ORDER BY ld.sort_order ASC, s.sort_order ASC`, [counselPublicId]);
            return {
                availabilityStatusCode: row.availability_status_code,
                barRegistrationNumber: row.bar_registration_number,
                counselCode: row.counsel_code,
                email: row.email,
                expertise: expertise.map((entry) => ({
                    domainCode: entry.domain_code,
                    domainName: entry.domain_name,
                    proficiencyLevelCode: entry.proficiency_level_code,
                    serviceCode: entry.service_code,
                    serviceName: entry.service_name,
                    yearsExperience: entry.years_experience,
                })),
                fullName: row.full_name,
                id: row.public_id,
                invitedUserId: row.invited_user_public_id,
                locationLabel: [row.city, row.state, row.country_code].filter(Boolean).join(', '),
                organizationName: row.organization_name,
                partnerStatusCode: row.partner_status_code,
                phone: row.phone,
                primaryJurisdiction: row.primary_jurisdiction,
                yearsExperience: row.years_experience,
            };
        });
    }
    async listMatters() {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.listMattersInternal(connection));
    }
    async getMatterByPublicId(matterPublicId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.getMatterInternal(connection, matterPublicId));
    }
    async updateMatterStage(actorUserPublicId, actorRoleCodeSnapshot, matterPublicId, input) {
        await this.initialize();
        return withTransaction(this.pool, async (connection) => {
            const actorUserId = await this.resolveUserId(connection, actorUserPublicId);
            const matterId = await this.resolveMatterId(connection, matterPublicId);
            const matterRow = await selectOne(connection, 'SELECT current_stage_code, title FROM matters WHERE id = ? LIMIT 1', [matterId]);
            const stageExists = await selectOne(connection, 'SELECT code FROM matter_stages WHERE code = ? LIMIT 1', [input.stageCode]);
            if (!stageExists) {
                throw badRequest('matter_stage_invalid', 'Unknown matter stage code.');
            }
            if (input.operationalStatusCode) {
                const statusExists = await selectOne(connection, 'SELECT code FROM matter_operational_statuses WHERE code = ? LIMIT 1', [input.operationalStatusCode]);
                if (!statusExists) {
                    throw badRequest('matter_status_invalid', 'Unknown matter operational status code.');
                }
            }
            const timestamp = toMysqlDateTime(nowUtc());
            await connection.execute(`UPDATE matter_stage_history
         SET exited_at = ?
         WHERE matter_id = ?
           AND exited_at IS NULL`, [timestamp, matterId]);
            await connection.execute(`INSERT INTO matter_stage_history (
          matter_id, stage_code, entered_at, exited_at, changed_by_user_id, visible_to_client, change_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                matterId,
                input.stageCode,
                timestamp,
                null,
                actorUserId,
                input.visibleToClient === false ? 0 : 1,
                input.changeNote?.trim() || null,
            ]);
            await connection.execute(`UPDATE matters
         SET current_stage_code = ?,
             operational_status_code = COALESCE(?, operational_status_code),
             last_activity_at = ?,
             updated_at = ?,
             row_version = row_version + 1
         WHERE id = ?`, [input.stageCode, input.operationalStatusCode || null, timestamp, timestamp, matterId]);
            await connection.execute(`INSERT INTO matter_updates (
          matter_id, update_type_code, title, body_text, visible_to_client, created_by_user_id, created_at, edited_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                matterId,
                'status',
                'Matter stage updated',
                input.changeNote?.trim() || `Stage changed to ${input.stageCode}.`,
                input.visibleToClient === false ? 0 : 1,
                actorUserId,
                timestamp,
                null,
            ]);
            await domainEventService.publishMatterStageChanged(connection, {
                actorRoleCodeSnapshot,
                actorUserId,
                changeNote: input.changeNote?.trim() || null,
                clientVisible: input.visibleToClient !== false,
                matterId,
                stageCode: input.stageCode,
                title: 'Matter stage updated',
            });
            return {
                changeNote: input.changeNote?.trim() || null,
                matterId: matterPublicId,
                previousStageCode: String(matterRow?.current_stage_code || ''),
                stageCode: input.stageCode,
                title: String(matterRow?.title || ''),
            };
        });
    }
    async createMatterAssignment(actorUserPublicId, matterPublicId, input) {
        await this.initialize();
        return withTransaction(this.pool, async (connection) => {
            const actorUserId = await this.resolveUserId(connection, actorUserPublicId);
            const matterId = await this.resolveMatterId(connection, matterPublicId);
            const wantsInternalUser = Boolean(input.internalUserId);
            const wantsCounsel = Boolean(input.counselPartnerId);
            if (wantsInternalUser === wantsCounsel) {
                throw badRequest('assignment_target_invalid', 'Provide exactly one assignment target: internal user or counsel partner.');
            }
            const internalUserId = input.internalUserId
                ? await this.resolveUserId(connection, input.internalUserId)
                : null;
            const counselPartnerId = input.counselPartnerId
                ? await this.resolveCounselId(connection, input.counselPartnerId)
                : null;
            const timestamp = toMysqlDateTime(nowUtc());
            if (input.isPrimary) {
                await connection.execute(`UPDATE matter_assignments
           SET is_primary = 0
           WHERE matter_id = ?
             AND assignment_role_code = ?
             AND removed_at IS NULL`, [matterId, input.assignmentRoleCode]);
            }
            const result = await executeResult(connection, `INSERT INTO matter_assignments (
          matter_id, assignment_role_code, internal_user_id, counsel_partner_id, is_primary,
          fee_agreed_amount, fee_paid_amount, fee_due_amount, assigned_by_user_id,
          assigned_at, removed_at, assignment_status_code, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                matterId,
                input.assignmentRoleCode,
                internalUserId,
                counselPartnerId,
                input.isPrimary ? 1 : 0,
                input.feeAgreedAmount ?? null,
                input.feePaidAmount ?? null,
                input.feeDueAmount ?? null,
                actorUserId,
                timestamp,
                null,
                'active',
                input.notes?.trim() || null,
            ]);
            return {
                assignmentId: Number(result.insertId),
                matterId: matterPublicId,
            };
        });
    }
    async listDocuments() {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.listDocumentsInternal(connection));
    }
    async getDocumentByPublicId(documentPublicId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.getDocumentInternal(connection, documentPublicId));
    }
    async listEvents() {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.listEventsInternal(connection));
    }
    async getEventByPublicId(eventPublicId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            const row = await selectOne(connection, `SELECT
           e.public_id,
           ca.public_id AS client_account_public_id,
           e.title,
           e.event_type_code AS type_code,
           e.status_code,
           e.scheduled_start_at,
           e.scheduled_end_at,
           e.timezone_name,
           e.mode_code,
           e.location_text,
           e.meeting_provider_code,
           e.join_url,
           e.host_url,
           e.client_visible_flag,
           e.notes,
           e.cancelled_at,
           cancelled_by.public_id AS cancelled_by_user_public_id,
           m.public_id AS matter_public_id,
           m.title AS matter_title
         FROM events e
         INNER JOIN client_accounts ca
           ON ca.id = e.client_account_id
         LEFT JOIN matters m
           ON m.id = e.matter_id
         LEFT JOIN users cancelled_by
           ON cancelled_by.id = e.cancelled_by_user_id
         WHERE e.public_id = ?
         LIMIT 1`, [eventPublicId]);
            if (!row) {
                throw notFound('event_not_found', 'Event not found.');
            }
            const participants = await selectAll(connection, `SELECT
           ep.id,
           ep.participant_role_code,
           ep.rsvp_status_code,
           ep.attendance_status_code,
           ep.joined_at,
           ep.left_at,
           internal_user.public_id AS internal_user_public_id,
           client_user.public_id AS client_contact_user_public_id,
           counsel.public_id AS counsel_partner_public_id,
           COALESCE(internal_user.display_name, client_user.display_name, counsel.full_name) AS display_name
         FROM event_participants ep
         LEFT JOIN users internal_user
           ON internal_user.id = ep.internal_user_id
         LEFT JOIN users client_user
           ON client_user.id = ep.client_contact_user_id
         LEFT JOIN counsel_partners counsel
           ON counsel.id = ep.counsel_partner_id
         INNER JOIN events e
           ON e.id = ep.event_id
         WHERE e.public_id = ?
         ORDER BY ep.id ASC`, [eventPublicId]);
            return {
                cancelledAt: row.cancelled_at ? toIso(row.cancelled_at) : null,
                cancelledByUserId: row.cancelled_by_user_public_id,
                clientAccountId: row.client_account_public_id,
                clientVisibleFlag: Boolean(row.client_visible_flag),
                hostUrl: row.host_url,
                id: row.public_id,
                joinUrl: row.join_url,
                locationText: row.location_text,
                matterId: row.matter_public_id,
                matterTitle: row.matter_title,
                meetingProviderCode: row.meeting_provider_code,
                modeCode: row.mode_code,
                notes: row.notes,
                participants: participants.map((entry) => ({
                    attendanceStatusCode: entry.attendance_status_code,
                    id: entry.id,
                    joinedAt: entry.joined_at ? toIso(entry.joined_at) : null,
                    leftAt: entry.left_at ? toIso(entry.left_at) : null,
                    name: entry.display_name,
                    participantId: entry.internal_user_public_id ||
                        entry.client_contact_user_public_id ||
                        entry.counsel_partner_public_id ||
                        '',
                    participantRoleCode: entry.participant_role_code,
                    participantType: entry.internal_user_public_id
                        ? 'internal_user'
                        : entry.client_contact_user_public_id
                            ? 'client_contact'
                            : 'counsel_partner',
                    rsvpStatusCode: entry.rsvp_status_code,
                })),
                scheduledEndAt: toIso(row.scheduled_end_at),
                scheduledStartAt: toIso(row.scheduled_start_at),
                statusCode: row.status_code,
                timezoneName: row.timezone_name,
                title: row.title,
                typeCode: row.type_code,
            };
        });
    }
    async createEvent(actorUserPublicId, actorRoleCodeSnapshot, input) {
        await this.initialize();
        return withTransaction(this.pool, async (connection) => {
            const actorUserId = await this.resolveUserId(connection, actorUserPublicId);
            const clientAccountId = await this.resolveClientAccountId(connection, input.clientAccountId);
            const matterId = input.matterId ? await this.resolveMatterId(connection, input.matterId) : null;
            const timestamp = toMysqlDateTime(nowUtc());
            const result = await executeResult(connection, `INSERT INTO events (
          public_id, client_account_id, matter_id, title, event_type_code, status_code, scheduled_start_at,
          scheduled_end_at, timezone_name, mode_code, location_text, meeting_provider_code,
          external_meeting_id, join_url, host_url, client_visible_flag, notes, created_by_user_id,
          cancelled_by_user_id, created_at, updated_at, cancelled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                createPublicId(),
                clientAccountId,
                matterId,
                input.title.trim(),
                input.typeCode,
                input.statusCode?.trim() || 'upcoming',
                toMysqlDateTime(input.scheduledStartAt),
                toMysqlDateTime(input.scheduledEndAt),
                input.timezoneName?.trim() || 'Asia/Kolkata',
                input.modeCode,
                input.locationText?.trim() || null,
                input.meetingProviderCode?.trim() || 'none',
                null,
                input.joinUrl?.trim() || null,
                null,
                input.clientVisibleFlag === false ? 0 : 1,
                input.notes?.trim() || null,
                actorUserId,
                null,
                timestamp,
                timestamp,
                null,
            ]);
            const eventId = Number(result.insertId);
            for (const participant of input.participants || []) {
                const internalUserId = participant.internalUserId
                    ? await this.resolveUserId(connection, participant.internalUserId)
                    : null;
                const clientContactUserId = participant.clientContactUserId
                    ? await this.resolveUserId(connection, participant.clientContactUserId)
                    : null;
                const counselPartnerId = participant.counselPartnerId
                    ? await this.resolveCounselId(connection, participant.counselPartnerId)
                    : null;
                const targetCount = [internalUserId, clientContactUserId, counselPartnerId].filter(Boolean).length;
                if (targetCount !== 1) {
                    throw badRequest('event_participant_invalid', 'Each participant must reference exactly one internal user, client contact, or counsel partner.');
                }
                await connection.execute(`INSERT INTO event_participants (
            event_id, participant_role_code, internal_user_id, client_contact_user_id, counsel_partner_id,
            rsvp_status_code, attendance_status_code, joined_at, left_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    eventId,
                    participant.participantRoleCode,
                    internalUserId,
                    clientContactUserId,
                    counselPartnerId,
                    participant.rsvpStatusCode?.trim() || 'pending',
                    'scheduled',
                    null,
                    null,
                    timestamp,
                ]);
            }
            const eventPublicId = await selectOne(connection, 'SELECT public_id FROM events WHERE id = ? LIMIT 1', [eventId]);
            await domainEventService.publishEventScheduled(connection, {
                actorRoleCodeSnapshot,
                actorUserId,
                clientVisibleFlag: input.clientVisibleFlag !== false,
                eventId,
                matterId,
                title: input.title.trim(),
            });
            return {
                eventId: String(eventPublicId?.public_id || ''),
            };
        });
    }
    async listInvoices() {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.listInvoicesInternal(connection));
    }
    async getInvoiceByPublicId(invoicePublicId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.getInvoiceInternal(connection, invoicePublicId));
    }
    async listPayments() {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.listPaymentsInternal(connection));
    }
    async listRefunds() {
        await this.initialize();
        return withConnection(this.pool, async (connection) => this.listRefundsInternal(connection));
    }
    async createRefund(actorUserPublicId, actorRoleCodeSnapshot, input) {
        await this.initialize();
        return withTransaction(this.pool, async (connection) => {
            const actorUserId = await this.resolveUserId(connection, actorUserPublicId);
            const paymentId = await this.resolvePaymentId(connection, input.paymentId);
            const invoiceId = input.invoiceId
                ? await this.resolveInvoiceId(connection, input.invoiceId)
                : null;
            const payment = await selectOne(connection, 'SELECT gross_amount FROM payment_transactions WHERE id = ? LIMIT 1', [paymentId]);
            if (invoiceId) {
                const paymentInvoiceMatch = await selectOne(connection, `SELECT pa.invoice_id
           FROM payment_allocations pa
           WHERE pa.payment_transaction_id = ?
             AND pa.invoice_id = ?
           LIMIT 1`, [paymentId, invoiceId]);
                if (!paymentInvoiceMatch?.invoice_id) {
                    throw conflict('refund_invoice_payment_mismatch', 'The selected invoice is not linked to the payment being refunded.');
                }
            }
            const alreadyRefunded = await selectOne(connection, 'SELECT COALESCE(SUM(amount), 0) AS count FROM refunds WHERE payment_transaction_id = ?', [paymentId]);
            const requestedAmount = Number(input.amount);
            if (requestedAmount <= 0) {
                throw badRequest('refund_amount_invalid', 'Refund amount must be greater than zero.');
            }
            if (requestedAmount + Number(alreadyRefunded?.count || 0) > toNumber(payment?.gross_amount || 0)) {
                throw conflict('refund_amount_exceeds_payment', 'Refund amount exceeds the captured payment total.');
            }
            const timestamp = toMysqlDateTime(nowUtc());
            const result = await executeResult(connection, `INSERT INTO refunds (
          public_id, payment_transaction_id, invoice_id, amount, refund_status_code, reason_text,
          gateway_refund_ref, requested_by_user_id, approved_by_user_id, requested_at,
          completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                createPublicId(),
                paymentId,
                invoiceId,
                requestedAmount,
                'requested',
                input.reasonText.trim(),
                null,
                actorUserId,
                null,
                timestamp,
                null,
                timestamp,
                timestamp,
            ]);
            await domainEventService.publishRefundRequested(connection, {
                actorRoleCodeSnapshot,
                actorUserId,
                amount: requestedAmount,
                invoiceId,
                paymentId,
                refundId: Number(result.insertId),
            });
            return {
                refundId: Number(result.insertId),
            };
        });
    }
    async listRoles() {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            const rows = await selectAll(connection, `SELECT code, name, description, is_system, is_active
         FROM roles
         ORDER BY name ASC`);
            return rows.map((row) => ({
                code: row.code,
                description: row.description,
                isActive: Boolean(row.is_active),
                isSystem: Boolean(row.is_system),
                name: row.name,
            }));
        });
    }
    async listPermissions() {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            const rows = await selectAll(connection, `SELECT code, module_name, action_name, description
         FROM permissions
         ORDER BY module_name ASC, action_name ASC`);
            return rows.map((row) => ({
                actionName: row.action_name,
                code: row.code,
                description: row.description,
                moduleName: row.module_name,
            }));
        });
    }
    async listUsersWithRoles() {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            const rows = await selectAll(connection, `SELECT
           u.public_id,
           u.display_name,
           u.email,
           u.actor_type_code,
           u.account_status_code,
           u.login_enabled,
           u.last_login_at,
           u.archived_at,
           uc.must_rotate_password,
           uc.password_changed_at,
           GROUP_CONCAT(DISTINCT ur.role_code ORDER BY ur.role_code SEPARATOR ',') AS role_codes
         FROM users u
         LEFT JOIN user_credentials uc
           ON uc.user_id = u.id
         LEFT JOIN user_roles ur
           ON ur.user_id = u.id
           AND ur.is_active = 1
           AND (ur.starts_at IS NULL OR ur.starts_at <= UTC_TIMESTAMP(6))
           AND (ur.ends_at IS NULL OR ur.ends_at > UTC_TIMESTAMP(6))
         WHERE u.archived_at IS NULL
         GROUP BY
           u.id,
           u.public_id,
           u.display_name,
           u.email,
           u.actor_type_code,
           u.account_status_code,
           u.login_enabled,
           u.last_login_at,
           u.archived_at,
           uc.must_rotate_password,
           uc.password_changed_at
         ORDER BY u.display_name ASC`);
            return rows.map((row) => ({
                accountStatusCode: row.account_status_code,
                actorTypeCode: row.actor_type_code,
                archivedAt: toIso(row.archived_at),
                displayName: row.display_name,
                email: row.email,
                id: row.public_id,
                lastLoginAt: toIso(row.last_login_at),
                loginEnabled: Boolean(row.login_enabled),
                mustRotatePassword: Boolean(row.must_rotate_password),
                passwordChangedAt: toIso(row.password_changed_at),
                roleCodes: row.role_codes ? row.role_codes.split(',').filter(Boolean) : [],
            }));
        });
    }
    async createAdminUser(actorUserPublicId, input) {
        await this.initialize();
        return withTransaction(this.pool, async (connection) => {
            const actorUserId = await this.resolveUserId(connection, actorUserPublicId);
            const email = input.email.trim().toLowerCase();
            const displayName = input.displayName.trim();
            const roleCodes = Array.from(new Set(input.roleCodes.map((entry) => entry.trim()).filter(Boolean)));
            if (!displayName) {
                throw badRequest('admin_display_name_required', 'Display name is required.');
            }
            if (roleCodes.length === 0) {
                throw badRequest('role_codes_required', 'At least one role code must be supplied.');
            }
            if (!roleCodes.every((roleCode) => INTERNAL_ADMIN_ROLE_CODES.has(roleCode))) {
                throw badRequest('admin_role_invalid', 'Only internal admin roles can be assigned here.');
            }
            const existingUser = await selectOne(connection, 'SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
            if (existingUser?.id) {
                throw conflict('admin_email_exists', 'An account with this email already exists.');
            }
            const validRoles = await selectAll(connection, `SELECT code
         FROM roles
         WHERE code IN (${roleCodes.map(() => '?').join(', ')})
           AND is_active = 1`, roleCodes);
            if (validRoles.length !== roleCodes.length) {
                throw badRequest('role_code_invalid', 'One or more requested role codes are invalid.');
            }
            const [firstName, ...remainingNameParts] = displayName.split(/\s+/g);
            const lastName = remainingNameParts.join(' ') || null;
            const timestamp = toMysqlDateTime(nowUtc());
            const passwordHash = await hashPassword(input.password);
            const userPublicId = createPublicId();
            const insert = await executeResult(connection, `INSERT INTO users (
          public_id,
          email,
          phone,
          display_name,
          first_name,
          last_name,
          actor_type_code,
          account_status_code,
          timezone_name,
          locale_code,
          avatar_url,
          login_enabled,
          last_login_at,
          email_verified_at,
          phone_verified_at,
          created_at,
          updated_at,
          archived_at,
          row_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                userPublicId,
                email,
                null,
                displayName,
                firstName || 'Admin',
                lastName,
                'internal_user',
                'active',
                'Asia/Kolkata',
                'en-IN',
                null,
                1,
                null,
                timestamp,
                null,
                timestamp,
                timestamp,
                null,
                1,
            ]);
            const userId = Number(insert.insertId);
            await connection.execute(`INSERT INTO user_credentials (
          user_id,
          password_hash,
          password_algo,
          password_changed_at,
          must_rotate_password
        ) VALUES (?, ?, ?, ?, ?)`, [
                userId,
                passwordHash,
                'scrypt',
                timestamp,
                input.requirePasswordRotation === false ? 0 : 1,
            ]);
            for (const roleCode of roleCodes) {
                await connection.execute(`INSERT INTO user_roles (
            user_id, role_code, granted_by_user_id, starts_at, ends_at, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [userId, roleCode, actorUserId, timestamp, null, 1, timestamp, timestamp]);
            }
            await connection.execute(`INSERT INTO audit_events (
          public_id, actor_user_id, actor_role_code_snapshot, entity_table_name, entity_pk, action_code,
          action_label, source_module, request_correlation_id, ip_address, user_agent, summary_old_value,
          summary_new_value, occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                createPublicId(),
                actorUserId,
                'ops_admin',
                'users',
                userId,
                'admin_user_created',
                'Admin user created',
                'Admin RBAC',
                null,
                null,
                null,
                null,
                `${displayName} · ${email}`,
                timestamp,
            ]);
            return this.listUsersWithRoles();
        });
    }
    async replaceUserRoles(actorUserPublicId, userPublicId, input) {
        await this.initialize();
        return withTransaction(this.pool, async (connection) => {
            const actorUserId = await this.resolveUserId(connection, actorUserPublicId);
            const targetUserId = await this.resolveUserId(connection, userPublicId);
            const requestedRoleCodes = Array.from(new Set(input.roleCodes.map((entry) => entry.trim()).filter(Boolean)));
            if (requestedRoleCodes.length === 0) {
                throw badRequest('role_codes_required', 'At least one role code must be supplied.');
            }
            const validRoles = await selectAll(connection, `SELECT code, name, description, is_system, is_active
         FROM roles
         WHERE code IN (${requestedRoleCodes.map(() => '?').join(', ')})`, requestedRoleCodes);
            if (validRoles.length !== requestedRoleCodes.length) {
                throw badRequest('role_code_invalid', 'One or more requested role codes are invalid.');
            }
            const timestamp = toMysqlDateTime(nowUtc());
            await connection.execute(`UPDATE user_roles
         SET is_active = 0,
             ends_at = COALESCE(ends_at, ?),
             updated_at = ?
         WHERE user_id = ?
           AND is_active = 1
           AND role_code NOT IN (${requestedRoleCodes.map(() => '?').join(', ')})`, [timestamp, timestamp, targetUserId, ...requestedRoleCodes]);
            for (const roleCode of requestedRoleCodes) {
                const existingActive = await selectOne(connection, `SELECT id
           FROM user_roles
           WHERE user_id = ?
             AND role_code = ?
             AND is_active = 1
           LIMIT 1`, [targetUserId, roleCode]);
                if (existingActive?.id) {
                    continue;
                }
                await connection.execute(`INSERT INTO user_roles (
            user_id, role_code, granted_by_user_id, starts_at, ends_at, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [targetUserId, roleCode, actorUserId, timestamp, null, 1, timestamp, timestamp]);
            }
            return this.listUsersWithRoles();
        });
    }
    async resetAdminUserPassword(actorUserPublicId, userPublicId, input) {
        await this.initialize();
        return withTransaction(this.pool, async (connection) => {
            const actorUserId = await this.resolveUserId(connection, actorUserPublicId);
            const targetUserId = await this.resolveUserId(connection, userPublicId);
            const timestamp = toMysqlDateTime(nowUtc());
            const passwordHash = await hashPassword(input.newPassword);
            await connection.execute(`UPDATE user_credentials
         SET password_hash = ?,
             password_algo = 'scrypt',
             password_changed_at = ?,
             must_rotate_password = ?
         WHERE user_id = ?`, [
                passwordHash,
                timestamp,
                input.requirePasswordRotation === false ? 0 : 1,
                targetUserId,
            ]);
            await connection.execute(`UPDATE user_sessions
         SET revoked_at = ?,
             updated_at = ?
         WHERE user_id = ?
           AND revoked_at IS NULL`, [timestamp, timestamp, targetUserId]);
            await connection.execute(`INSERT INTO audit_events (
          public_id, actor_user_id, actor_role_code_snapshot, entity_table_name, entity_pk, action_code,
          action_label, source_module, request_correlation_id, ip_address, user_agent, summary_old_value,
          summary_new_value, occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                createPublicId(),
                actorUserId,
                'ops_admin',
                'users',
                targetUserId,
                'admin_password_reset',
                'Admin password reset',
                'Admin RBAC',
                null,
                null,
                null,
                null,
                userPublicId,
                timestamp,
            ]);
            return this.listUsersWithRoles();
        });
    }
    async updateAdminUserAccess(actorUserPublicId, userPublicId, input) {
        await this.initialize();
        return withTransaction(this.pool, async (connection) => {
            const actorUserId = await this.resolveUserId(connection, actorUserPublicId);
            const targetUserId = await this.resolveUserId(connection, userPublicId);
            const currentUser = await selectOne(connection, `SELECT login_enabled, account_status_code, archived_at
         FROM users
         WHERE id = ?
         LIMIT 1`, [targetUserId]);
            if (!currentUser) {
                throw notFound('admin_user_not_found', 'Admin user could not be resolved.');
            }
            const timestamp = toMysqlDateTime(nowUtc());
            const loginEnabled = typeof input.loginEnabled === 'boolean'
                ? input.loginEnabled
                : Boolean(currentUser.login_enabled);
            const archivedAt = input.archived === true
                ? timestamp
                : input.archived === false
                    ? null
                    : currentUser.archived_at || null;
            const accountStatusCode = input.accountStatusCode?.trim() ||
                (archivedAt ? 'archived' : String(currentUser.account_status_code));
            await connection.execute(`UPDATE users
         SET login_enabled = ?,
             account_status_code = ?,
             archived_at = ?,
             updated_at = ?,
             row_version = row_version + 1
         WHERE id = ?`, [loginEnabled ? 1 : 0, accountStatusCode, archivedAt, timestamp, targetUserId]);
            if (!loginEnabled || archivedAt) {
                await connection.execute(`UPDATE user_sessions
           SET revoked_at = ?,
               updated_at = ?
           WHERE user_id = ?
             AND revoked_at IS NULL`, [timestamp, timestamp, targetUserId]);
            }
            await connection.execute(`INSERT INTO audit_events (
          public_id, actor_user_id, actor_role_code_snapshot, entity_table_name, entity_pk, action_code,
          action_label, source_module, request_correlation_id, ip_address, user_agent, summary_old_value,
          summary_new_value, occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                createPublicId(),
                actorUserId,
                'ops_admin',
                'users',
                targetUserId,
                'admin_user_access_updated',
                'Admin user access updated',
                'Admin RBAC',
                null,
                null,
                null,
                JSON.stringify({
                    accountStatusCode: currentUser.account_status_code,
                    archivedAt: currentUser.archived_at,
                    loginEnabled: Boolean(currentUser.login_enabled),
                }),
                JSON.stringify({
                    accountStatusCode,
                    archivedAt,
                    loginEnabled,
                }),
                timestamp,
            ]);
            return this.listUsersWithRoles();
        });
    }
    async getClientAccountByPublicIdInternal(connection, clientAccountPublicId) {
        const account = await selectOne(connection, `SELECT
         ca.public_id,
         ca.client_code,
         ca.client_type_code,
         ca.legal_name,
         ca.display_name,
         ca.primary_email,
         ca.primary_phone,
         ca.onboarding_status_code,
         ca.account_status_code,
         owner.public_id AS owner_user_public_id
       FROM client_accounts ca
       LEFT JOIN users owner
         ON owner.id = ca.owner_user_id
       WHERE ca.public_id = ?
         AND ca.archived_at IS NULL
       LIMIT 1`, [clientAccountPublicId]);
        if (!account) {
            throw notFound('client_account_not_found', 'Client account not found.');
        }
        const contacts = await selectAll(connection, `SELECT
         u.public_id,
         u.display_name,
         u.email,
         u.phone,
         cac.contact_role_code,
         cac.is_primary,
         cac.is_billing,
         cac.portal_access_enabled
       FROM client_account_contacts cac
       INNER JOIN users u
         ON u.id = cac.user_id
       INNER JOIN client_accounts ca
         ON ca.id = cac.client_account_id
       WHERE ca.public_id = ?
         AND cac.archived_at IS NULL
       ORDER BY cac.is_primary DESC, u.display_name ASC`, [clientAccountPublicId]);
        const addresses = await selectAll(connection, `SELECT
         id, address_type_code, line1, line2, city, state, postal_code, country_code, is_primary
       FROM client_addresses
       WHERE client_account_id = (
         SELECT id FROM client_accounts WHERE public_id = ? LIMIT 1
       )
         AND archived_at IS NULL
       ORDER BY is_primary DESC, id ASC`, [clientAccountPublicId]);
        const matterCount = await selectOne(connection, `SELECT COUNT(*) AS count
       FROM matters
       WHERE client_account_id = (
         SELECT id FROM client_accounts WHERE public_id = ? LIMIT 1
       )
         AND archived_at IS NULL`, [clientAccountPublicId]);
        return {
            accountStatusCode: account.account_status_code,
            addresses: addresses.map((row) => ({
                addressTypeCode: row.address_type_code,
                city: row.city,
                countryCode: row.country_code,
                id: row.id,
                isPrimary: Boolean(row.is_primary),
                line1: row.line1,
                line2: row.line2,
                postalCode: row.postal_code,
                state: row.state,
            })),
            clientCode: account.client_code,
            clientTypeCode: account.client_type_code,
            contacts: contacts.map((row) => ({
                contactRoleCode: row.contact_role_code,
                email: row.email,
                id: row.public_id,
                isBilling: Boolean(row.is_billing),
                isPrimary: Boolean(row.is_primary),
                name: row.display_name,
                phone: row.phone,
                portalAccessEnabled: Boolean(row.portal_access_enabled),
            })),
            displayName: account.display_name,
            id: account.public_id,
            legalName: account.legal_name,
            matterCount: Number(matterCount?.count || 0),
            onboardingStatusCode: account.onboarding_status_code,
            ownerUserId: account.owner_user_public_id,
            primaryEmail: account.primary_email,
            primaryPhone: account.primary_phone,
        };
    }
    async listMattersInternal(connection, clientAccountId) {
        const rows = await selectAll(connection, `SELECT
         m.public_id,
         m.matter_number,
         m.title,
         m.issue_summary,
         m.detailed_description,
         ld.domain_name AS legal_domain_name,
         ca.public_id AS client_account_public_id,
         ca.display_name AS client_display_name,
         m.current_stage_code,
         ms.label AS current_stage_label,
         m.operational_status_code,
         m.consultation_mode_code,
         pur.urgency_code,
         m.priority_code,
         m.quoted_total_amount,
         m.paid_total_amount,
         m.refunded_total_amount,
         m.due_total_amount,
         m.opened_at,
         m.last_activity_at
       FROM matters m
       INNER JOIN client_accounts ca
         ON ca.id = m.client_account_id
       INNER JOIN legal_domains ld
         ON ld.id = m.legal_domain_id
       INNER JOIN matter_stages ms
         ON ms.code = m.current_stage_code
       INNER JOIN pricing_urgency_rules pur
         ON pur.id = m.urgency_rule_id
       WHERE m.archived_at IS NULL
         ${clientAccountId ? 'AND m.client_account_id = ?' : ''}
       ORDER BY m.last_activity_at DESC`, clientAccountId ? [clientAccountId] : []);
        return rows.map(mapMatterSummary);
    }
    async getMatterInternal(connection, matterPublicId, clientAccountId) {
        const row = await selectOne(connection, `SELECT
         m.public_id,
         m.matter_number,
         m.title,
         m.issue_summary,
         m.detailed_description,
         ld.domain_name AS legal_domain_name,
         ca.public_id AS client_account_public_id,
         ca.display_name AS client_display_name,
         m.current_stage_code,
         ms.label AS current_stage_label,
         m.operational_status_code,
         m.consultation_mode_code,
         pur.urgency_code,
         m.priority_code,
         m.quoted_total_amount,
         m.paid_total_amount,
         m.refunded_total_amount,
         m.due_total_amount,
         m.opened_at,
         m.last_activity_at
       FROM matters m
       INNER JOIN client_accounts ca
         ON ca.id = m.client_account_id
       INNER JOIN legal_domains ld
         ON ld.id = m.legal_domain_id
       INNER JOIN matter_stages ms
         ON ms.code = m.current_stage_code
       INNER JOIN pricing_urgency_rules pur
         ON pur.id = m.urgency_rule_id
       WHERE m.public_id = ?
         AND m.archived_at IS NULL
         ${clientAccountId ? 'AND m.client_account_id = ?' : ''}
       LIMIT 1`, clientAccountId ? [matterPublicId, clientAccountId] : [matterPublicId]);
        if (!row) {
            throw notFound('matter_not_found', 'Matter not found.');
        }
        const services = await selectAll(connection, `SELECT
         s.service_code,
         s.service_name,
         ms.final_fee,
         ms.service_status_code,
         ms.completed_at
       FROM matter_services ms
       INNER JOIN services s
         ON s.id = ms.service_id
       INNER JOIN matters m
         ON m.id = ms.matter_id
       WHERE m.public_id = ?
       ORDER BY s.sort_order ASC`, [matterPublicId]);
        const assignments = await selectAll(connection, `SELECT
         ma.id,
         ma.assignment_role_code,
         ma.is_primary,
         ma.fee_agreed_amount,
         ma.fee_paid_amount,
         ma.fee_due_amount,
         ma.assigned_at,
         ma.removed_at,
         ma.assignment_status_code,
         internal_user.public_id AS internal_user_public_id,
         counsel.public_id AS counsel_partner_public_id,
         assigned_by.public_id AS assigned_by_user_public_id,
         COALESCE(internal_user.display_name, counsel.full_name) AS assigned_name
       FROM matter_assignments ma
       LEFT JOIN users internal_user
         ON internal_user.id = ma.internal_user_id
       LEFT JOIN counsel_partners counsel
         ON counsel.id = ma.counsel_partner_id
       INNER JOIN users assigned_by
         ON assigned_by.id = ma.assigned_by_user_id
       INNER JOIN matters m
         ON m.id = ma.matter_id
       WHERE m.public_id = ?
       ORDER BY ma.assigned_at DESC`, [matterPublicId]);
        const stageHistory = await selectAll(connection, `SELECT
         msh.stage_code,
         ms.label AS stage_label,
         msh.entered_at,
         msh.exited_at,
         msh.change_note,
         msh.visible_to_client,
         changed_by.public_id AS changed_by_user_public_id
       FROM matter_stage_history msh
       INNER JOIN matter_stages ms
         ON ms.code = msh.stage_code
       INNER JOIN matters m
         ON m.id = msh.matter_id
       LEFT JOIN users changed_by
         ON changed_by.id = msh.changed_by_user_id
       WHERE m.public_id = ?
       ORDER BY msh.entered_at ASC`, [matterPublicId]);
        const updates = await selectAll(connection, `SELECT
         mu.id,
         mu.update_type_code,
         mu.title,
         mu.body_text,
         mu.visible_to_client,
         mu.created_at,
         mu.edited_at,
         created_by.public_id AS created_by_user_public_id
       FROM matter_updates mu
       INNER JOIN matters m
         ON m.id = mu.matter_id
       LEFT JOIN users created_by
         ON created_by.id = mu.created_by_user_id
       WHERE m.public_id = ?
       ORDER BY mu.created_at DESC`, [matterPublicId]);
        const documents = await selectAll(connection, `SELECT
         d.public_id AS document_public_id,
         d.document_number,
         d.title,
         d.category_code,
         d.visibility_scope_code,
         dv.original_file_name
       FROM matter_documents md
       INNER JOIN matters m
         ON m.id = md.matter_id
       INNER JOIN documents d
         ON d.id = md.document_id
       LEFT JOIN document_versions dv
         ON dv.document_id = d.id
         AND dv.is_current = 1
       WHERE m.public_id = ?
       ORDER BY d.created_at DESC`, [matterPublicId]);
        return {
            ...mapMatterSummary(row),
            assignments: assignments.map((entry) => ({
                assignedAt: toIso(entry.assigned_at),
                assignedByUserId: entry.assigned_by_user_public_id,
                assigneeId: entry.internal_user_public_id || entry.counsel_partner_public_id || '',
                assigneeName: entry.assigned_name,
                assigneeType: entry.internal_user_public_id ? 'internal_user' : 'counsel_partner',
                assignmentRoleCode: entry.assignment_role_code,
                assignmentStatusCode: entry.assignment_status_code,
                feeAgreedAmount: entry.fee_agreed_amount === null ? null : toNumber(entry.fee_agreed_amount),
                feeDueAmount: entry.fee_due_amount === null ? null : toNumber(entry.fee_due_amount),
                feePaidAmount: entry.fee_paid_amount === null ? null : toNumber(entry.fee_paid_amount),
                id: entry.id,
                isPrimary: Boolean(entry.is_primary),
                removedAt: entry.removed_at ? toIso(entry.removed_at) : null,
            })),
            description: row.detailed_description,
            documents: documents.map((entry) => ({
                categoryCode: entry.category_code,
                documentNumber: entry.document_number,
                id: entry.document_public_id,
                latestFileName: entry.original_file_name || '',
                title: entry.title,
                visibilityScopeCode: entry.visibility_scope_code,
            })),
            services: services.map((entry) => ({
                completedAt: entry.completed_at ? toIso(entry.completed_at) : null,
                fee: toNumber(entry.final_fee),
                name: entry.service_name,
                serviceCode: entry.service_code,
                statusCode: entry.service_status_code,
            })),
            stageHistory: stageHistory.map((entry) => ({
                changedByUserId: entry.changed_by_user_public_id,
                changeNote: entry.change_note,
                enteredAt: toIso(entry.entered_at),
                exitedAt: entry.exited_at ? toIso(entry.exited_at) : null,
                label: entry.stage_label,
                stageCode: entry.stage_code,
                visibleToClient: Boolean(entry.visible_to_client),
            })),
            updates: updates.map((entry) => ({
                bodyText: entry.body_text,
                createdAt: toIso(entry.created_at),
                createdByUserId: entry.created_by_user_public_id,
                editedAt: entry.edited_at ? toIso(entry.edited_at) : null,
                id: entry.id,
                title: entry.title,
                typeCode: entry.update_type_code,
                visibleToClient: Boolean(entry.visible_to_client),
            })),
        };
    }
    async listDocumentsInternal(connection, clientAccountId) {
        const rows = await selectAll(connection, `SELECT
         d.public_id,
         d.document_number,
         d.owner_client_account_id,
         owner.public_id AS owner_client_account_public_id,
         d.title,
         d.category_code,
         d.visibility_scope_code,
         d.current_version_no
       FROM documents d
       INNER JOIN client_accounts owner
         ON owner.id = d.owner_client_account_id
       WHERE d.archived_at IS NULL
         ${clientAccountId ? 'AND d.owner_client_account_id = ?' : ''}
       ORDER BY d.updated_at DESC`, clientAccountId ? [clientAccountId] : []);
        const documentIds = rows.map((row) => row.public_id);
        const versionRows = documentIds.length
            ? await selectAll(connection, `SELECT
             d.public_id AS document_public_id,
             dv.public_id,
             dv.version_no,
             dv.original_file_name,
             dv.mime_type,
             dv.file_extension,
             dv.file_size_bytes,
             dv.checksum_sha256,
             dv.virus_scan_status_code,
             dv.uploaded_at,
             uploader.public_id AS uploaded_by_user_public_id,
             dv.is_current,
             dv.retention_hold_flag
           FROM document_versions dv
           INNER JOIN documents d
             ON d.id = dv.document_id
           INNER JOIN users uploader
             ON uploader.id = dv.uploaded_by_user_id
           WHERE d.public_id IN (${documentIds.map(() => '?').join(', ')})
             AND dv.is_current = 1`, documentIds)
            : [];
        const versionMap = new Map();
        for (const row of versionRows) {
            versionMap.set(row.document_public_id, row);
        }
        return rows.map((row) => ({
            categoryCode: row.category_code,
            currentVersionNo: row.current_version_no,
            id: row.public_id,
            latestVersion: versionMap.get(row.public_id) ? mapDocumentVersion(versionMap.get(row.public_id)) : null,
            ownerClientAccountId: row.owner_client_account_public_id,
            title: row.title,
            visibilityScopeCode: row.visibility_scope_code,
        }));
    }
    async getDocumentInternal(connection, documentPublicId, clientAccountId) {
        const row = await selectOne(connection, `SELECT
         d.public_id,
         d.document_number,
         d.owner_client_account_id,
         owner.public_id AS owner_client_account_public_id,
         d.title,
         d.category_code,
         d.visibility_scope_code,
         d.current_version_no
       FROM documents d
       INNER JOIN client_accounts owner
         ON owner.id = d.owner_client_account_id
       WHERE d.public_id = ?
         AND d.archived_at IS NULL
         ${clientAccountId ? 'AND d.owner_client_account_id = ?' : ''}
       LIMIT 1`, clientAccountId ? [documentPublicId, clientAccountId] : [documentPublicId]);
        if (!row) {
            throw notFound('document_not_found', 'Document not found.');
        }
        const versions = await selectAll(connection, `SELECT
         dv.public_id,
         dv.version_no,
         dv.original_file_name,
         dv.mime_type,
         dv.file_extension,
         dv.file_size_bytes,
         dv.checksum_sha256,
         dv.virus_scan_status_code,
         dv.uploaded_at,
         uploader.public_id AS uploaded_by_user_public_id,
         dv.is_current,
         dv.retention_hold_flag
       FROM document_versions dv
       INNER JOIN documents d
         ON d.id = dv.document_id
       INNER JOIN users uploader
         ON uploader.id = dv.uploaded_by_user_id
       WHERE d.public_id = ?
       ORDER BY dv.version_no DESC`, [documentPublicId]);
        const downloads = await selectAll(connection, `SELECT
         ddl.id,
         ddl.downloaded_at,
         downloader.public_id AS downloaded_by_user_public_id,
         dv.public_id AS document_version_public_id
       FROM document_download_logs ddl
       INNER JOIN documents d
         ON d.id = ddl.document_id
       INNER JOIN document_versions dv
         ON dv.id = ddl.document_version_id
       INNER JOIN users downloader
         ON downloader.id = ddl.downloaded_by_user_id
       WHERE d.public_id = ?
       ORDER BY ddl.downloaded_at DESC`, [documentPublicId]);
        const linkedEntities = await selectAll(connection, `SELECT
         'matter' AS type_code,
         m.public_id AS entity_public_id,
         m.title AS label
       FROM matter_documents md
       INNER JOIN matters m
         ON m.id = md.matter_id
       INNER JOIN documents d
         ON d.id = md.document_id
       WHERE d.public_id = ?
       UNION ALL
       SELECT
         'request' AS type_code,
         sr.public_id AS entity_public_id,
         sr.title AS label
       FROM request_documents rd
       INNER JOIN service_requests sr
         ON sr.id = rd.service_request_id
       INNER JOIN documents d
         ON d.id = rd.document_id
       WHERE d.public_id = ?
       UNION ALL
       SELECT
         'invoice' AS type_code,
         i.public_id AS entity_public_id,
         i.invoice_number AS label
       FROM invoice_documents idoc
       INNER JOIN invoices i
         ON i.id = idoc.invoice_id
       INNER JOIN documents d
         ON d.id = idoc.document_id
       WHERE d.public_id = ?`, [documentPublicId, documentPublicId, documentPublicId]);
        return {
            categoryCode: row.category_code,
            currentVersionNo: row.current_version_no,
            documentNumber: row.document_number,
            downloads: downloads.map((entry) => ({
                downloadedAt: toIso(entry.downloaded_at),
                downloadedByUserId: entry.downloaded_by_user_public_id,
                id: entry.id,
                versionId: entry.document_version_public_id,
            })),
            id: row.public_id,
            latestVersion: versions[0] ? mapDocumentVersion(versions[0]) : null,
            linkedEntities: linkedEntities.map((entry) => ({
                id: entry.entity_public_id,
                label: entry.label,
                type: entry.type_code,
            })),
            ownerClientAccountId: row.owner_client_account_public_id,
            title: row.title,
            versions: versions.map(mapDocumentVersion),
            visibilityScopeCode: row.visibility_scope_code,
        };
    }
    async listEventsInternal(connection, clientAccountId) {
        const rows = await selectAll(connection, `SELECT
         e.public_id,
         ca.public_id AS client_account_public_id,
         e.title,
         e.event_type_code AS type_code,
         e.status_code,
         e.scheduled_start_at,
         e.scheduled_end_at,
         e.timezone_name,
         e.mode_code,
         e.location_text,
         e.meeting_provider_code,
         e.join_url,
         e.host_url,
         e.client_visible_flag,
         e.notes,
         e.cancelled_at,
         cancelled_by.public_id AS cancelled_by_user_public_id,
         m.public_id AS matter_public_id,
         m.title AS matter_title
       FROM events e
       INNER JOIN client_accounts ca
         ON ca.id = e.client_account_id
       LEFT JOIN matters m
         ON m.id = e.matter_id
       LEFT JOIN users cancelled_by
         ON cancelled_by.id = e.cancelled_by_user_id
       WHERE 1 = 1
         ${clientAccountId ? 'AND e.client_account_id = ?' : ''}
       ORDER BY e.scheduled_start_at DESC`, clientAccountId ? [clientAccountId] : []);
        return rows.map((row) => ({
            clientAccountId: row.client_account_public_id,
            clientVisibleFlag: Boolean(row.client_visible_flag),
            id: row.public_id,
            locationText: row.location_text,
            matterId: row.matter_public_id,
            matterTitle: row.matter_title,
            meetingProviderCode: row.meeting_provider_code,
            modeCode: row.mode_code,
            scheduledEndAt: toIso(row.scheduled_end_at),
            scheduledStartAt: toIso(row.scheduled_start_at),
            statusCode: row.status_code,
            timezoneName: row.timezone_name,
            title: row.title,
            typeCode: row.type_code,
        }));
    }
    async listInvoicesInternal(connection, clientAccountId) {
        const rows = await selectAll(connection, `SELECT
         i.public_id,
         i.invoice_number,
         client.public_id AS client_account_public_id,
         matter.public_id AS matter_public_id,
         i.invoice_type_code,
         i.status_code,
         i.currency_code,
         i.issue_date,
         i.due_date,
         i.subtotal_amount,
         i.discount_amount,
         i.tax_amount,
         i.total_amount,
         i.amount_paid,
         i.amount_refunded,
         i.amount_due,
         i.created_at
       FROM invoices i
       INNER JOIN client_accounts client
         ON client.id = i.client_account_id
       LEFT JOIN matters matter
         ON matter.id = i.matter_id
       WHERE i.archived_at IS NULL
         ${clientAccountId ? 'AND i.client_account_id = ?' : ''}
       ORDER BY i.issue_date DESC, i.created_at DESC`, clientAccountId ? [clientAccountId] : []);
        return rows.map((row) => ({
            amountDue: toNumber(row.amount_due),
            amountPaid: toNumber(row.amount_paid),
            amountRefunded: toNumber(row.amount_refunded),
            clientAccountId: row.client_account_public_id,
            currencyCode: row.currency_code,
            dueDate: row.due_date,
            id: row.public_id,
            invoiceNumber: row.invoice_number,
            issueDate: row.issue_date,
            matterId: row.matter_public_id,
            statusCode: row.status_code,
            totalAmount: toNumber(row.total_amount),
            typeCode: row.invoice_type_code,
        }));
    }
    async getInvoiceInternal(connection, invoicePublicId, clientAccountId) {
        const row = await selectOne(connection, `SELECT
         i.public_id,
         i.invoice_number,
         client.public_id AS client_account_public_id,
         matter.public_id AS matter_public_id,
         i.invoice_type_code,
         i.status_code,
         i.currency_code,
         i.issue_date,
         i.due_date,
         i.subtotal_amount,
         i.discount_amount,
         i.tax_amount,
         i.total_amount,
         i.amount_paid,
         i.amount_refunded,
         i.amount_due,
         i.created_at
       FROM invoices i
       INNER JOIN client_accounts client
         ON client.id = i.client_account_id
       LEFT JOIN matters matter
         ON matter.id = i.matter_id
       WHERE i.public_id = ?
         AND i.archived_at IS NULL
         ${clientAccountId ? 'AND i.client_account_id = ?' : ''}
       LIMIT 1`, clientAccountId ? [invoicePublicId, clientAccountId] : [invoicePublicId]);
        if (!row) {
            throw notFound('invoice_not_found', 'Invoice not found.');
        }
        const billingSnapshot = await selectOne(connection, `SELECT
         billing_name,
         billing_email,
         billing_phone,
         address_line1,
         address_line2,
         city,
         state,
         postal_code,
         country_code,
         gstin
       FROM invoice_billing_snapshots
       WHERE invoice_id = (
         SELECT id FROM invoices WHERE public_id = ? LIMIT 1
       )`, [invoicePublicId]);
        const lines = await selectAll(connection, `SELECT
         il.id,
         il.line_type_code AS type_code,
         service.public_id AS service_public_id,
         il.subscription_plan_id,
         il.description,
         il.quantity,
         il.unit_price,
         il.line_subtotal,
         il.discount_amount,
         il.taxable_amount,
         il.line_total,
         il.sort_order
       FROM invoice_lines il
       INNER JOIN invoices i
         ON i.id = il.invoice_id
       LEFT JOIN services service
         ON service.id = il.service_id
       WHERE i.public_id = ?
       ORDER BY il.sort_order ASC, il.id ASC`, [invoicePublicId]);
        const taxes = await selectAll(connection, `SELECT
         ilt.id,
         ilt.invoice_line_id,
         ilt.tax_code_snapshot,
         ilt.tax_name_snapshot,
         ilt.tax_percent_snapshot,
         ilt.taxable_amount,
         ilt.tax_amount
       FROM invoice_line_taxes ilt
       INNER JOIN invoice_lines il
         ON il.id = ilt.invoice_line_id
       INNER JOIN invoices i
         ON i.id = il.invoice_id
       WHERE i.public_id = ?
       ORDER BY ilt.sort_order ASC, ilt.id ASC`, [invoicePublicId]);
        const taxMap = new Map();
        for (const tax of taxes) {
            const existing = taxMap.get(tax.invoice_line_id) || [];
            existing.push(tax);
            taxMap.set(tax.invoice_line_id, existing);
        }
        const installments = await selectAll(connection, `SELECT
         id,
         installment_no,
         due_date,
         amount_due,
         amount_paid,
         amount_remaining,
         status_code,
         paid_at
       FROM invoice_installments
       WHERE invoice_id = (
         SELECT id FROM invoices WHERE public_id = ? LIMIT 1
       )
       ORDER BY installment_no ASC`, [invoicePublicId]);
        const documents = await selectAll(connection, `SELECT
         'invoice' AS type_code,
         d.public_id AS entity_public_id,
         d.title AS label
       FROM invoice_documents idoc
       INNER JOIN documents d
         ON d.id = idoc.document_id
       INNER JOIN invoices i
         ON i.id = idoc.invoice_id
       WHERE i.public_id = ?`, [invoicePublicId]);
        return {
            amountDue: toNumber(row.amount_due),
            amountPaid: toNumber(row.amount_paid),
            amountRefunded: toNumber(row.amount_refunded),
            billingSnapshot: billingSnapshot
                ? {
                    addressLine1: billingSnapshot.address_line1,
                    addressLine2: billingSnapshot.address_line2,
                    billingEmail: billingSnapshot.billing_email,
                    billingName: billingSnapshot.billing_name,
                    billingPhone: billingSnapshot.billing_phone,
                    city: billingSnapshot.city,
                    countryCode: billingSnapshot.country_code,
                    gstin: billingSnapshot.gstin,
                    postalCode: billingSnapshot.postal_code,
                    state: billingSnapshot.state,
                }
                : null,
            clientAccountId: row.client_account_public_id,
            currencyCode: row.currency_code,
            discountAmount: toNumber(row.discount_amount),
            documents: documents.map((entry) => ({
                id: entry.entity_public_id,
                label: entry.label,
                type: entry.type_code,
            })),
            dueDate: row.due_date,
            id: row.public_id,
            installments: installments.map((entry) => ({
                amountDue: toNumber(entry.amount_due),
                amountPaid: toNumber(entry.amount_paid),
                amountRemaining: toNumber(entry.amount_remaining),
                dueDate: entry.due_date,
                id: entry.id,
                installmentNo: entry.installment_no,
                paidAt: entry.paid_at ? toIso(entry.paid_at) : null,
                statusCode: entry.status_code,
            })),
            invoiceNumber: row.invoice_number,
            issueDate: row.issue_date,
            lines: lines.map((entry) => ({
                description: entry.description,
                discountAmount: toNumber(entry.discount_amount),
                id: entry.id,
                lineSubtotal: toNumber(entry.line_subtotal),
                lineTotal: toNumber(entry.line_total),
                quantity: toNumber(entry.quantity),
                serviceId: entry.service_public_id,
                sortOrder: entry.sort_order,
                subscriptionPlanId: entry.subscription_plan_id,
                taxableAmount: toNumber(entry.taxable_amount),
                taxes: (taxMap.get(entry.id) || []).map((taxEntry) => ({
                    amount: toNumber(taxEntry.tax_amount),
                    code: taxEntry.tax_code_snapshot,
                    id: taxEntry.id,
                    name: taxEntry.tax_name_snapshot,
                    percent: toNumber(taxEntry.tax_percent_snapshot),
                })),
                typeCode: entry.type_code,
                unitPrice: toNumber(entry.unit_price),
            })),
            matterId: row.matter_public_id,
            statusCode: row.status_code,
            subtotalAmount: toNumber(row.subtotal_amount),
            taxAmount: toNumber(row.tax_amount),
            totalAmount: toNumber(row.total_amount),
            typeCode: row.invoice_type_code,
        };
    }
    async listPaymentsInternal(connection, clientAccountId) {
        const rows = await selectAll(connection, `SELECT
         pt.public_id,
         ca.public_id AS client_account_public_id,
         pt.gateway_provider_code,
         pt.gateway_order_ref,
         pt.gateway_payment_ref,
         pt.status_code,
         pt.currency_code,
         pt.gross_amount,
         pt.net_amount,
         pt.initiated_at,
         creator.public_id AS created_by_user_public_id,
         inv.public_id AS invoice_public_id
       FROM payment_transactions pt
       INNER JOIN client_accounts ca
         ON ca.id = pt.client_account_id
       LEFT JOIN users creator
         ON creator.id = pt.created_by_user_id
       LEFT JOIN payment_allocations pa
         ON pa.payment_transaction_id = pt.id
       LEFT JOIN invoices inv
         ON inv.id = pa.invoice_id
       WHERE 1 = 1
         ${clientAccountId ? 'AND pt.client_account_id = ?' : ''}
       GROUP BY pt.id, ca.public_id, creator.public_id, inv.public_id
       ORDER BY pt.initiated_at DESC`, clientAccountId ? [clientAccountId] : []);
        return rows.map((row) => ({
            clientAccountId: row.client_account_public_id,
            createdByUserId: row.created_by_user_public_id,
            currencyCode: row.currency_code,
            gatewayOrderRef: row.gateway_order_ref,
            gatewayPaymentRef: row.gateway_payment_ref,
            gatewayProviderCode: row.gateway_provider_code,
            grossAmount: toNumber(row.gross_amount),
            id: row.public_id,
            initiatedAt: toIso(row.initiated_at),
            invoiceId: row.invoice_public_id,
            netAmount: toNumber(row.net_amount),
            statusCode: row.status_code,
        }));
    }
    async listRefundsInternal(connection, clientAccountId) {
        const rows = await selectAll(connection, `SELECT
         r.public_id,
         pt.public_id AS payment_public_id,
         inv.public_id AS invoice_public_id,
         r.amount,
         r.refund_status_code,
         r.reason_text,
         requested_by.public_id AS requested_by_user_public_id,
         approved_by.public_id AS approved_by_user_public_id,
         r.requested_at,
         r.completed_at
       FROM refunds r
       INNER JOIN payment_transactions pt
         ON pt.id = r.payment_transaction_id
       LEFT JOIN invoices inv
         ON inv.id = r.invoice_id
       INNER JOIN users requested_by
         ON requested_by.id = r.requested_by_user_id
       LEFT JOIN users approved_by
         ON approved_by.id = r.approved_by_user_id
       WHERE 1 = 1
         ${clientAccountId ? 'AND pt.client_account_id = ?' : ''}
       ORDER BY r.requested_at DESC`, clientAccountId ? [clientAccountId] : []);
        return rows.map((row) => ({
            amount: toNumber(row.amount),
            approvedByUserId: row.approved_by_user_public_id,
            completedAt: row.completed_at ? toIso(row.completed_at) : null,
            id: row.public_id,
            invoiceId: row.invoice_public_id,
            paymentId: row.payment_public_id,
            reasonText: row.reason_text,
            requestedAt: toIso(row.requested_at),
            requestedByUserId: row.requested_by_user_public_id,
            statusCode: row.refund_status_code,
        }));
    }
}
