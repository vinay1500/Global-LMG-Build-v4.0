import type { RowDataPacket } from 'mysql2/promise';
import type { AdminActor } from '../auth/service.js';
import { executeStatement, queryRows, withTransaction } from '../../lib/mysql.js';
import { fetchDocuments } from '../shared.js';
import { createAuditEvent, createClientNotifications, resolveDocumentByPublicId } from '../writeSupport.js';

type DocumentMetaRow = RowDataPacket & {
  clientAccountId: number;
  currentVersionId: number | null;
  matterId: number | null;
  visibilityScope: string;
  virusStatus: string | null;
};

export const listDocuments = async () => {
  return {
    documents: await fetchDocuments({}),
  };
};

const toVisibilityScope = (visibility: 'client' | 'internal') =>
  visibility === 'client' ? 'client-portal' : 'internal-only';

const toVirusStatus = (reviewState: 'reviewed' | 'unreviewed') =>
  reviewState === 'reviewed' ? 'clean' : 'pending';

export const updateDocumentControls = async (
  actor: AdminActor,
  documentId: string,
  payload: {
    reviewState: 'reviewed' | 'unreviewed';
    visibility: 'client' | 'internal';
  }
) => {
  return withTransaction(async (connection) => {
    const document = await resolveDocumentByPublicId(documentId, connection);
    const metaRows = await queryRows<DocumentMetaRow>(
      `SELECT
         d.owner_client_account_id AS clientAccountId,
         d.visibility_scope_code AS visibilityScope,
         dv.id AS currentVersionId,
         dv.virus_scan_status_code AS virusStatus,
         MAX(md.matter_id) AS matterId
       FROM documents d
       LEFT JOIN document_versions dv ON dv.document_id = d.id AND dv.is_current = 1
       LEFT JOIN matter_documents md ON md.document_id = d.id
       WHERE d.id = ?
       GROUP BY d.owner_client_account_id, d.visibility_scope_code, dv.id, dv.virus_scan_status_code`,
      [document.id],
      connection
    );
    const meta = metaRows[0];

    if (!meta) {
      throw new Error('Document metadata could not be resolved.');
    }

    const nextVisibilityScope = toVisibilityScope(payload.visibility);
    const nextVirusStatus = toVirusStatus(payload.reviewState);

    await executeStatement(
      `UPDATE documents
       SET visibility_scope_code = ?,
           updated_at = UTC_TIMESTAMP(6),
           row_version = row_version + 1
       WHERE id = ?`,
      [nextVisibilityScope, document.id],
      connection
    );

    if (meta.currentVersionId) {
      await executeStatement(
        `UPDATE document_versions
         SET virus_scan_status_code = ?
         WHERE id = ?`,
        [nextVirusStatus, meta.currentVersionId],
        connection
      );
    }

    await createAuditEvent(
      {
        actionCode: 'document.controls.updated',
        actionLabel: 'Document controls updated',
        actorRoleCode: actor.roleCodes[0] || 'case_manager',
        actorUserId: actor.userId,
        changes: [
          {
            fieldName: 'visibility_scope_code',
            oldValue: meta.visibilityScope,
            newValue: nextVisibilityScope,
          },
          {
            fieldName: 'virus_scan_status_code',
            oldValue: meta.virusStatus || 'pending',
            newValue: nextVirusStatus,
          },
        ],
        entityPk: document.id,
        entityTableName: 'documents',
        sourceModule: 'documents_center',
        summaryOldValue: `${meta.visibilityScope} / ${meta.virusStatus || 'pending'}`,
        summaryNewValue: `${nextVisibilityScope} / ${nextVirusStatus}`,
      },
      connection
    );

    if (payload.visibility === 'client') {
      await createClientNotifications(
        {
          bodyText: 'A document has been reviewed and shared to your portal.',
          clientAccountId: meta.clientAccountId,
          documentId: document.id,
          matterId: meta.matterId,
          notificationTypeCode: 'document_uploaded',
          priorityCode: 'normal',
          title: 'Document shared to your portal',
        },
        connection
      );
    }

    return { status: 'updated' as const };
  });
};
