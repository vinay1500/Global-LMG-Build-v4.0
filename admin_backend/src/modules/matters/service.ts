import type { RowDataPacket } from 'mysql2/promise';
import { badRequest, notFound } from '../../lib/httpErrors.js';
import { executeStatement, queryRows, withTransaction } from '../../lib/mysql.js';
import { fetchDocuments, fetchEvents, fetchInvoices, fetchMatters, fetchThreads } from '../shared.js';
import type { AdminActor } from '../auth/service.js';
import {
  createAuditEvent,
  createClientNotifications,
  resolveCounselByPublicId,
  resolveInternalUserByPublicId,
  resolveMatterByPublicId,
  touchMatterActivity,
} from '../writeSupport.js';

export const listMatters = async (options: { limit: number; search?: string }) => {
  return {
    matters: await fetchMatters({
      limit: options.limit,
      search: options.search,
    }),
  };
};

type InternalUserRow = RowDataPacket & { id: string; name: string };
type CounselRow = RowDataPacket & { id: string; name: string };
type MatterUpdateRow = RowDataPacket & {
  clientAccountId: number;
  currentStageCode: string;
  issueSummary: string;
  operationalStatusCode: string;
  paidAmount: number;
  quotedTotalAmount: number;
};

const getAssignmentOptions = async () => {
  const [staffRows, counselRows] = await Promise.all([
    queryRows<InternalUserRow>(
      `SELECT u.public_id AS id, u.display_name AS name
       FROM users u
       LEFT JOIN user_roles ur
         ON ur.user_id = u.id
        AND ur.is_active = 1
        AND (ur.starts_at IS NULL OR ur.starts_at <= UTC_TIMESTAMP(6))
        AND (ur.ends_at IS NULL OR ur.ends_at >= UTC_TIMESTAMP(6))
       WHERE u.archived_at IS NULL
         AND u.login_enabled = 1
         AND u.actor_type_code <> 'client'
       GROUP BY u.public_id, u.display_name
       ORDER BY u.display_name ASC`
    ),
    queryRows<CounselRow>(
      `SELECT public_id AS id, full_name AS name
       FROM counsel_partners
       WHERE archived_at IS NULL
       ORDER BY full_name ASC`
    ),
  ]);

  return {
    counsel: counselRows,
    staff: staffRows,
  };
};

export const getMatterWorkspace = async (matterId: string) => {
  const matters = await fetchMatters({ matterIds: [matterId] });
  const matter = matters[0];

  if (!matter) {
    throw notFound('matter_not_found', 'Matter not found.');
  }

  return {
    assignmentOptions: await getAssignmentOptions(),
    documents: await fetchDocuments({ matterIds: [matterId] }),
    events: await fetchEvents({ matterIds: [matterId] }),
    invoices: await fetchInvoices({ matterIds: [matterId] }),
    matter,
    threads: await fetchThreads({ matterIds: [matterId] }),
  };
};

export const updateMatterStage = async (
  actor: AdminActor,
  matterId: string,
  payload: {
    changeNote?: string;
    operationalStatusCode?: string;
    stageCode: string;
    visibleToClient?: boolean;
  }
) => {
  return withTransaction(async (connection) => {
    const matter = await resolveMatterByPublicId(matterId, connection);
    const metaRows = await queryRows<MatterUpdateRow>(
      `SELECT
         client_account_id AS clientAccountId,
         current_stage_code AS currentStageCode,
         operational_status_code AS operationalStatusCode,
         issue_summary AS issueSummary,
         quoted_total_amount AS quotedTotalAmount,
         paid_total_amount AS paidAmount
       FROM matters
       WHERE id = ?
       LIMIT 1`,
      [matter.id],
      connection
    );
    const meta = metaRows[0];

    await executeStatement(
      `UPDATE matters
       SET current_stage_code = ?,
           operational_status_code = COALESCE(?, operational_status_code),
           last_activity_at = UTC_TIMESTAMP(6),
           updated_at = UTC_TIMESTAMP(6),
           row_version = row_version + 1
       WHERE id = ?`,
      [payload.stageCode, payload.operationalStatusCode || null, matter.id],
      connection
    );

    await executeStatement(
      `UPDATE matter_stage_history
       SET exited_at = UTC_TIMESTAMP(6)
       WHERE matter_id = ?
         AND exited_at IS NULL`,
      [matter.id],
      connection
    );

    await executeStatement(
      `INSERT INTO matter_stage_history (
         matter_id,
         stage_code,
         entered_at,
         exited_at,
         changed_by_user_id,
         visible_to_client,
         change_note
       ) VALUES (?, ?, UTC_TIMESTAMP(6), NULL, ?, ?, ?)`,
      [matter.id, payload.stageCode, actor.userId, payload.visibleToClient ? 1 : 0, payload.changeNote || null],
      connection
    );

    await touchMatterActivity(matter.id, connection);

    await createAuditEvent(
      {
        actionCode: 'matter.stage.updated',
        actionLabel: 'Matter stage updated',
        actorRoleCode: actor.roleCodes[0] || 'case_manager',
        actorUserId: actor.userId,
        changes: [
          {
            fieldName: 'current_stage_code',
            oldValue: meta?.currentStageCode,
            newValue: payload.stageCode,
          },
          payload.operationalStatusCode
            ? {
                fieldName: 'operational_status_code',
                oldValue: meta?.operationalStatusCode,
                newValue: payload.operationalStatusCode,
              }
            : null,
        ].filter(Boolean) as Array<{ fieldName: string; oldValue?: unknown; newValue?: unknown }>,
        entityPk: matter.id,
        entityTableName: 'matters',
        sourceModule: 'matter_detail',
        summaryOldValue: meta?.currentStageCode,
        summaryNewValue: payload.stageCode,
      },
      connection
    );

    if (payload.visibleToClient) {
      await createClientNotifications(
        {
          bodyText: payload.changeNote || 'Your matter has moved to the next lifecycle stage.',
          clientAccountId: meta.clientAccountId,
          matterId: matter.id,
          notificationTypeCode: 'matter_update',
          priorityCode: 'normal',
          title: 'Matter stage updated',
        },
        connection
      );
    }

    return { status: 'updated' as const };
  });
};

export const addMatterNote = async (
  actor: AdminActor,
  matterId: string,
  payload: {
    bodyText: string;
    title: string;
    visibleToClient?: boolean;
  }
) => {
  return withTransaction(async (connection) => {
    const matter = await resolveMatterByPublicId(matterId, connection);
    const metaRows = await queryRows<MatterUpdateRow>(
      `SELECT client_account_id AS clientAccountId
       FROM matters
       WHERE id = ?
       LIMIT 1`,
      [matter.id],
      connection
    );
    const meta = metaRows[0];

    await executeStatement(
      `INSERT INTO matter_updates (
         matter_id,
         update_type_code,
         title,
         body_text,
         visible_to_client,
         created_by_user_id,
         created_at,
         edited_at
       ) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(6), NULL)`,
      [
        matter.id,
        payload.visibleToClient ? 'client-update' : 'internal-note',
        payload.title,
        payload.bodyText,
        payload.visibleToClient ? 1 : 0,
        actor.userId,
      ],
      connection
    );

    await touchMatterActivity(matter.id, connection);

    await createAuditEvent(
      {
        actionCode: payload.visibleToClient ? 'matter.client_note.created' : 'matter.internal_note.created',
        actionLabel: payload.visibleToClient ? 'Client-visible update added' : 'Internal note added',
        actorRoleCode: actor.roleCodes[0] || 'case_manager',
        actorUserId: actor.userId,
        changes: [{ fieldName: 'body_text', newValue: payload.bodyText }],
        entityPk: matter.id,
        entityTableName: 'matters',
        sourceModule: 'matter_detail',
        summaryNewValue: payload.bodyText,
      },
      connection
    );

    if (payload.visibleToClient) {
      await createClientNotifications(
        {
          bodyText: payload.bodyText,
          clientAccountId: meta.clientAccountId,
          matterId: matter.id,
          notificationTypeCode: 'matter_update',
          priorityCode: 'normal',
          title: payload.title,
        },
        connection
      );
    }

    return { status: 'created' as const };
  });
};

export const createMatterAssignment = async (
  actor: AdminActor,
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
) => {
  return withTransaction(async (connection) => {
    const matter = await resolveMatterByPublicId(matterId, connection);
    const internalUser = payload.internalUserId
      ? await resolveInternalUserByPublicId(payload.internalUserId, connection)
      : null;
    const counsel = payload.counselPartnerId
      ? await resolveCounselByPublicId(payload.counselPartnerId, connection)
      : null;

    if (!internalUser && !counsel) {
      throw badRequest(
        'assignment_target_required',
        'Either an internal user or a counsel partner must be assigned.'
      );
    }

    if (payload.isPrimary) {
      await executeStatement(
        `UPDATE matter_assignments
         SET removed_at = UTC_TIMESTAMP(6)
         WHERE matter_id = ?
           AND assignment_role_code = ?
           AND removed_at IS NULL
           AND is_primary = 1`,
        [matter.id, payload.assignmentRoleCode],
        connection
      );
    }

    await executeStatement(
      `INSERT INTO matter_assignments (
         matter_id,
         assignment_role_code,
         internal_user_id,
         counsel_partner_id,
         is_primary,
         fee_agreed_amount,
         fee_paid_amount,
         fee_due_amount,
         assigned_by_user_id,
         assigned_at,
         removed_at,
         assignment_status_code,
         notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(6), NULL, 'active', ?)`,
      [
        matter.id,
        payload.assignmentRoleCode,
        internalUser?.id || null,
        counsel?.id || null,
        payload.isPrimary ? 1 : 0,
        payload.feeAgreedAmount ?? null,
        payload.feePaidAmount ?? null,
        payload.feeDueAmount ?? null,
        actor.userId,
        payload.notes || null,
      ],
      connection
    );

    await touchMatterActivity(matter.id, connection);

    await createAuditEvent(
      {
        actionCode: 'matter.assignment.created',
        actionLabel: 'Matter assignment created',
        actorRoleCode: actor.roleCodes[0] || 'case_manager',
        actorUserId: actor.userId,
        changes: [
          { fieldName: 'assignment_role_code', newValue: payload.assignmentRoleCode },
          { fieldName: 'internal_user_id', newValue: payload.internalUserId },
          { fieldName: 'counsel_partner_id', newValue: payload.counselPartnerId },
        ],
        entityPk: matter.id,
        entityTableName: 'matters',
        sourceModule: 'matter_detail',
        summaryNewValue: payload.assignmentRoleCode,
      },
      connection
    );

    return { status: 'created' as const };
  });
};

export const updateMatterDetails = async (
  actor: AdminActor,
  matterId: string,
  payload: {
    issueSummary?: string;
    operationalStatusCode?: string;
    quotedTotalAmount?: number;
    selectedServices?: string[];
  }
) => {
  return withTransaction(async (connection) => {
    const matter = await resolveMatterByPublicId(matterId, connection);
    const metaRows = await queryRows<MatterUpdateRow>(
      `SELECT
         client_account_id AS clientAccountId,
         current_stage_code AS currentStageCode,
         operational_status_code AS operationalStatusCode,
         issue_summary AS issueSummary,
         quoted_total_amount AS quotedTotalAmount,
         paid_total_amount AS paidAmount
       FROM matters
       WHERE id = ?
       LIMIT 1`,
      [matter.id],
      connection
    );
    const meta = metaRows[0];

    const nextQuotedAmount = payload.quotedTotalAmount ?? meta.quotedTotalAmount;
    const nextDueAmount = Math.max(nextQuotedAmount - meta.paidAmount, 0);

    await executeStatement(
      `UPDATE matters
       SET issue_summary = COALESCE(?, issue_summary),
           operational_status_code = COALESCE(?, operational_status_code),
           quoted_total_amount = ?,
           due_total_amount = ?,
           last_activity_at = UTC_TIMESTAMP(6),
           updated_at = UTC_TIMESTAMP(6),
           row_version = row_version + 1
       WHERE id = ?`,
      [
        payload.issueSummary ?? null,
        payload.operationalStatusCode ?? null,
        nextQuotedAmount,
        nextDueAmount,
        matter.id,
      ],
      connection
    );

    if (payload.selectedServices) {
      const serviceRows = await queryRows<RowDataPacket & { id: number; serviceCode: string }>(
        `SELECT id, service_code AS serviceCode
         FROM services
         WHERE service_code IN (${payload.selectedServices.map(() => '?').join(', ')})`,
        payload.selectedServices,
        connection
      );

      if (serviceRows.length !== payload.selectedServices.length) {
        throw badRequest('invalid_service_codes', 'One or more selected services are invalid.');
      }

      await executeStatement(`DELETE FROM matter_services WHERE matter_id = ?`, [matter.id], connection);

      for (const [index, serviceCode] of payload.selectedServices.entries()) {
        const service = serviceRows.find((row) => row.serviceCode === serviceCode);
        if (!service) {
          continue;
        }

        await executeStatement(
          `INSERT INTO matter_services (
             matter_id,
             service_id,
             final_fee,
             service_status_code,
             completed_at,
             created_at
           ) VALUES (?, ?, 0, 'active', NULL, UTC_TIMESTAMP(6))`,
          [matter.id, service.id],
          connection
        );
      }
    }

    await touchMatterActivity(matter.id, connection);

    await createAuditEvent(
      {
        actionCode: 'matter.updated',
        actionLabel: 'Matter details updated',
        actorRoleCode: actor.roleCodes[0] || 'case_manager',
        actorUserId: actor.userId,
        changes: [
          payload.issueSummary !== undefined
            ? { fieldName: 'issue_summary', oldValue: meta.issueSummary, newValue: payload.issueSummary }
            : null,
          payload.operationalStatusCode !== undefined
            ? {
                fieldName: 'operational_status_code',
                oldValue: meta.operationalStatusCode,
                newValue: payload.operationalStatusCode,
              }
            : null,
          payload.quotedTotalAmount !== undefined
            ? {
                fieldName: 'quoted_total_amount',
                oldValue: meta.quotedTotalAmount,
                newValue: payload.quotedTotalAmount,
              }
            : null,
          payload.selectedServices !== undefined
            ? { fieldName: 'selected_services', newValue: payload.selectedServices }
            : null,
        ].filter(Boolean) as Array<{ fieldName: string; oldValue?: unknown; newValue?: unknown }>,
        entityPk: matter.id,
        entityTableName: 'matters',
        sourceModule: 'matter_detail',
      },
      connection
    );

    return { status: 'updated' as const };
  });
};
