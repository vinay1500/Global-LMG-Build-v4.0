import type { RowDataPacket } from 'mysql2/promise';
import { queryRows } from '../../lib/mysql.js';
import { toUiDateTime } from '../../lib/viewModels.js';

type AuditRow = RowDataPacket & {
  action: string;
  actor: string | null;
  actorRole: string;
  entityId: string | null;
  entityPk: number | null;
  entityTableName: string;
  id: string;
  newValue: string | null;
  oldValue: string | null;
  sourceModule: string;
  timestamp: string;
};

const mapEntityType = (entityTableName: string) => {
  switch (entityTableName) {
    case 'conversation_threads':
    case 'messages':
      return 'message';
    case 'matter_updates':
    case 'matter_assignments':
    case 'matters':
      return 'matter';
    case 'invoices':
      return 'invoice';
    case 'refunds':
    case 'payment_transactions':
      return 'payment';
    case 'documents':
      return 'document';
    case 'events':
      return 'event';
    case 'client_accounts':
    case 'users':
      return 'user';
    default:
      return entityTableName.replace(/s$/, '');
  }
};

export const listEntries = async (options: { limit?: number } = {}) => {
  const limit = Math.max(1, Math.min(options.limit ?? 100, 250));

  const rows = await queryRows<AuditRow>(
    `SELECT
       ae.public_id AS id,
       ae.occurred_at AS timestamp,
       actor.display_name AS actor,
       ae.actor_role_code_snapshot AS actorRole,
       ae.entity_table_name AS entityTableName,
       ae.entity_pk AS entityPk,
       COALESCE(m.public_id, inv.public_id, doc.public_id, evt.public_id, thread.public_id, pay.public_id, refund.public_id, usr.public_id, ca.public_id) AS entityId,
       ae.action_label AS action,
       ae.summary_old_value AS oldValue,
       ae.summary_new_value AS newValue,
       ae.source_module AS sourceModule
     FROM audit_events ae
     LEFT JOIN users actor ON actor.id = ae.actor_user_id
     LEFT JOIN matters m ON ae.entity_table_name = 'matters' AND m.id = ae.entity_pk
     LEFT JOIN invoices inv ON ae.entity_table_name = 'invoices' AND inv.id = ae.entity_pk
     LEFT JOIN documents doc ON ae.entity_table_name = 'documents' AND doc.id = ae.entity_pk
     LEFT JOIN events evt ON ae.entity_table_name = 'events' AND evt.id = ae.entity_pk
     LEFT JOIN conversation_threads thread ON ae.entity_table_name IN ('conversation_threads', 'messages') AND thread.id = ae.entity_pk
     LEFT JOIN payment_transactions pay ON ae.entity_table_name = 'payment_transactions' AND pay.id = ae.entity_pk
     LEFT JOIN refunds refund ON ae.entity_table_name = 'refunds' AND refund.id = ae.entity_pk
     LEFT JOIN users usr ON ae.entity_table_name = 'users' AND usr.id = ae.entity_pk
     LEFT JOIN client_accounts ca ON ae.entity_table_name = 'client_accounts' AND ca.id = ae.entity_pk
     ORDER BY ae.occurred_at DESC
     LIMIT ?`,
    [limit]
  );

  return {
    entries: rows.map((row) => ({
      action: row.action,
      actor: row.actor || 'System',
      actorRole: row.actorRole as
        | 'billing-admin'
        | 'case-manager'
        | 'client'
        | 'management'
        | 'messaging-desk'
        | 'super-admin'
        | 'system'
        | 'team-coordinator',
      entityId: row.entityId || String(row.entityPk || ''),
      entityType: mapEntityType(row.entityTableName) as
        | 'document'
        | 'event'
        | 'invoice'
        | 'lead'
        | 'matter'
        | 'message'
        | 'payment'
        | 'user',
      id: row.id,
      newValue: row.newValue || undefined,
      oldValue: row.oldValue || undefined,
      sourceModule: row.sourceModule,
      timestamp: toUiDateTime(row.timestamp),
    })),
  };
};
