import type { RowDataPacket } from 'mysql2/promise';
import { getMysqlPool } from '../../lib/mysql.js';
import { selectAll, withConnection } from '../../lib/mysqlUtils.js';
import { fromMysqlDateTime } from '../../lib/datetime.js';

interface AuditRow extends RowDataPacket {
  action_code: string;
  action_label: string;
  actor_name: string | null;
  entity_pk: number | null;
  entity_table_name: string;
  occurred_at: string;
  public_id: string;
  source_module: string;
  summary_new_value: string | null;
  summary_old_value: string | null;
}

interface AuditDetailRow extends AuditRow {
  actor_role_code_snapshot: string;
  ip_address: string | null;
  request_correlation_id: string | null;
  user_agent: string | null;
}

interface AuditChangeRow extends RowDataPacket {
  field_name: string;
  id: number;
  new_value_text: string | null;
  old_value_text: string | null;
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

const escapeCsvValue = (value: string | number | null | undefined) => {
  const stringValue = value == null ? '' : String(value);

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

export const adminAuditService = {
  async listAudit(options: {
    actorName?: string;
    entityTableName?: string;
    limit?: number;
    search?: string;
    sourceModule?: string;
  } = {}) {
    return withConnection(getMysqlPool(), async (connection) => {
      const limit = Math.min(Math.max(options.limit || 50, 1), 200);
      const values: Array<string | number> = [];
      const clauses: string[] = [];

      if (options.sourceModule?.trim()) {
        clauses.push('ae.source_module = ?');
        values.push(options.sourceModule.trim());
      }

      if (options.entityTableName?.trim()) {
        clauses.push('ae.entity_table_name = ?');
        values.push(options.entityTableName.trim());
      }

      if (options.actorName?.trim()) {
        clauses.push("COALESCE(actor.display_name, '') LIKE ? ESCAPE '\\\\'");
        values.push(`%${escapeLike(options.actorName.trim())}%`);
      }

      if (options.search?.trim()) {
        const like = `%${escapeLike(options.search.trim())}%`;
        clauses.push(
          "(ae.action_label LIKE ? ESCAPE '\\\\' OR ae.summary_new_value LIKE ? ESCAPE '\\\\' OR ae.summary_old_value LIKE ? ESCAPE '\\\\')"
        );
        values.push(like, like, like);
      }

      const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

      const rows = await selectAll<AuditRow>(
        connection,
        `SELECT
           ae.public_id,
           ae.entity_table_name,
           ae.entity_pk,
           ae.action_code,
           ae.action_label,
           ae.source_module,
           ae.summary_old_value,
           ae.summary_new_value,
           ae.occurred_at,
           actor.display_name AS actor_name
         FROM audit_events ae
         LEFT JOIN users actor
           ON actor.id = ae.actor_user_id
         ${whereClause}
         ORDER BY ae.occurred_at DESC
         LIMIT ?`,
        [...values, limit]
      );

      return rows.map((row) => ({
        actionCode: row.action_code,
        actionLabel: row.action_label,
        actorName: row.actor_name,
        entityPk: row.entity_pk,
        entityTableName: row.entity_table_name,
        id: row.public_id,
        occurredAt: fromMysqlDateTime(row.occurred_at),
        sourceModule: row.source_module,
        summaryNewValue: row.summary_new_value,
        summaryOldValue: row.summary_old_value,
      }));
    });
  },

  async downloadAuditCsv(options: {
    actorName?: string;
    entityTableName?: string;
    limit?: number;
    search?: string;
    sourceModule?: string;
  } = {}) {
    const rows = await this.listAudit(options);

    return [
      'id,occurredAt,sourceModule,entityTableName,entityPk,actionCode,actionLabel,actorName,summaryOldValue,summaryNewValue',
      ...rows.map((row) =>
        [
          row.id,
          row.occurredAt,
          row.sourceModule,
          row.entityTableName,
          row.entityPk,
          row.actionCode,
          row.actionLabel,
          row.actorName,
          row.summaryOldValue,
          row.summaryNewValue,
        ]
          .map(escapeCsvValue)
          .join(',')
      ),
    ].join('\n');
  },

  async getAuditDetail(auditPublicId: string) {
    return withConnection(getMysqlPool(), async (connection) => {
      const detail = await selectAll<AuditDetailRow>(
        connection,
        `SELECT
           ae.public_id,
           ae.entity_table_name,
           ae.entity_pk,
           ae.action_code,
           ae.action_label,
           ae.source_module,
           ae.summary_old_value,
           ae.summary_new_value,
           ae.occurred_at,
           ae.actor_role_code_snapshot,
           ae.request_correlation_id,
           ae.ip_address,
           ae.user_agent,
           actor.display_name AS actor_name
         FROM audit_events ae
         LEFT JOIN users actor
           ON actor.id = ae.actor_user_id
         WHERE ae.public_id = ?
         LIMIT 1`,
        [auditPublicId]
      );

      const row = detail[0];
      if (!row?.public_id) {
        return null;
      }

      const changes = await selectAll<AuditChangeRow>(
        connection,
        `SELECT id, field_name, old_value_text, new_value_text
         FROM audit_event_changes
         WHERE audit_event_id = (
           SELECT id FROM audit_events WHERE public_id = ? LIMIT 1
         )
         ORDER BY id ASC`,
        [auditPublicId]
      );

      return {
        actionCode: row.action_code,
        actionLabel: row.action_label,
        actorName: row.actor_name,
        actorRoleCodeSnapshot: row.actor_role_code_snapshot,
        changes: changes.map((entry) => ({
          fieldName: entry.field_name,
          id: Number(entry.id),
          newValueText: entry.new_value_text,
          oldValueText: entry.old_value_text,
        })),
        entityPk: row.entity_pk,
        entityTableName: row.entity_table_name,
        id: row.public_id,
        ipAddress: row.ip_address,
        occurredAt: fromMysqlDateTime(row.occurred_at),
        requestCorrelationId: row.request_correlation_id,
        sourceModule: row.source_module,
        summaryNewValue: row.summary_new_value,
        summaryOldValue: row.summary_old_value,
        userAgent: row.user_agent,
      };
    });
  },
};
