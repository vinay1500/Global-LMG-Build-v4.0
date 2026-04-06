import { getMysqlPool } from '../../lib/mysql.js';
import { selectAll, selectOne, withConnection } from '../../lib/mysqlUtils.js';
import { fromMysqlDateTime, nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { domainService } from '../domain/service.js';
import { notFound } from '../../lib/httpErrors.js';
import { createPublicId } from '../../lib/ids.js';
const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');
export const adminClientService = {
    async listClients(options = {}) {
        return withConnection(getMysqlPool(), async (connection) => {
            const limit = Math.min(Math.max(options.limit || 20, 1), 100);
            const offset = Math.max(options.offset || 0, 0);
            const search = options.search?.trim();
            const values = [];
            let whereClause = 'WHERE ca.archived_at IS NULL';
            if (search) {
                const like = `%${escapeLike(search)}%`;
                whereClause +=
                    ' AND (ca.display_name LIKE ? ESCAPE \'\\\\\' OR ca.legal_name LIKE ? ESCAPE \'\\\\\' OR ca.client_code LIKE ? ESCAPE \'\\\\\' OR ca.primary_email LIKE ? ESCAPE \'\\\\\' OR ca.primary_phone LIKE ? ESCAPE \'\\\\\')';
                values.push(like, like, like, like, like);
            }
            const rows = await selectAll(connection, `SELECT
           ca.public_id,
           ca.client_code,
           ca.client_type_code,
           ca.display_name,
           ca.legal_name,
           ca.primary_email,
           ca.primary_phone,
           ca.onboarding_status_code,
           ca.account_status_code,
           (
             SELECT COUNT(*)
             FROM matters m
             WHERE m.client_account_id = ca.id
               AND m.archived_at IS NULL
           ) AS matter_count
         FROM client_accounts ca
         ${whereClause}
         ORDER BY ca.updated_at DESC
         LIMIT ?
         OFFSET ?`, [...values, limit, offset]);
            const total = await selectOne(connection, `SELECT COUNT(*) AS count_value
         FROM client_accounts ca
         ${whereClause}`, values);
            return {
                items: rows.map((row) => ({
                    accountStatusCode: row.account_status_code,
                    clientCode: row.client_code,
                    clientTypeCode: row.client_type_code,
                    displayName: row.display_name,
                    id: row.public_id,
                    legalName: row.legal_name,
                    matterCount: Number(row.matter_count || 0),
                    onboardingStatusCode: row.onboarding_status_code,
                    primaryEmail: row.primary_email,
                    primaryPhone: row.primary_phone,
                })),
                limit,
                offset,
                total: Number(total?.count_value || 0),
            };
        });
    },
    async getClient360(clientAccountPublicId) {
        const base = await domainService.getClientAccountByPublicId(clientAccountPublicId);
        return withConnection(getMysqlPool(), async (connection) => {
            const account = await selectOne(connection, 'SELECT id FROM client_accounts WHERE public_id = ? LIMIT 1', [clientAccountPublicId]);
            if (!account?.id) {
                throw notFound('client_account_not_found', 'Client account not found.');
            }
            const clientAccountId = Number(account.id);
            const [matters, documents, events, invoices, payments, refunds] = await Promise.all([
                domainService.listClientMatters(clientAccountId),
                domainService.listClientDocuments(clientAccountId),
                domainService.listClientEvents(clientAccountId),
                domainService.listClientInvoices(clientAccountId),
                domainService.listClientPayments(clientAccountId),
                domainService.listClientRefunds(clientAccountId),
            ]);
            const portalUsers = await selectAll(connection, `SELECT
           u.id AS user_id,
           u.public_id,
           u.display_name,
           u.email,
           u.phone,
           u.account_status_code,
           u.last_login_at,
           u.email_verified_at,
           u.phone_verified_at,
           cac.portal_access_enabled
         FROM client_account_contacts cac
         INNER JOIN users u
           ON u.id = cac.user_id
         WHERE cac.client_account_id = ?
           AND cac.archived_at IS NULL
         ORDER BY cac.is_primary DESC, u.display_name ASC`, [clientAccountId]);
            const portalUserIds = portalUsers.map((entry) => Number(entry.user_id || 0)).filter(Boolean);
            const preferences = portalUserIds.length > 0
                ? await selectAll(connection, `SELECT
                 user_id,
                 email_updates,
                 sms_alerts,
                 invoice_reminders,
                 case_activity_alerts,
                 product_announcements,
                 updated_at
               FROM user_notification_preferences
               WHERE user_id IN (${portalUserIds.map(() => '?').join(', ')})`, portalUserIds)
                : [];
            const legalAcceptances = portalUserIds.length > 0
                ? await selectAll(connection, `SELECT
                 user_id,
                 public_id,
                 acceptance_type_code,
                 source_code,
                 accepted_at
               FROM user_legal_acceptances
               WHERE user_id IN (${portalUserIds.map(() => '?').join(', ')})
               ORDER BY accepted_at DESC`, portalUserIds)
                : [];
            const activeSessions = portalUserIds.length > 0
                ? await selectAll(connection, `SELECT
                 user_id,
                 public_id,
                 device_label,
                 ip_address,
                 user_agent,
                 remember_me,
                 expires_at,
                 last_seen_at,
                 created_at
               FROM user_sessions
               WHERE user_id IN (${portalUserIds.map(() => '?').join(', ')})
                 AND revoked_at IS NULL
                 AND expires_at > UTC_TIMESTAMP(6)
               ORDER BY last_seen_at DESC`, portalUserIds)
                : [];
            const securityEvents = portalUserIds.length > 0
                ? await selectAll(connection, `SELECT
                 user_id,
                 public_id,
                 identifier_value,
                 event_type_code,
                 success_flag,
                 ip_address,
                 user_agent,
                 occurred_at
               FROM security_events
               WHERE user_id IN (${portalUserIds.map(() => '?').join(', ')})
               ORDER BY occurred_at DESC
               LIMIT 200`, portalUserIds)
                : [];
            const threads = await selectAll(connection, `SELECT
           ct.public_id,
           ct.thread_number,
           ct.subject,
           ct.status_code,
           ct.last_message_at,
           m.public_id AS matter_public_id,
           m.title AS matter_title,
           (
             SELECT msg.body_text
             FROM messages msg
             WHERE msg.thread_id = ct.id
               AND msg.deleted_at IS NULL
             ORDER BY msg.sent_at DESC
             LIMIT 1
           ) AS last_body_text
         FROM conversation_threads ct
         LEFT JOIN matters m
           ON m.id = ct.matter_id
         WHERE ct.client_account_id = ?
           AND ct.archived_at IS NULL
         ORDER BY ct.last_message_at DESC, ct.updated_at DESC`, [clientAccountId]);
            const internalNotes = await selectAll(connection, `SELECT
           n.public_id,
           n.body_text,
           n.created_at,
           u.display_name
         FROM admin_internal_notes n
         INNER JOIN users u
           ON u.id = n.created_by_user_id
         WHERE n.entity_type_code = 'client_account'
           AND n.entity_public_id = ?
         ORDER BY n.created_at DESC`, [clientAccountPublicId]);
            const activity = await selectAll(connection, `SELECT
           ae.public_id,
           ae.action_label,
           ae.source_module,
           ae.summary_new_value,
           ae.occurred_at
         FROM audit_events ae
         WHERE (
           ae.entity_table_name = 'client_accounts'
           AND ae.entity_pk = ?
         ) OR (
           ae.entity_table_name = 'matters'
           AND EXISTS (
             SELECT 1
             FROM matters m
             WHERE m.id = ae.entity_pk
               AND m.client_account_id = ?
           )
         ) OR (
           ae.entity_table_name = 'events'
           AND EXISTS (
             SELECT 1
             FROM events e
             WHERE e.id = ae.entity_pk
               AND e.client_account_id = ?
           )
         ) OR (
           ae.entity_table_name = 'conversation_threads'
           AND EXISTS (
             SELECT 1
             FROM conversation_threads ct
             WHERE ct.id = ae.entity_pk
               AND ct.client_account_id = ?
           )
         )
         ORDER BY ae.occurred_at DESC
         LIMIT 40`, [clientAccountId, clientAccountId, clientAccountId, clientAccountId]);
            const preferenceByUserId = new Map();
            for (const entry of preferences) {
                preferenceByUserId.set(Number(entry.user_id), entry);
            }
            const legalAcceptancesByUserId = new Map();
            for (const entry of legalAcceptances) {
                const current = legalAcceptancesByUserId.get(Number(entry.user_id)) || [];
                current.push(entry);
                legalAcceptancesByUserId.set(Number(entry.user_id), current);
            }
            const sessionsByUserId = new Map();
            for (const entry of activeSessions) {
                const current = sessionsByUserId.get(Number(entry.user_id)) || [];
                current.push(entry);
                sessionsByUserId.set(Number(entry.user_id), current);
            }
            const securityEventsByUserId = new Map();
            for (const entry of securityEvents) {
                const current = securityEventsByUserId.get(Number(entry.user_id)) || [];
                current.push(entry);
                securityEventsByUserId.set(Number(entry.user_id), current);
            }
            return {
                activity: activity.map((entry) => ({
                    actionLabel: entry.action_label,
                    id: entry.public_id,
                    occurredAt: fromMysqlDateTime(entry.occurred_at),
                    sourceModule: entry.source_module,
                    summary: entry.summary_new_value,
                })),
                client: base,
                documents,
                events,
                internalNotes: internalNotes.map((entry) => ({
                    bodyText: entry.body_text,
                    createdAt: fromMysqlDateTime(entry.created_at),
                    createdByName: entry.display_name,
                    id: entry.public_id,
                })),
                invoices,
                matters,
                payments,
                portalUsers: portalUsers.map((entry) => ({
                    accountStatusCode: entry.account_status_code,
                    access: {
                        activeSessions: sessionsByUserId.get(Number(entry.user_id || 0))?.map((session) => ({
                            createdAt: fromMysqlDateTime(session.created_at),
                            deviceLabel: session.device_label,
                            expiresAt: fromMysqlDateTime(session.expires_at),
                            id: session.public_id,
                            ipAddress: session.ip_address,
                            lastSeenAt: fromMysqlDateTime(session.last_seen_at),
                            rememberMe: Boolean(session.remember_me),
                            userAgent: session.user_agent,
                        })) || [],
                        legalAcceptances: legalAcceptancesByUserId
                            .get(Number(entry.user_id || 0))
                            ?.map((acceptance) => ({
                            acceptedAt: fromMysqlDateTime(acceptance.accepted_at),
                            acceptanceTypeCode: acceptance.acceptance_type_code,
                            id: acceptance.public_id,
                            sourceCode: acceptance.source_code,
                        })) || [],
                        notificationPreferences: preferenceByUserId.get(Number(entry.user_id || 0))
                            ? {
                                caseActivityAlerts: Boolean(preferenceByUserId.get(Number(entry.user_id || 0))?.case_activity_alerts),
                                emailUpdates: Boolean(preferenceByUserId.get(Number(entry.user_id || 0))?.email_updates),
                                invoiceReminders: Boolean(preferenceByUserId.get(Number(entry.user_id || 0))?.invoice_reminders),
                                productAnnouncements: Boolean(preferenceByUserId.get(Number(entry.user_id || 0))?.product_announcements),
                                smsAlerts: Boolean(preferenceByUserId.get(Number(entry.user_id || 0))?.sms_alerts),
                                updatedAt: fromMysqlDateTime(preferenceByUserId.get(Number(entry.user_id || 0))?.updated_at),
                            }
                            : null,
                        securityEvents: securityEventsByUserId
                            .get(Number(entry.user_id || 0))
                            ?.map((securityEvent) => ({
                            eventTypeCode: securityEvent.event_type_code,
                            id: securityEvent.public_id,
                            identifierValue: securityEvent.identifier_value,
                            ipAddress: securityEvent.ip_address,
                            occurredAt: fromMysqlDateTime(securityEvent.occurred_at),
                            successFlag: Boolean(securityEvent.success_flag),
                            userAgent: securityEvent.user_agent,
                        })) || [],
                    },
                    email: entry.email,
                    emailVerifiedAt: fromMysqlDateTime(entry.email_verified_at),
                    id: entry.public_id,
                    lastLoginAt: fromMysqlDateTime(entry.last_login_at),
                    name: entry.display_name,
                    phone: entry.phone,
                    phoneVerifiedAt: fromMysqlDateTime(entry.phone_verified_at),
                    portalAccessEnabled: Boolean(entry.portal_access_enabled),
                })),
                refunds,
                threads: threads.map((entry) => ({
                    id: entry.public_id,
                    lastMessageAt: fromMysqlDateTime(entry.last_message_at),
                    lastMessageText: entry.last_body_text,
                    matterId: entry.matter_public_id,
                    matterTitle: entry.matter_title,
                    statusCode: entry.status_code,
                    subject: entry.subject,
                    threadNumber: entry.thread_number,
                })),
            };
        });
    },
    async updatePortalUserAccess(actorUserId, clientAccountPublicId, userPublicId, portalAccessEnabled) {
        return withConnection(getMysqlPool(), async (connection) => {
            const timestamp = toMysqlDateTime(nowUtc());
            const contact = await selectOne(connection, `SELECT cac.user_id, cac.client_account_id
         FROM client_account_contacts cac
         INNER JOIN client_accounts ca
           ON ca.id = cac.client_account_id
         INNER JOIN users u
           ON u.id = cac.user_id
         WHERE ca.public_id = ?
           AND u.public_id = ?
           AND cac.archived_at IS NULL
         LIMIT 1`, [clientAccountPublicId, userPublicId]);
            if (!contact?.user_id || !contact?.client_account_id) {
                throw notFound('client_portal_user_not_found', 'Client portal user not found.');
            }
            await connection.execute(`UPDATE client_account_contacts
         SET portal_access_enabled = ?
         WHERE client_account_id = ?
           AND user_id = ?
           AND archived_at IS NULL`, [portalAccessEnabled ? 1 : 0, Number(contact.client_account_id), Number(contact.user_id)]);
            if (!portalAccessEnabled) {
                await connection.execute(`UPDATE user_sessions
           SET revoked_at = ?,
               updated_at = ?
           WHERE user_id = ?
             AND revoked_at IS NULL`, [timestamp, timestamp, Number(contact.user_id)]);
            }
            await connection.execute(`INSERT INTO audit_events (
          public_id, actor_user_id, actor_role_code_snapshot, entity_table_name, entity_pk, action_code,
          action_label, source_module, request_correlation_id, ip_address, user_agent, summary_old_value,
          summary_new_value, occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                createPublicId(),
                actorUserId,
                'client_account.manage',
                'users',
                Number(contact.user_id),
                'client_portal_access_updated',
                'Client portal access updated',
                'Admin Client Access',
                null,
                null,
                null,
                null,
                portalAccessEnabled ? 'enabled' : 'disabled',
                timestamp,
            ]);
            return {
                clientAccountId: clientAccountPublicId,
                portalAccessEnabled,
                userId: userPublicId,
            };
        });
    },
    async forceSignOutPortalUser(actorUserId, clientAccountPublicId, userPublicId) {
        return withConnection(getMysqlPool(), async (connection) => {
            const timestamp = toMysqlDateTime(nowUtc());
            const contact = await selectOne(connection, `SELECT cac.user_id
         FROM client_account_contacts cac
         INNER JOIN client_accounts ca
           ON ca.id = cac.client_account_id
         INNER JOIN users u
           ON u.id = cac.user_id
         WHERE ca.public_id = ?
           AND u.public_id = ?
           AND cac.archived_at IS NULL
         LIMIT 1`, [clientAccountPublicId, userPublicId]);
            if (!contact?.user_id) {
                throw notFound('client_portal_user_not_found', 'Client portal user not found.');
            }
            await connection.execute(`UPDATE user_sessions
         SET revoked_at = ?,
             updated_at = ?
         WHERE user_id = ?
           AND revoked_at IS NULL`, [timestamp, timestamp, Number(contact.user_id)]);
            await connection.execute(`INSERT INTO audit_events (
          public_id, actor_user_id, actor_role_code_snapshot, entity_table_name, entity_pk, action_code,
          action_label, source_module, request_correlation_id, ip_address, user_agent, summary_old_value,
          summary_new_value, occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                createPublicId(),
                actorUserId,
                'client_account.manage',
                'users',
                Number(contact.user_id),
                'client_force_sign_out',
                'Client sessions revoked',
                'Admin Client Access',
                null,
                null,
                null,
                null,
                userPublicId,
                timestamp,
            ]);
            return {
                clientAccountId: clientAccountPublicId,
                status: 'sessions_revoked',
                userId: userPublicId,
            };
        });
    },
};
