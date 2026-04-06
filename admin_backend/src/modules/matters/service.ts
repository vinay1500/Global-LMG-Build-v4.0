import type { RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { createPublicId } from '../../lib/ids.js';
import { getMysqlPool } from '../../lib/mysql.js';
import { notFound } from '../../lib/httpErrors.js';
import { executeResult, selectAll, selectOne, withConnection, withTransaction } from '../../lib/mysqlUtils.js';
import { fromMysqlDateTime, nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { domainService } from '../domain/service.js';
import { adminNotificationService } from '../notifications/service.js';

const createMatterUpdateSchema = z.object({
  bodyText: z.string().trim().min(2).max(4000),
  title: z.string().trim().min(2).max(255),
  typeCode: z.string().trim().min(2).max(64).default('status'),
  visibleToClient: z.boolean().default(true),
});

const createInternalNoteSchema = z.object({
  bodyText: z.string().trim().min(2).max(4000),
});

interface MatterListRow extends RowDataPacket {
  client_display_name: string;
  current_stage_code: string;
  current_stage_label: string;
  issue_summary: string;
  last_activity_at: string;
  legal_domain_name: string;
  matter_number: string;
  operational_status_code: string;
  priority_code: string;
  public_id: string;
  title: string;
  urgency_code: string;
}

interface CountRow extends RowDataPacket {
  count_value: number;
}

interface ThreadRow extends RowDataPacket {
  last_message_at: string | null;
  public_id: string;
  subject: string | null;
  thread_number: string;
}

interface NoteRow extends RowDataPacket {
  body_text: string;
  created_at: string;
  display_name: string;
  public_id: string;
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

export const adminMatterService = {
  createInternalNoteSchema,
  createMatterUpdateSchema,

  async listMatters(options: {
    limit?: number;
    offset?: number;
    search?: string;
    stageCode?: string;
    statusCode?: string;
  } = {}) {
    return withConnection(getMysqlPool(), async (connection) => {
      const limit = Math.min(Math.max(options.limit || 20, 1), 100);
      const offset = Math.max(options.offset || 0, 0);
      const whereParts = ['m.archived_at IS NULL'];
      const values: Array<string | number> = [];

      if (options.search?.trim()) {
        const like = `%${escapeLike(options.search.trim())}%`;
        whereParts.push(
          `(m.title LIKE ? ESCAPE '\\\\' OR m.matter_number LIKE ? ESCAPE '\\\\' OR ca.display_name LIKE ? ESCAPE '\\\\' OR m.issue_summary LIKE ? ESCAPE '\\\\')`
        );
        values.push(like, like, like, like);
      }

      if (options.stageCode?.trim()) {
        whereParts.push('m.current_stage_code = ?');
        values.push(options.stageCode.trim());
      }

      if (options.statusCode?.trim()) {
        whereParts.push('m.operational_status_code = ?');
        values.push(options.statusCode.trim());
      }

      const whereClause = `WHERE ${whereParts.join(' AND ')}`;

      const rows = await selectAll<MatterListRow>(
        connection,
        `SELECT
           m.public_id,
           m.matter_number,
           m.title,
           m.issue_summary,
           m.current_stage_code,
           ms.label AS current_stage_label,
           m.operational_status_code,
           pur.urgency_code,
           m.priority_code,
           ca.display_name AS client_display_name,
           ld.domain_name AS legal_domain_name,
           m.last_activity_at
         FROM matters m
         INNER JOIN client_accounts ca
           ON ca.id = m.client_account_id
         INNER JOIN matter_stages ms
           ON ms.code = m.current_stage_code
         INNER JOIN pricing_urgency_rules pur
           ON pur.id = m.urgency_rule_id
         INNER JOIN legal_domains ld
           ON ld.id = m.legal_domain_id
         ${whereClause}
         ORDER BY m.last_activity_at DESC
         LIMIT ?
         OFFSET ?`,
        [...values, limit, offset]
      );

      const total = await selectOne<CountRow>(
        connection,
        `SELECT COUNT(*) AS count_value
         FROM matters m
         INNER JOIN client_accounts ca
           ON ca.id = m.client_account_id
         ${whereClause}`,
        values
      );

      return {
        items: rows.map((row) => ({
          clientName: row.client_display_name,
          currentStageCode: row.current_stage_code,
          currentStageLabel: row.current_stage_label,
          id: row.public_id,
          issueSummary: row.issue_summary,
          lastActivityAt: fromMysqlDateTime(row.last_activity_at),
          legalDomainName: row.legal_domain_name,
          matterNumber: row.matter_number,
          operationalStatusCode: row.operational_status_code,
          priorityCode: row.priority_code,
          title: row.title,
          urgencyCode: row.urgency_code,
        })),
        limit,
        offset,
        total: Number(total?.count_value || 0),
      };
    });
  },

  async getMatterWorkspace(matterPublicId: string) {
    const matter = await domainService.getMatterByPublicId(matterPublicId);

    return withConnection(getMysqlPool(), async (connection) => {
      const threads = await selectAll<ThreadRow>(
        connection,
        `SELECT
           ct.public_id,
           ct.thread_number,
           ct.subject,
           ct.last_message_at
         FROM conversation_threads ct
         INNER JOIN matters m
           ON m.id = ct.matter_id
         WHERE m.public_id = ?
           AND ct.archived_at IS NULL
         ORDER BY ct.last_message_at DESC`,
        [matterPublicId]
      );

      const notes = await selectAll<NoteRow>(
        connection,
        `SELECT
           n.public_id,
           n.body_text,
           n.created_at,
           u.display_name
         FROM admin_internal_notes n
         INNER JOIN users u
           ON u.id = n.created_by_user_id
         WHERE n.entity_type_code = 'matter'
           AND n.entity_public_id = ?
         ORDER BY n.created_at DESC`,
        [matterPublicId]
      );

      const events = await selectAll<RowDataPacket & {
        public_id: string;
        scheduled_start_at: string;
        status_code: string;
        title: string;
      }>(
        connection,
        `SELECT public_id, title, status_code, scheduled_start_at
         FROM events
         WHERE matter_id = (SELECT id FROM matters WHERE public_id = ? LIMIT 1)
         ORDER BY scheduled_start_at DESC`,
        [matterPublicId]
      );

      return {
        events: events.map((entry) => ({
          id: String(entry.public_id),
          scheduledStartAt: fromMysqlDateTime(entry.scheduled_start_at),
          statusCode: String(entry.status_code),
          title: String(entry.title),
        })),
        internalNotes: notes.map((entry) => ({
          bodyText: entry.body_text,
          createdAt: fromMysqlDateTime(entry.created_at),
          createdByName: entry.display_name,
          id: entry.public_id,
        })),
        matter,
        threads: threads.map((entry) => ({
          id: entry.public_id,
          lastMessageAt: fromMysqlDateTime(entry.last_message_at),
          subject: entry.subject,
          threadNumber: entry.thread_number,
        })),
      };
    });
  },

  async createMatterUpdate(
    actorUserId: number,
    actorRoleCode: string,
    matterPublicId: string,
    input: z.infer<typeof createMatterUpdateSchema>
  ) {
    const payload = createMatterUpdateSchema.parse(input);
    const timestamp = toMysqlDateTime(nowUtc());

    return withTransaction(getMysqlPool(), async (connection) => {
      const matter = await selectOne<RowDataPacket>(
        connection,
        'SELECT id, client_account_id FROM matters WHERE public_id = ? LIMIT 1',
        [matterPublicId]
      );

      if (!matter?.id) {
        throw notFound('matter_not_found', 'Matter not found.');
      }

      const insert = await executeResult(
        connection,
        `INSERT INTO matter_updates (
          matter_id, update_type_code, title, body_text, visible_to_client,
          created_by_user_id, created_at, edited_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(matter.id),
          payload.typeCode,
          payload.title,
          payload.bodyText,
          payload.visibleToClient ? 1 : 0,
          actorUserId,
          timestamp,
          null,
        ]
      );

      await connection.execute(
        `UPDATE matters
         SET last_activity_at = ?, updated_at = ?, row_version = row_version + 1
         WHERE id = ?`,
        [timestamp, timestamp, Number(matter.id)]
      );

      if (payload.visibleToClient) {
        const recipients = await adminNotificationService.listClientRecipients(
          connection,
          Number(matter.client_account_id)
        );
        await adminNotificationService.insertNotifications(
          connection,
          recipients.map((entry) => entry.userId),
          {
            bodyText: payload.bodyText,
            matterId: Number(matter.id),
            notificationTypeCode: 'matter_update',
            priorityCode: 'normal',
            title: payload.title,
          }
        );
      }

      await adminNotificationService.insertAuditEvent(connection, {
        actionCode: 'matter_update_created',
        actionLabel: 'Matter update created',
        actorRoleCodeSnapshot: actorRoleCode,
        actorUserId,
        entityPk: Number(matter.id),
        entityTableName: 'matters',
        sourceModule: 'Admin Matters',
        summaryNewValue: payload.title,
      });

      return {
        matterId: matterPublicId,
        updateId: Number(insert.insertId),
      };
    });
  },

  async addInternalNote(
    actorUserId: number,
    actorRoleCode: string,
    matterPublicId: string,
    input: z.infer<typeof createInternalNoteSchema>
  ) {
    const payload = createInternalNoteSchema.parse(input);
    const timestamp = toMysqlDateTime(nowUtc());

    return withTransaction(getMysqlPool(), async (connection) => {
      const matter = await selectOne<RowDataPacket>(
        connection,
        'SELECT id FROM matters WHERE public_id = ? LIMIT 1',
        [matterPublicId]
      );

      if (!matter?.id) {
        throw notFound('matter_not_found', 'Matter not found.');
      }

      const insert = await executeResult(
        connection,
        `INSERT INTO admin_internal_notes (
          public_id, entity_type_code, entity_public_id, matter_id, client_account_id, created_by_user_id,
          body_text, visibility_scope_code, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createPublicId(),
          'matter',
          matterPublicId,
          Number(matter.id),
          null,
          actorUserId,
          payload.bodyText,
          'internal',
          timestamp,
          timestamp,
        ]
      );

      await adminNotificationService.insertAuditEvent(connection, {
        actionCode: 'matter_internal_note_added',
        actionLabel: 'Matter internal note added',
        actorRoleCodeSnapshot: actorRoleCode,
        actorUserId,
        entityPk: Number(matter.id),
        entityTableName: 'matters',
        sourceModule: 'Admin Matters',
        summaryNewValue: payload.bodyText,
      });

      return {
        noteId: Number(insert.insertId),
      };
    });
  },
};
