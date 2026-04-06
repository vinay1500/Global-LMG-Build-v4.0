import { nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { createPublicId } from '../../lib/ids.js';
import { notFound } from '../../lib/httpErrors.js';
import { selectOne, withConnection, withTransaction } from '../../lib/mysqlUtils.js';
import { ensurePlatformReady } from '../platform/bootstrap.js';
import { DEFAULT_NOTIFICATION_PREFERENCES } from './types.js';
const toPreferences = (row) => {
    if (!row) {
        return DEFAULT_NOTIFICATION_PREFERENCES;
    }
    return {
        caseActivityAlerts: Boolean(row.case_activity_alerts),
        emailUpdates: Boolean(row.email_updates),
        invoiceReminders: Boolean(row.invoice_reminders),
        productAnnouncements: Boolean(row.product_announcements),
        smsAlerts: Boolean(row.sms_alerts),
    };
};
export class ClientAccountsRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async initialize() {
        await ensurePlatformReady();
    }
    async resolvePortalUserContext(connection, userPublicId) {
        const row = await selectOne(connection, `SELECT
         u.id AS user_id,
         u.display_name
       FROM users u
       INNER JOIN client_account_contacts cac
         ON cac.user_id = u.id
         AND cac.portal_access_enabled = 1
         AND cac.archived_at IS NULL
       WHERE u.public_id = ?
         AND u.archived_at IS NULL
       LIMIT 1`, [userPublicId]);
        if (!row) {
            throw notFound('portal_user_not_found', 'Portal user could not be resolved.');
        }
        return row;
    }
    async getNotificationPreferences(userPublicId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            const context = await this.resolvePortalUserContext(connection, userPublicId);
            const row = await selectOne(connection, `SELECT
           email_updates,
           sms_alerts,
           invoice_reminders,
           case_activity_alerts,
           product_announcements
         FROM user_notification_preferences
         WHERE user_id = ?
         LIMIT 1`, [context.user_id]);
            return toPreferences(row);
        });
    }
    async updateNotificationPreferences(userPublicId, preferences) {
        await this.initialize();
        return withTransaction(this.pool, async (connection) => {
            const context = await this.resolvePortalUserContext(connection, userPublicId);
            const timestamp = toMysqlDateTime(nowUtc());
            await connection.execute(`INSERT INTO user_notification_preferences (
          user_id,
          email_updates,
          sms_alerts,
          invoice_reminders,
          case_activity_alerts,
          product_announcements,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          email_updates = VALUES(email_updates),
          sms_alerts = VALUES(sms_alerts),
          invoice_reminders = VALUES(invoice_reminders),
          case_activity_alerts = VALUES(case_activity_alerts),
          product_announcements = VALUES(product_announcements),
          updated_at = VALUES(updated_at)`, [
                context.user_id,
                preferences.emailUpdates ? 1 : 0,
                preferences.smsAlerts ? 1 : 0,
                preferences.invoiceReminders ? 1 : 0,
                preferences.caseActivityAlerts ? 1 : 0,
                preferences.productAnnouncements ? 1 : 0,
                timestamp,
            ]);
            await connection.execute(`INSERT INTO audit_events (
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                createPublicId(),
                context.user_id,
                'client',
                'user_notification_preferences',
                context.user_id,
                'preferences_updated',
                'Notification preferences updated',
                'Client Settings',
                null,
                null,
                null,
                null,
                JSON.stringify(preferences),
                timestamp,
            ]);
            return preferences;
        });
    }
}
