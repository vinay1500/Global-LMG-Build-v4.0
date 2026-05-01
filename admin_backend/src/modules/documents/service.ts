import type { RowDataPacket } from 'mysql2/promise';
import type { AdminActor } from '../auth/service.js';
import { executeStatement, queryRows, withTransaction } from '../../lib/mysql.js';
import { fetchDocuments, fetchMatters } from '../shared.js';
import { createAuditEvent, createClientNotifications, resolveDocumentByPublicId } from '../writeSupport.js';
import { createPublicId } from '../../lib/authCrypto.js';
import { allocateBusinessNumber } from '../../lib/businessSequences.js';
import { badRequest, forbidden, notFound } from '../../lib/httpErrors.js';
import {
  assertSupportedDocumentUpload,
  computeSha256,
  getDocumentStorage,
  getFileExtension,
  isSafePreviewMimeType,
} from './storage.js';

type DocumentMetaRow = RowDataPacket & {
  clientAccountId: number;
  currentVersionId: number | null;
  matterId: number | null;
  visibilityScope: string;
  virusStatus: string | null;
};

type MatterUploadMetaRow = RowDataPacket & {
  clientAccountId: number;
  clientAccountPublicId: string;
  matterDbId: number;
  matterPublicId: string;
  matterTitle: string;
};

type DocumentDetailRow = RowDataPacket & {
  categoryCode: string;
  clientAccountId: number;
  clientAccountPublicId: string;
  documentDbId: number;
  documentNumber: string;
  id: string;
  title: string;
  visibilityScope: string;
};

type DocumentVersionRow = RowDataPacket & {
  checksumSha256: string;
  fileExtension: string;
  fileSizeBytes: number;
  id: string;
  isCurrent: number;
  mimeType: string;
  originalFileName: string;
  retentionHoldFlag: number;
  uploadedAt: string;
  uploadedBy: string | null;
  versionNo: number;
  virusStatus: string;
};

type DocumentFileRow = RowDataPacket & {
  documentDbId: number;
  documentVersionDbId: number;
  mimeType: string;
  originalFileName: string;
  storagePath: string;
  virusStatus: string;
};

type DocumentMatterRow = RowDataPacket & {
  matterId: number | null;
};

type ActiveDocumentTypeRow = RowDataPacket & {
  allowedExtensionsJson: unknown;
  clientVisibleDefault: number;
  code: string;
  maxSizeMb: number;
  requiresReview: number;
};

const storageDriver = getDocumentStorage();

export const listDocuments = async () => {
  const documentTypeRows = await queryRows<
    RowDataPacket & {
      allowedExtensionsJson: unknown;
      category: string;
      clientVisibleDefault: number;
      code: string;
      description: string | null;
      displayOrder: number;
      id: string;
      isActive: number;
      maxSizeMb: number;
      name: string;
      requiresReview: number;
    }
  >(
    `SELECT
       public_id AS id,
       code,
       name,
       description,
       category,
       allowed_extensions_json AS allowedExtensionsJson,
       max_size_mb AS maxSizeMb,
       requires_review AS requiresReview,
       client_visible_default AS clientVisibleDefault,
       is_active AS isActive,
       display_order AS displayOrder
     FROM document_types
     WHERE archived_at IS NULL
     ORDER BY is_active DESC, display_order ASC, name ASC`
  );

  return {
    documents: await fetchDocuments({}),
    documentTypes: documentTypeRows.map((row) => ({
      allowedExtensions: parseJsonStringArray(row.allowedExtensionsJson),
      category: row.category,
      clientVisibleDefault: Boolean(row.clientVisibleDefault),
      code: row.code,
      description: row.description || '',
      displayOrder: Number(row.displayOrder || 0),
      id: row.id,
      isActive: Boolean(row.isActive),
      maxSizeMb: Number(row.maxSizeMb || 0),
      name: row.name,
      requiresReview: Boolean(row.requiresReview),
    })),
    matters: await fetchMatters({ limit: 250 }),
  };
};

const toVisibilityScope = (visibility: 'client' | 'internal') =>
  visibility === 'client' ? 'client-portal' : 'internal-only';

const toVirusStatus = (reviewState: 'reviewed' | 'unreviewed') =>
  reviewState === 'reviewed' ? 'clean' : 'pending';

const toReviewState = (virusStatus: string) => (virusStatus === 'clean' ? 'reviewed' : 'unreviewed');

const visibilityToUi = (visibilityScope: string) =>
  visibilityScope.toLowerCase().includes('internal') ? 'internal' : 'client';

const normalizeMimeType = (mimeType: string) => mimeType.trim().toLowerCase();

const parseJsonStringArray = (raw: unknown): string[] => {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
};

const getDocumentTypeByCode = async (
  categoryCode: string,
  executor: Parameters<typeof queryRows>[2],
  activeOnly = true
) => {
  const row = (
    await queryRows<ActiveDocumentTypeRow>(
      `SELECT
         code,
         allowed_extensions_json AS allowedExtensionsJson,
         max_size_mb AS maxSizeMb,
         requires_review AS requiresReview,
         client_visible_default AS clientVisibleDefault
       FROM document_types
       WHERE code = ?
         ${activeOnly ? 'AND is_active = 1 AND archived_at IS NULL' : ''}
       LIMIT 1`,
      [categoryCode],
      executor
    )
  )[0];

  if (!row) {
    throw badRequest(
      'invalid_document_type',
      activeOnly ? 'Select an active document type.' : 'Document type could not be resolved for this document.'
    );
  }

  return row;
};

const assertDocumentTypeAllowsFile = (documentType: ActiveDocumentTypeRow, fileName: string, sizeBytes: number) => {
  const extension = getFileExtension(fileName).replace(/^\./, '').toLowerCase();
  const allowedExtensions = parseJsonStringArray(documentType.allowedExtensionsJson).map((value) =>
    value.replace(/^\./, '').toLowerCase()
  );
  const maxBytes = Number(documentType.maxSizeMb || 0) * 1024 * 1024;

  if (allowedExtensions.length && !allowedExtensions.includes(extension)) {
    throw badRequest(
      'document_type_extension_blocked',
      `This document type allows: ${allowedExtensions.join(', ')}.`
    );
  }

  if (maxBytes > 0 && sizeBytes > maxBytes) {
    throw badRequest('document_type_size_exceeded', `This document type allows files up to ${documentType.maxSizeMb} MB.`);
  }
};

const mapDocumentVersion = (row: DocumentVersionRow) => ({
  checksumSha256: row.checksumSha256,
  fileExtension: row.fileExtension,
  fileSizeBytes: Number(row.fileSizeBytes || 0),
  id: row.id,
  isCurrent: Boolean(row.isCurrent),
  mimeType: row.mimeType,
  originalFileName: row.originalFileName,
  retentionHold: Boolean(row.retentionHoldFlag),
  reviewState: toReviewState(row.virusStatus),
  uploadedAt: row.uploadedAt,
  uploadedBy: row.uploadedBy || 'System',
  versionNo: Number(row.versionNo),
  virusStatus: row.virusStatus,
});

const getMatterUploadMeta = async (matterPublicId: string, executor?: Parameters<typeof queryRows>[2]) => {
  const rows = await queryRows<MatterUploadMetaRow>(
    `SELECT
       m.id AS matterDbId,
       m.public_id AS matterPublicId,
       m.title AS matterTitle,
       ca.id AS clientAccountId,
       ca.public_id AS clientAccountPublicId
     FROM matters m
     INNER JOIN client_accounts ca ON ca.id = m.client_account_id
     WHERE m.public_id = ?
       AND m.archived_at IS NULL
     LIMIT 1`,
    [matterPublicId],
    executor
  );

  const matter = rows[0];
  if (!matter) {
    throw notFound('matter_not_found', 'Matter not found for document upload.');
  }

  return matter;
};

const getDocumentMatterId = async (documentDbId: number, executor?: Parameters<typeof queryRows>[2]) => {
  const rows = await queryRows<DocumentMatterRow>(
    `SELECT MAX(matter_id) AS matterId
     FROM matter_documents
     WHERE document_id = ?`,
    [documentDbId],
    executor
  );

  return rows[0]?.matterId || null;
};

export const uploadAdminDocument = async (
  actor: AdminActor,
  payload: {
    checksumSha256: string;
    content: Buffer;
    fileName: string;
    categoryCode?: string;
    matterId: string;
    mimeType: string;
    reviewState: 'reviewed' | 'unreviewed';
    visibility: 'client' | 'internal';
  }
) =>
  withTransaction(async (connection) => {
    await storageDriver.ensureReady();
    const matter = await getMatterUploadMeta(payload.matterId, connection);
    const checksumSha256 = computeSha256(payload.content);

    if (checksumSha256 !== payload.checksumSha256.toLowerCase()) {
      throw badRequest('upload_checksum_mismatch', 'Uploaded file checksum does not match the declared checksum.');
    }

    assertSupportedDocumentUpload({
      contentLength: payload.content.length,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      sha256: checksumSha256,
    });
    const categoryCode = payload.categoryCode?.trim() || 'attachment';
    const documentType = await getDocumentTypeByCode(categoryCode, connection);
    assertDocumentTypeAllowsFile(documentType, payload.fileName, payload.content.length);

    const documentPublicId = createPublicId();
    const documentNumber = await allocateBusinessNumber(connection, 'document', 'DOC');
    const storageKey = storageDriver.buildStorageKey(
      matter.clientAccountPublicId,
      documentPublicId,
      payload.fileName
    );
    await storageDriver.writeBuffer(storageKey, payload.content);

    const nowExpression = 'UTC_TIMESTAMP(6)';
    const documentInsert = await executeStatement(
      `INSERT INTO documents (
         public_id,
         document_number,
         owner_client_account_id,
         title,
         category_code,
         visibility_scope_code,
         current_version_no,
         created_by_user_id,
         created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ${nowExpression}, ${nowExpression})`,
      [
        documentPublicId,
        documentNumber,
        matter.clientAccountId,
        payload.fileName,
        categoryCode,
        toVisibilityScope(payload.visibility),
        actor.userId,
      ],
      connection
    );

    await executeStatement(
      `INSERT INTO document_versions (
         public_id,
         document_id,
         version_no,
         storage_driver_code,
         storage_path,
         original_file_name,
         mime_type,
         file_extension,
         file_size_bytes,
         checksum_sha256,
         virus_scan_status_code,
         uploaded_by_user_id,
         uploaded_at,
         is_current,
         retention_hold_flag
       ) VALUES (?, ?, 1, 'local', ?, ?, ?, ?, ?, ?, ?, ?, ${nowExpression}, 1, 0)`,
      [
        createPublicId(),
        documentInsert.insertId,
        storageKey,
        payload.fileName,
        normalizeMimeType(payload.mimeType),
        getFileExtension(payload.fileName),
        payload.content.length,
        checksumSha256,
        toVirusStatus(payload.reviewState),
        actor.userId,
      ],
      connection
    );

    await executeStatement(
      `INSERT INTO matter_documents (
         matter_id,
         document_id,
         link_role_code,
         created_at
       ) VALUES (?, ?, 'admin-upload', ${nowExpression})
       ON DUPLICATE KEY UPDATE link_role_code = VALUES(link_role_code)`,
      [matter.matterDbId, documentInsert.insertId],
      connection
    );

    await createAuditEvent(
      {
        actionCode: 'document.uploaded',
        actionLabel: 'Document uploaded',
        actorRoleCode: actor.roleCodes[0] || 'case_manager',
        actorUserId: actor.userId,
        changes: [
          { fieldName: 'matter_id', newValue: matter.matterPublicId },
          { fieldName: 'visibility_scope_code', newValue: toVisibilityScope(payload.visibility) },
          { fieldName: 'virus_scan_status_code', newValue: toVirusStatus(payload.reviewState) },
        ],
        entityPk: documentInsert.insertId,
        entityTableName: 'documents',
        sourceModule: 'documents_center',
        summaryNewValue: `${documentNumber}: ${payload.fileName}`,
      },
      connection
    );

    if (payload.visibility === 'client') {
      await createClientNotifications(
        {
          bodyText: `A document has been shared for ${matter.matterTitle}.`,
          clientAccountId: matter.clientAccountId,
          documentId: documentInsert.insertId,
          matterId: matter.matterDbId,
          notificationTypeCode: 'document_uploaded',
          priorityCode: 'normal',
          title: 'Document shared to your portal',
        },
        connection
      );
    }

    return {
      documentId: documentPublicId,
      status: 'uploaded' as const,
    };
  });

export const uploadAdminDocumentVersion = async (
  actor: AdminActor,
  documentId: string,
  payload: {
    checksumSha256: string;
    content: Buffer;
    fileName: string;
    mimeType: string;
    reviewState: 'reviewed' | 'unreviewed';
  }
) =>
  withTransaction(async (connection) => {
    await storageDriver.ensureReady();
    const document = await resolveDocumentByPublicId(documentId, connection);
    const detailRows = await queryRows<DocumentDetailRow>(
      `SELECT
         d.id AS documentDbId,
         d.public_id AS id,
         d.document_number AS documentNumber,
         d.owner_client_account_id AS clientAccountId,
         ca.public_id AS clientAccountPublicId,
         d.title,
         d.category_code AS categoryCode,
         d.visibility_scope_code AS visibilityScope
       FROM documents d
       INNER JOIN client_accounts ca ON ca.id = d.owner_client_account_id
       WHERE d.id = ?
         AND d.archived_at IS NULL
       LIMIT 1
       FOR UPDATE`,
      [document.id],
      connection
    );
    const detail = detailRows[0];

    if (!detail) {
      throw notFound('document_not_found', 'Document not found.');
    }

    const checksumSha256 = computeSha256(payload.content);
    if (checksumSha256 !== payload.checksumSha256.toLowerCase()) {
      throw badRequest('upload_checksum_mismatch', 'Uploaded file checksum does not match the declared checksum.');
    }

    assertSupportedDocumentUpload({
      contentLength: payload.content.length,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      sha256: checksumSha256,
    });
    const documentType = await getDocumentTypeByCode(detail.categoryCode, connection, false);
    assertDocumentTypeAllowsFile(documentType, payload.fileName, payload.content.length);

    const versionRows = await queryRows<RowDataPacket & { nextVersion: number }>(
      `SELECT COALESCE(MAX(version_no), 0) + 1 AS nextVersion
       FROM document_versions
       WHERE document_id = ?
       FOR UPDATE`,
      [document.id],
      connection
    );
    const nextVersion = Number(versionRows[0]?.nextVersion || 1);
    const versionPublicId = createPublicId();
    const storageKey = storageDriver.buildStorageKey(
      detail.clientAccountPublicId,
      versionPublicId,
      payload.fileName
    );
    await storageDriver.writeBuffer(storageKey, payload.content);

    await executeStatement(
      `UPDATE document_versions
       SET is_current = 0
       WHERE document_id = ?`,
      [document.id],
      connection
    );

    await executeStatement(
      `INSERT INTO document_versions (
         public_id,
         document_id,
         version_no,
         storage_driver_code,
         storage_path,
         original_file_name,
         mime_type,
         file_extension,
         file_size_bytes,
         checksum_sha256,
         virus_scan_status_code,
         uploaded_by_user_id,
         uploaded_at,
         is_current,
         retention_hold_flag
       ) VALUES (?, ?, ?, 'local', ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(6), 1, 0)`,
      [
        versionPublicId,
        document.id,
        nextVersion,
        storageKey,
        payload.fileName,
        normalizeMimeType(payload.mimeType),
        getFileExtension(payload.fileName),
        payload.content.length,
        checksumSha256,
        toVirusStatus(payload.reviewState),
        actor.userId,
      ],
      connection
    );

    await executeStatement(
      `UPDATE documents
       SET title = ?,
           current_version_no = ?,
           updated_at = UTC_TIMESTAMP(6),
           row_version = row_version + 1
       WHERE id = ?`,
      [payload.fileName, nextVersion, document.id],
      connection
    );

    await createAuditEvent(
      {
        actionCode: 'document.version_uploaded',
        actionLabel: 'Document version uploaded',
        actorRoleCode: actor.roleCodes[0] || 'case_manager',
        actorUserId: actor.userId,
        changes: [
          { fieldName: 'version_no', newValue: nextVersion },
          { fieldName: 'virus_scan_status_code', newValue: toVirusStatus(payload.reviewState) },
        ],
        entityPk: document.id,
        entityTableName: 'documents',
        sourceModule: 'documents_center',
        summaryNewValue: `${detail.documentNumber}: v${nextVersion} ${payload.fileName}`,
      },
      connection
    );

    if (visibilityToUi(detail.visibilityScope) === 'client') {
      await createClientNotifications(
        {
          bodyText: 'A new version of a shared document is available in your portal.',
          clientAccountId: detail.clientAccountId,
          documentId: document.id,
          matterId: await getDocumentMatterId(document.id, connection),
          notificationTypeCode: 'document_uploaded',
          priorityCode: 'normal',
          title: 'Document updated',
        },
        connection
      );
    }

    return {
      documentId,
      status: 'version_uploaded' as const,
      versionId: versionPublicId,
      versionNo: nextVersion,
    };
  });

export const getDocumentDetail = async (documentId: string) => {
  const detailRows = await queryRows<DocumentDetailRow>(
    `SELECT
       d.id AS documentDbId,
       d.public_id AS id,
       d.document_number AS documentNumber,
       d.owner_client_account_id AS clientAccountId,
       ca.public_id AS clientAccountPublicId,
       d.title,
       d.category_code AS categoryCode,
       d.visibility_scope_code AS visibilityScope
     FROM documents d
     INNER JOIN client_accounts ca ON ca.id = d.owner_client_account_id
     WHERE d.public_id = ?
       AND d.archived_at IS NULL
     LIMIT 1`,
    [documentId]
  );
  const detail = detailRows[0];

  if (!detail) {
    throw notFound('document_not_found', 'Document not found.');
  }

  const versionRows = await queryRows<DocumentVersionRow>(
    `SELECT
       dv.public_id AS id,
       dv.version_no AS versionNo,
       dv.original_file_name AS originalFileName,
       dv.mime_type AS mimeType,
       dv.file_extension AS fileExtension,
       dv.file_size_bytes AS fileSizeBytes,
       dv.checksum_sha256 AS checksumSha256,
       dv.virus_scan_status_code AS virusStatus,
       dv.uploaded_at AS uploadedAt,
       uploader.display_name AS uploadedBy,
       dv.is_current AS isCurrent,
       dv.retention_hold_flag AS retentionHoldFlag
     FROM document_versions dv
     LEFT JOIN users uploader ON uploader.id = dv.uploaded_by_user_id
     WHERE dv.document_id = ?
     ORDER BY dv.version_no DESC`,
    [detail.documentDbId]
  );

  return {
    categoryCode: detail.categoryCode,
    currentVersionNo: versionRows.find((row) => Boolean(row.isCurrent))?.versionNo || 0,
    documentNumber: detail.documentNumber,
    id: detail.id,
    latestVersion: versionRows[0] ? mapDocumentVersion(versionRows[0]) : null,
    ownerClientAccountId: detail.clientAccountPublicId,
    title: detail.title,
    versions: versionRows.map(mapDocumentVersion),
    visibility: visibilityToUi(detail.visibilityScope),
    visibilityScopeCode: detail.visibilityScope,
  };
};

export const getAdminDocumentFile = async (
  actor: AdminActor,
  documentId: string,
  mode: 'download' | 'preview'
) =>
  withTransaction(async (connection) => {
    const rows = await queryRows<DocumentFileRow>(
      `SELECT
         d.id AS documentDbId,
         dv.id AS documentVersionDbId,
         dv.storage_path AS storagePath,
         dv.mime_type AS mimeType,
         dv.original_file_name AS originalFileName,
         dv.virus_scan_status_code AS virusStatus
       FROM documents d
       INNER JOIN document_versions dv ON dv.document_id = d.id AND dv.is_current = 1
       WHERE d.public_id = ?
         AND d.archived_at IS NULL
       LIMIT 1`,
      [documentId],
      connection
    );
    const document = rows[0];

    if (!document) {
      throw notFound('document_not_found', 'Document not found.');
    }

    if (['blocked', 'infected', 'quarantined'].includes(document.virusStatus)) {
      throw forbidden('document_not_available', 'This document is not available.');
    }

    if (mode === 'preview' && !isSafePreviewMimeType(document.mimeType)) {
      throw badRequest(
        'document_preview_unavailable',
        'Preview is not available for this file type. Please download the file instead.'
      );
    }

    if (mode === 'download') {
      await executeStatement(
        `INSERT INTO document_download_logs (
           document_id,
           document_version_id,
           downloaded_by_user_id,
           ip_address,
           user_agent,
           downloaded_at
         ) VALUES (?, ?, ?, NULL, NULL, UTC_TIMESTAMP(6))`,
        [document.documentDbId, document.documentVersionDbId, actor.userId],
        connection
      );
    }

    await createAuditEvent(
      {
        actionCode: mode === 'preview' ? 'document.previewed' : 'document.downloaded',
        actionLabel: mode === 'preview' ? 'Document previewed' : 'Document downloaded',
        actorRoleCode: actor.roleCodes[0] || 'case_manager',
        actorUserId: actor.userId,
        entityPk: document.documentDbId,
        entityTableName: 'documents',
        sourceModule: 'documents_center',
        summaryNewValue: document.originalFileName,
      },
      connection
    );

    return {
      absolutePath: storageDriver.getAbsolutePath(document.storagePath),
      mimeType: document.mimeType,
      originalName: document.originalFileName,
    };
  });

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

    if (meta.visibilityScope !== nextVisibilityScope) {
      await createAuditEvent(
        {
          actionCode: 'document.visibility_changed',
          actionLabel: 'Document visibility changed',
          actorRoleCode: actor.roleCodes[0] || 'case_manager',
          actorUserId: actor.userId,
          changes: [
            {
              fieldName: 'visibility_scope_code',
              oldValue: meta.visibilityScope,
              newValue: nextVisibilityScope,
            },
          ],
          entityPk: document.id,
          entityTableName: 'documents',
          sourceModule: 'documents_center',
          summaryOldValue: meta.visibilityScope,
          summaryNewValue: nextVisibilityScope,
        },
        connection
      );
    }

    if ((meta.virusStatus || 'pending') !== nextVirusStatus) {
      await createAuditEvent(
        {
          actionCode: 'document.review_status_changed',
          actionLabel: 'Document review status changed',
          actorRoleCode: actor.roleCodes[0] || 'case_manager',
          actorUserId: actor.userId,
          changes: [
            {
              fieldName: 'virus_scan_status_code',
              oldValue: meta.virusStatus || 'pending',
              newValue: nextVirusStatus,
            },
          ],
          entityPk: document.id,
          entityTableName: 'documents',
          sourceModule: 'documents_center',
          summaryOldValue: meta.virusStatus || 'pending',
          summaryNewValue: nextVirusStatus,
        },
        connection
      );
    }

    if (payload.visibility === 'client' && visibilityToUi(meta.visibilityScope) !== 'client') {
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
