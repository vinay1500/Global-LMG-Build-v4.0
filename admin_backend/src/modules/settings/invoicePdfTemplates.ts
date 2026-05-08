import type { RowDataPacket } from 'mysql2/promise';
import { createPublicId } from '../../lib/authCrypto.js';
import { badRequest, notFound } from '../../lib/httpErrors.js';
import { executeStatement, queryRows, withTransaction, type QueryExecutor } from '../../lib/mysql.js';
import type { AdminActor } from '../auth/service.js';
import { createAuditEvent } from '../writeSupport.js';

const MAX_TEMPLATE_BYTES = 10 * 1024 * 1024;

export type InvoicePdfTemplate = {
  archivedAt: string | null;
  contentBottomMargin: number;
  contentLeftMargin: number;
  contentRightMargin: number;
  contentTopMargin: number;
  createdAt: string;
  fileSizeBytes: number;
  id: string;
  isActive: boolean;
  name: string;
  originalFileName: string;
  updatedAt: string;
};

export type InvoicePdfTemplateWithContent = InvoicePdfTemplate & {
  pdfContent: Buffer;
};

export type InvoicePdfTemplateUploadPayload = {
  contentBase64: string;
  contentBottomMargin?: number;
  contentLeftMargin?: number;
  contentRightMargin?: number;
  contentTopMargin?: number;
  name: string;
  originalFileName: string;
  setActive?: boolean;
};

export type InvoicePdfTemplateUpdatePayload = Partial<{
  contentBottomMargin: number;
  contentLeftMargin: number;
  contentRightMargin: number;
  contentTopMargin: number;
  isActive: boolean;
  name: string;
}>;

type TemplateRow = RowDataPacket & {
  archivedAt: string | null;
  contentBottomMargin: number;
  contentLeftMargin: number;
  contentRightMargin: number;
  contentTopMargin: number;
  createdAt: string;
  fileSizeBytes: number;
  id: string;
  isActive: number;
  name: string;
  originalFileName: string;
  pdfContent?: Buffer;
  updatedAt: string;
};

const firstRow = <TRow>(rows: TRow[]) => rows[0] || null;

const normalizeMargin = (value: number | undefined, fallback: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return fallback;
  }

  if (value < 0 || value > 360) {
    throw badRequest('invalid_invoice_pdf_margin', 'Invoice PDF margins must be between 0 and 360 points.');
  }

  return Number(value.toFixed(2));
};

const normalizeName = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    throw badRequest('invalid_invoice_pdf_template', 'Template name is required.');
  }

  return trimmed.slice(0, 180);
};

const normalizeFileName = (value: string) => {
  const trimmed = value.replace(/[/\\\r\n]+/g, '_').trim();
  if (!trimmed.toLowerCase().endsWith('.pdf')) {
    throw badRequest('invalid_invoice_pdf_template', 'Invoice letterhead template must be a PDF file.');
  }

  return trimmed.slice(0, 255);
};

const decodePdf = (contentBase64: string) => {
  let content: Buffer;
  try {
    content = Buffer.from(contentBase64, 'base64');
  } catch {
    throw badRequest('invalid_invoice_pdf_template', 'Template PDF could not be decoded.');
  }

  if (content.length === 0 || content.length > MAX_TEMPLATE_BYTES) {
    throw badRequest('invalid_invoice_pdf_template', 'Template PDF must be between 1 byte and 10 MB.');
  }

  if (!content.subarray(0, 5).toString('utf8').startsWith('%PDF')) {
    throw badRequest('invalid_invoice_pdf_template', 'Uploaded template is not a valid PDF file.');
  }

  return content;
};

const mapRow = (row: TemplateRow): InvoicePdfTemplate => ({
  archivedAt: row.archivedAt,
  contentBottomMargin: Number(row.contentBottomMargin || 0),
  contentLeftMargin: Number(row.contentLeftMargin || 0),
  contentRightMargin: Number(row.contentRightMargin || 0),
  contentTopMargin: Number(row.contentTopMargin || 0),
  createdAt: row.createdAt,
  fileSizeBytes: Number(row.fileSizeBytes || 0),
  id: row.id,
  isActive: Boolean(row.isActive),
  name: row.name,
  originalFileName: row.originalFileName,
  updatedAt: row.updatedAt,
});

const selectTemplateByPublicId = async (
  templateId: string,
  executor: QueryExecutor,
  includeContent = false
) =>
  firstRow(
    await queryRows<TemplateRow>(
      `SELECT
         public_id AS id,
         name,
         original_file_name AS originalFileName,
         file_size_bytes AS fileSizeBytes,
         ${includeContent ? 'pdf_content AS pdfContent,' : ''}
         content_top_margin AS contentTopMargin,
         content_left_margin AS contentLeftMargin,
         content_right_margin AS contentRightMargin,
         content_bottom_margin AS contentBottomMargin,
         is_active AS isActive,
         created_at AS createdAt,
         updated_at AS updatedAt,
         archived_at AS archivedAt
       FROM invoice_pdf_templates
       WHERE public_id = ?
       LIMIT 1`,
      [templateId],
      executor
    )
  );

export const getInvoicePdfTemplates = async (
  executor?: QueryExecutor
): Promise<{ templates: InvoicePdfTemplate[] }> => {
  const rows = await queryRows<TemplateRow>(
    `SELECT
       public_id AS id,
       name,
       original_file_name AS originalFileName,
       file_size_bytes AS fileSizeBytes,
       content_top_margin AS contentTopMargin,
       content_left_margin AS contentLeftMargin,
       content_right_margin AS contentRightMargin,
       content_bottom_margin AS contentBottomMargin,
       is_active AS isActive,
       created_at AS createdAt,
       updated_at AS updatedAt,
       archived_at AS archivedAt
     FROM invoice_pdf_templates
     ORDER BY is_active DESC, archived_at IS NULL DESC, updated_at DESC, id DESC`,
    [],
    executor
  );

  return { templates: rows.map(mapRow) };
};

export const getActiveInvoicePdfTemplate = async (
  executor?: QueryExecutor
): Promise<InvoicePdfTemplateWithContent | null> => {
  const row = firstRow(
    await queryRows<TemplateRow>(
      `SELECT
         public_id AS id,
         name,
         original_file_name AS originalFileName,
         file_size_bytes AS fileSizeBytes,
         pdf_content AS pdfContent,
         content_top_margin AS contentTopMargin,
         content_left_margin AS contentLeftMargin,
         content_right_margin AS contentRightMargin,
         content_bottom_margin AS contentBottomMargin,
         is_active AS isActive,
         created_at AS createdAt,
         updated_at AS updatedAt,
         archived_at AS archivedAt
       FROM invoice_pdf_templates
       WHERE is_active = 1
         AND archived_at IS NULL
       ORDER BY updated_at DESC, id DESC
       LIMIT 1`,
      [],
      executor
    )
  );

  if (!row?.pdfContent) {
    return null;
  }

  return { ...mapRow(row), pdfContent: row.pdfContent };
};

export const applyInvoicePdfTemplateSnapshot = async (
  invoiceDbId: number,
  executor: QueryExecutor
) => {
  const activeTemplate = await getActiveInvoicePdfTemplate(executor);

  if (!activeTemplate) {
    return {
      templateId: null,
      templateName: null,
    };
  }

  await executeStatement(
    `UPDATE invoices
     SET pdf_template_public_id_snapshot = ?,
         pdf_template_name_snapshot = ?,
         pdf_content_top_margin_snapshot = ?,
         pdf_content_left_margin_snapshot = ?,
         pdf_content_right_margin_snapshot = ?,
         pdf_content_bottom_margin_snapshot = ?,
         updated_at = UTC_TIMESTAMP(6),
         row_version = row_version + 1
     WHERE id = ?`,
    [
      activeTemplate.id,
      activeTemplate.name,
      activeTemplate.contentTopMargin,
      activeTemplate.contentLeftMargin,
      activeTemplate.contentRightMargin,
      activeTemplate.contentBottomMargin,
      invoiceDbId,
    ],
    executor
  );

  return {
    templateId: activeTemplate.id,
    templateName: activeTemplate.name,
  };
};

export const uploadInvoicePdfTemplate = async (
  actor: AdminActor,
  payload: InvoicePdfTemplateUploadPayload
) =>
  withTransaction(async (connection) => {
    const content = decodePdf(payload.contentBase64);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const templatePublicId = createPublicId();
    const name = normalizeName(payload.name);
    const originalFileName = normalizeFileName(payload.originalFileName);
    const shouldActivate = payload.setActive ?? true;

    if (shouldActivate) {
      await executeStatement(
        `UPDATE invoice_pdf_templates
         SET is_active = 0,
             updated_at = ?
         WHERE archived_at IS NULL
           AND is_active = 1`,
        [now],
        connection
      );
    }

    await executeStatement(
      `INSERT INTO invoice_pdf_templates (
         public_id,
         name,
         original_file_name,
         content_type,
         file_size_bytes,
         pdf_content,
         content_top_margin,
         content_left_margin,
         content_right_margin,
         content_bottom_margin,
         is_active,
         created_by_user_id,
         created_at,
         updated_at,
         archived_at
       ) VALUES (?, ?, ?, 'application/pdf', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        templatePublicId,
        name,
        originalFileName,
        content.length,
        content,
        normalizeMargin(payload.contentTopMargin, 120),
        normalizeMargin(payload.contentLeftMargin, 54),
        normalizeMargin(payload.contentRightMargin, 54),
        normalizeMargin(payload.contentBottomMargin, 72),
        shouldActivate ? 1 : 0,
        actor.userId,
        now,
        now,
      ],
      connection
    );

    await createAuditEvent(
      {
        actionCode: 'invoice_pdf_template.uploaded',
        actionLabel: 'Invoice PDF letterhead uploaded',
        actorRoleCode: actor.roleCodes[0] || 'settings_admin',
        actorUserId: actor.userId,
        changes: [
          { fieldName: 'name', newValue: name },
          { fieldName: 'is_active', newValue: shouldActivate },
        ],
        entityPk: null,
        entityTableName: 'invoice_pdf_templates',
        sourceModule: 'settings_workspace',
        summaryNewValue: `Uploaded invoice PDF letterhead ${name}`,
      },
      connection
    );

    const row = await selectTemplateByPublicId(templatePublicId, connection);
    return { template: row ? mapRow(row) : null };
  });

export const updateInvoicePdfTemplate = async (
  actor: AdminActor,
  templateId: string,
  payload: InvoicePdfTemplateUpdatePayload
) =>
  withTransaction(async (connection) => {
    const existing = await selectTemplateByPublicId(templateId, connection);
    if (!existing || existing.archivedAt) {
      throw notFound('invoice_pdf_template_not_found', 'Invoice PDF template not found.');
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const next = {
      contentBottomMargin: normalizeMargin(payload.contentBottomMargin, Number(existing.contentBottomMargin)),
      contentLeftMargin: normalizeMargin(payload.contentLeftMargin, Number(existing.contentLeftMargin)),
      contentRightMargin: normalizeMargin(payload.contentRightMargin, Number(existing.contentRightMargin)),
      contentTopMargin: normalizeMargin(payload.contentTopMargin, Number(existing.contentTopMargin)),
      isActive: payload.isActive ?? Boolean(existing.isActive),
      name: payload.name === undefined ? existing.name : normalizeName(payload.name),
    };

    if (next.isActive) {
      await executeStatement(
        `UPDATE invoice_pdf_templates
         SET is_active = 0,
             updated_at = ?
         WHERE archived_at IS NULL
           AND public_id <> ?`,
        [now, templateId],
        connection
      );
    }

    await executeStatement(
      `UPDATE invoice_pdf_templates
       SET name = ?,
           content_top_margin = ?,
           content_left_margin = ?,
           content_right_margin = ?,
           content_bottom_margin = ?,
           is_active = ?,
           updated_at = ?
       WHERE public_id = ?
         AND archived_at IS NULL`,
      [
        next.name,
        next.contentTopMargin,
        next.contentLeftMargin,
        next.contentRightMargin,
        next.contentBottomMargin,
        next.isActive ? 1 : 0,
        now,
        templateId,
      ],
      connection
    );

    await createAuditEvent(
      {
        actionCode: 'invoice_pdf_template.updated',
        actionLabel: 'Invoice PDF letterhead updated',
        actorRoleCode: actor.roleCodes[0] || 'settings_admin',
        actorUserId: actor.userId,
        changes: [
          { fieldName: 'name', oldValue: existing.name, newValue: next.name },
          { fieldName: 'is_active', oldValue: Boolean(existing.isActive), newValue: next.isActive },
        ],
        entityPk: null,
        entityTableName: 'invoice_pdf_templates',
        sourceModule: 'settings_workspace',
        summaryNewValue: `Updated invoice PDF letterhead ${next.name}`,
      },
      connection
    );

    const row = await selectTemplateByPublicId(templateId, connection);
    return { template: row ? mapRow(row) : null };
  });

export const archiveInvoicePdfTemplate = async (actor: AdminActor, templateId: string) =>
  withTransaction(async (connection) => {
    const existing = await selectTemplateByPublicId(templateId, connection);
    if (!existing || existing.archivedAt) {
      throw notFound('invoice_pdf_template_not_found', 'Invoice PDF template not found.');
    }

    await executeStatement(
      `UPDATE invoice_pdf_templates
       SET is_active = 0,
           archived_at = UTC_TIMESTAMP(6),
           updated_at = UTC_TIMESTAMP(6)
       WHERE public_id = ?`,
      [templateId],
      connection
    );

    await createAuditEvent(
      {
        actionCode: 'invoice_pdf_template.archived',
        actionLabel: 'Invoice PDF letterhead archived',
        actorRoleCode: actor.roleCodes[0] || 'settings_admin',
        actorUserId: actor.userId,
        changes: [{ fieldName: 'archived_at', newValue: 'now' }],
        entityPk: null,
        entityTableName: 'invoice_pdf_templates',
        sourceModule: 'settings_workspace',
        summaryNewValue: `Archived invoice PDF letterhead ${existing.name}`,
      },
      connection
    );

    return { archived: true, templateId };
  });
