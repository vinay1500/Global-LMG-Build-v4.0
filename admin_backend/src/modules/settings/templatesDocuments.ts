import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { createPublicId } from '../../lib/authCrypto.js';
import { AppError, badRequest, notFound } from '../../lib/httpErrors.js';
import { executeStatement, queryRows, withTransaction } from '../../lib/mysql.js';
import type { AdminActor } from '../auth/service.js';
import { createAuditEvent } from '../writeSupport.js';

export type TemplateType = 'document_checklist' | 'general' | 'invoice' | 'message' | 'notification';

export type TemplateInput = {
  body: string;
  isActive?: boolean;
  name: string;
  subject?: string | null;
  type: TemplateType;
  variables?: string[];
};

export type UpdateTemplateInput = Partial<TemplateInput>;

export type DocumentTypeInput = {
  allowedExtensions: string[];
  category: string;
  clientVisibleDefault?: boolean;
  code?: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  maxSizeMb: number;
  name: string;
  requiresReview?: boolean;
};

export type UpdateDocumentTypeInput = Partial<DocumentTypeInput>;

type TemplateRow = RowDataPacket & {
  archivedAt: string | null;
  body: string;
  createdAt: string;
  id: string;
  isActive: number;
  isDefault: number;
  name: string;
  subject: string | null;
  templateDbId: number;
  type: TemplateType;
  updatedAt: string;
  variablesJson: unknown;
  version: number;
};

type DocumentTypeRow = RowDataPacket & {
  allowedExtensionsJson: unknown;
  archivedAt: string | null;
  category: string;
  clientVisibleDefault: number;
  code: string;
  description: string | null;
  displayOrder: number;
  documentTypeDbId: number;
  id: string;
  isActive: number;
  maxSizeMb: number;
  name: string;
  requiresReview: number;
  updatedAt: string;
  usageCount: number;
};

const TEMPLATE_TYPES: TemplateType[] = ['invoice', 'message', 'notification', 'document_checklist', 'general'];

const VARIABLE_ALLOWLIST: Record<TemplateType, Set<string>> = {
  document_checklist: new Set(['clientName', 'deadline', 'documentType', 'matterTitle', 'platformName']),
  general: new Set(['platformName', 'supportEmail', 'supportPhone']),
  invoice: new Set([
    'amountDue',
    'clientName',
    'dueDate',
    'footerNote',
    'invoiceNumber',
    'matterTitle',
    'platformName',
    'totalAmount',
  ]),
  message: new Set(['adminName', 'clientName', 'matterTitle', 'platformName', 'supportEmail']),
  notification: new Set(['actionUrl', 'clientName', 'matterTitle', 'platformName']),
};

const CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EXTENSION_PATTERN = /^[a-z0-9]+$/;
const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

const firstRow = <TRow>(rows: TRow[]) => rows[0] || null;

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

const parseStringArray = (raw: unknown): string[] => {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
};

const normalizeVariables = (type: TemplateType, body: string, subject?: string | null, explicit?: string[]) => {
  const found = new Set<string>();
  const combined = `${subject || ''}\n${body}`;
  let match: RegExpExecArray | null;

  while ((match = PLACEHOLDER_PATTERN.exec(combined))) {
    found.add(match[1]);
  }

  explicit?.forEach((value) => {
    if (value.trim()) {
      found.add(value.trim());
    }
  });

  const allowed = VARIABLE_ALLOWLIST[type];
  const unsupported = Array.from(found).filter((variable) => !allowed.has(variable));
  if (unsupported.length) {
    throw badRequest(
      'unsupported_template_variable',
      `Unsupported variable(s) for ${type}: ${unsupported.join(', ')}.`
    );
  }

  return Array.from(found).sort();
};

const normalizeTemplateInput = (payload: TemplateInput) => {
  if (!TEMPLATE_TYPES.includes(payload.type)) {
    throw badRequest('invalid_template_type', 'Template type is invalid.');
  }

  const name = payload.name.trim();
  const body = payload.body.trim();
  const subject = payload.subject?.trim() || null;

  if (name.length < 2 || name.length > 180) {
    throw badRequest('invalid_template_name', 'Template name must be between 2 and 180 characters.');
  }

  if (!body || body.length > 10000) {
    throw badRequest('invalid_template_body', 'Template body is required and must be 10000 characters or fewer.');
  }

  if (subject && subject.length > 255) {
    throw badRequest('invalid_template_subject', 'Template subject must be 255 characters or fewer.');
  }

  return {
    body,
    isActive: payload.isActive ?? true,
    name,
    subject,
    type: payload.type,
    variables: normalizeVariables(payload.type, body, subject, payload.variables),
  };
};

const normalizeExtensions = (extensions: string[]) => {
  const normalized = Array.from(
    new Set(
      extensions
        .map((extension) => extension.trim().toLowerCase().replace(/^\./, ''))
        .filter(Boolean)
    )
  );

  if (!normalized.length) {
    throw badRequest('invalid_document_type_extensions', 'At least one allowed extension is required.');
  }

  const invalid = normalized.filter((extension) => !EXTENSION_PATTERN.test(extension));
  if (invalid.length) {
    throw badRequest('invalid_document_type_extensions', `Invalid extension(s): ${invalid.join(', ')}.`);
  }

  return normalized;
};

const normalizeDocumentTypeInput = (payload: DocumentTypeInput) => {
  const name = payload.name.trim();
  const code = (payload.code?.trim() || toSlug(name)).toLowerCase();
  const category = payload.category.trim().toLowerCase() || 'general';

  if (!CODE_PATTERN.test(code)) {
    throw badRequest('invalid_document_type_code', 'Document type code must be a lowercase slug.');
  }

  if (name.length < 2 || name.length > 140) {
    throw badRequest('invalid_document_type_name', 'Document type name must be between 2 and 140 characters.');
  }

  if (!Number.isInteger(payload.maxSizeMb) || payload.maxSizeMb < 1 || payload.maxSizeMb > 200) {
    throw badRequest('invalid_document_type_size', 'Max size must be a whole number between 1 and 200 MB.');
  }

  return {
    allowedExtensions: normalizeExtensions(payload.allowedExtensions),
    category,
    clientVisibleDefault: payload.clientVisibleDefault ?? false,
    code,
    description: payload.description?.trim() || null,
    displayOrder: payload.displayOrder ?? 0,
    isActive: payload.isActive ?? true,
    maxSizeMb: payload.maxSizeMb,
    name,
    requiresReview: payload.requiresReview ?? true,
  };
};

const mapTemplate = (row: TemplateRow) => ({
  archivedAt: row.archivedAt,
  body: row.body,
  createdAt: row.createdAt,
  id: row.id,
  isActive: Boolean(row.isActive),
  isDefault: Boolean(row.isDefault),
  name: row.name,
  subject: row.subject,
  type: row.type,
  updatedAt: row.updatedAt,
  variables: parseStringArray(row.variablesJson),
  version: Number(row.version || 0),
});

const mapDocumentType = (row: DocumentTypeRow) => ({
  allowedExtensions: parseStringArray(row.allowedExtensionsJson),
  archivedAt: row.archivedAt,
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
  updatedAt: row.updatedAt,
  usageCount: Number(row.usageCount || 0),
});

const templateSelectSql = `
  SELECT
    id AS templateDbId,
    public_id AS id,
    template_type_code AS type,
    template_name AS name,
    subject,
    body_text AS body,
    variables_json AS variablesJson,
    is_default AS isDefault,
    is_active AS isActive,
    version,
    created_at AS createdAt,
    updated_at AS updatedAt,
    archived_at AS archivedAt
  FROM admin_templates
`;

const documentTypeSelectSql = `
  SELECT
    dt.id AS documentTypeDbId,
    dt.public_id AS id,
    dt.code,
    dt.name,
    dt.description,
    dt.category,
    dt.allowed_extensions_json AS allowedExtensionsJson,
    dt.max_size_mb AS maxSizeMb,
    dt.requires_review AS requiresReview,
    dt.client_visible_default AS clientVisibleDefault,
    dt.is_active AS isActive,
    dt.display_order AS displayOrder,
    dt.updated_at AS updatedAt,
    dt.archived_at AS archivedAt,
    (
      SELECT COUNT(*)
      FROM documents d
      WHERE d.category_code = dt.code
    ) AS usageCount
  FROM document_types dt
`;

const getTemplateRow = async (templateId: string) => {
  const row = firstRow(
    await queryRows<TemplateRow>(
      `${templateSelectSql}
       WHERE public_id = ?
       LIMIT 1`,
      [templateId]
    )
  );

  if (!row) {
    throw notFound('template_not_found', 'Template not found.');
  }

  return row;
};

const getDocumentTypeRow = async (documentTypeId: string) => {
  const row = firstRow(
    await queryRows<DocumentTypeRow>(
      `${documentTypeSelectSql}
       WHERE dt.public_id = ?
       LIMIT 1`,
      [documentTypeId]
    )
  );

  if (!row) {
    throw notFound('document_type_not_found', 'Document type not found.');
  }

  return row;
};

export const getTemplates = async () => {
  const rows = await queryRows<TemplateRow>(
    `${templateSelectSql}
     ORDER BY template_type_code ASC, is_default DESC, is_active DESC, template_name ASC`
  );

  return {
    templates: rows.map(mapTemplate),
  };
};

export const getDocumentTypes = async () => {
  const rows = await queryRows<DocumentTypeRow>(
    `${documentTypeSelectSql}
     ORDER BY dt.is_active DESC, dt.display_order ASC, dt.name ASC`
  );

  return {
    documentTypes: rows.map(mapDocumentType),
  };
};

export const createTemplate = async (actor: AdminActor, payload: TemplateInput) => {
  const next = normalizeTemplateInput(payload);

  const result = await executeStatement<ResultSetHeader>(
    `INSERT INTO admin_templates (
       public_id,
       template_type_code,
       template_name,
       subject,
       body_text,
       variables_json,
       is_default,
       is_active,
       version,
       created_by_user_id,
       updated_by_user_id,
       created_at,
       updated_at,
       archived_at
     ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), NULL)`,
    [
      createPublicId(),
      next.type,
      next.name,
      next.subject,
      next.body,
      JSON.stringify(next.variables),
      next.isActive ? 1 : 0,
      actor.userId,
      actor.userId,
    ]
  );

  await createAuditEvent({
    actionCode: 'template.created',
    actionLabel: 'Template created',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    entityPk: result.insertId,
    entityTableName: 'admin_templates',
    sourceModule: 'settings_workspace',
    summaryNewValue: { name: next.name, type: next.type },
  });

  const created = firstRow(
    await queryRows<TemplateRow>(`${templateSelectSql} WHERE id = ? LIMIT 1`, [result.insertId])
  );

  return mapTemplate(created!);
};

export const updateTemplate = async (
  actor: AdminActor,
  templateId: string,
  payload: UpdateTemplateInput
) => {
  const existing = await getTemplateRow(templateId);
  const next = normalizeTemplateInput({
    body: payload.body ?? existing.body,
    isActive: payload.isActive ?? Boolean(existing.isActive),
    name: payload.name ?? existing.name,
    subject: payload.subject === undefined ? existing.subject : payload.subject,
    type: existing.type,
    variables: payload.variables ?? parseStringArray(existing.variablesJson),
  });

  await executeStatement(
    `UPDATE admin_templates
     SET template_name = ?,
         subject = ?,
         body_text = ?,
         variables_json = ?,
         is_active = ?,
         version = version + 1,
         updated_by_user_id = ?,
         updated_at = UTC_TIMESTAMP(6)
     WHERE id = ?`,
    [
      next.name,
      next.subject,
      next.body,
      JSON.stringify(next.variables),
      next.isActive ? 1 : 0,
      actor.userId,
      existing.templateDbId,
    ]
  );

  await createAuditEvent({
    actionCode: 'template.updated',
    actionLabel: 'Template updated',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    entityPk: existing.templateDbId,
    entityTableName: 'admin_templates',
    sourceModule: 'settings_workspace',
    summaryOldValue: { name: existing.name, type: existing.type },
    summaryNewValue: { name: next.name, type: next.type },
  });

  return mapTemplate(await getTemplateRow(templateId));
};

export const archiveTemplate = async (actor: AdminActor, templateId: string) => {
  const existing = await getTemplateRow(templateId);

  await executeStatement(
    `UPDATE admin_templates
     SET is_active = 0,
         is_default = 0,
         archived_at = COALESCE(archived_at, UTC_TIMESTAMP(6)),
         updated_by_user_id = ?,
         updated_at = UTC_TIMESTAMP(6)
     WHERE id = ?`,
    [actor.userId, existing.templateDbId]
  );

  await createAuditEvent({
    actionCode: 'template.archived',
    actionLabel: 'Template archived',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    changes: [{ fieldName: 'archived_at', newValue: 'now' }],
    entityPk: existing.templateDbId,
    entityTableName: 'admin_templates',
    sourceModule: 'settings_workspace',
  });

  return mapTemplate(await getTemplateRow(templateId));
};

export const setDefaultTemplate = async (actor: AdminActor, templateId: string) =>
  withTransaction(async (connection) => {
    const existing = firstRow(
      await queryRows<TemplateRow>(
        `${templateSelectSql}
         WHERE public_id = ?
         LIMIT 1`,
        [templateId],
        connection
      )
    );

    if (!existing || existing.archivedAt || !existing.isActive) {
      throw badRequest('invalid_default_template', 'Only active, unarchived templates can be set as default.');
    }

    await executeStatement(
      `UPDATE admin_templates
       SET is_default = 0,
           updated_by_user_id = ?,
           updated_at = UTC_TIMESTAMP(6)
       WHERE template_type_code = ?`,
      [actor.userId, existing.type],
      connection
    );
    await executeStatement(
      `UPDATE admin_templates
       SET is_default = 1,
           updated_by_user_id = ?,
           updated_at = UTC_TIMESTAMP(6)
       WHERE id = ?`,
      [actor.userId, existing.templateDbId],
      connection
    );

    await createAuditEvent(
      {
        actionCode: 'template.default_set',
        actionLabel: 'Template default set',
        actorRoleCode: actor.roleCodes[0] || 'ops_admin',
        actorUserId: actor.userId,
        changes: [{ fieldName: 'is_default', newValue: true }],
        entityPk: existing.templateDbId,
        entityTableName: 'admin_templates',
        sourceModule: 'settings_workspace',
      },
      connection
    );

    const updated = firstRow(
      await queryRows<TemplateRow>(
        `${templateSelectSql}
         WHERE public_id = ?
         LIMIT 1`,
        [templateId],
        connection
      )
    );

    if (!updated) {
      throw notFound('template_not_found', 'Template not found.');
    }

    return mapTemplate(updated);
  });

export const createDocumentType = async (actor: AdminActor, payload: DocumentTypeInput) => {
  const next = normalizeDocumentTypeInput(payload);
  const duplicate = firstRow(
    await queryRows<RowDataPacket & { id: number }>(`SELECT id FROM document_types WHERE code = ? LIMIT 1`, [
      next.code,
    ])
  );
  if (duplicate) {
    throw new AppError(409, 'document_type_duplicate', 'A document type with this code already exists.');
  }

  const result = await executeStatement<ResultSetHeader>(
    `INSERT INTO document_types (
       public_id,
       code,
       name,
       description,
       category,
       allowed_extensions_json,
       max_size_mb,
       requires_review,
       client_visible_default,
       is_active,
       display_order,
       created_at,
       updated_at,
       archived_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), NULL)`,
    [
      createPublicId(),
      next.code,
      next.name,
      next.description,
      next.category,
      JSON.stringify(next.allowedExtensions),
      next.maxSizeMb,
      next.requiresReview ? 1 : 0,
      next.clientVisibleDefault ? 1 : 0,
      next.isActive ? 1 : 0,
      next.displayOrder,
    ]
  );

  await createAuditEvent({
    actionCode: 'document_type.created',
    actionLabel: 'Document type created',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    entityPk: result.insertId,
    entityTableName: 'document_types',
    sourceModule: 'settings_workspace',
    summaryNewValue: { code: next.code, name: next.name },
  });

  const created = firstRow(
    await queryRows<DocumentTypeRow>(`${documentTypeSelectSql} WHERE dt.id = ? LIMIT 1`, [result.insertId])
  );

  return mapDocumentType(created!);
};

export const updateDocumentType = async (
  actor: AdminActor,
  documentTypeId: string,
  payload: UpdateDocumentTypeInput
) => {
  const existing = await getDocumentTypeRow(documentTypeId);
  const next = normalizeDocumentTypeInput({
    allowedExtensions: payload.allowedExtensions ?? parseStringArray(existing.allowedExtensionsJson),
    category: payload.category ?? existing.category,
    clientVisibleDefault: payload.clientVisibleDefault ?? Boolean(existing.clientVisibleDefault),
    code: existing.code,
    description: payload.description === undefined ? existing.description : payload.description,
    displayOrder: payload.displayOrder ?? Number(existing.displayOrder || 0),
    isActive: payload.isActive ?? Boolean(existing.isActive),
    maxSizeMb: payload.maxSizeMb ?? Number(existing.maxSizeMb || 25),
    name: payload.name ?? existing.name,
    requiresReview: payload.requiresReview ?? Boolean(existing.requiresReview),
  });

  await executeStatement(
    `UPDATE document_types
     SET name = ?,
         description = ?,
         category = ?,
         allowed_extensions_json = ?,
         max_size_mb = ?,
         requires_review = ?,
         client_visible_default = ?,
         is_active = ?,
         display_order = ?,
         updated_at = UTC_TIMESTAMP(6)
     WHERE id = ?`,
    [
      next.name,
      next.description,
      next.category,
      JSON.stringify(next.allowedExtensions),
      next.maxSizeMb,
      next.requiresReview ? 1 : 0,
      next.clientVisibleDefault ? 1 : 0,
      next.isActive ? 1 : 0,
      next.displayOrder,
      existing.documentTypeDbId,
    ]
  );

  await createAuditEvent({
    actionCode: 'document_type.updated',
    actionLabel: 'Document type updated',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    entityPk: existing.documentTypeDbId,
    entityTableName: 'document_types',
    sourceModule: 'settings_workspace',
    summaryOldValue: { code: existing.code, name: existing.name },
    summaryNewValue: { code: next.code, name: next.name },
  });

  return mapDocumentType(await getDocumentTypeRow(documentTypeId));
};

export const archiveDocumentType = async (actor: AdminActor, documentTypeId: string) => {
  const existing = await getDocumentTypeRow(documentTypeId);

  await executeStatement(
    `UPDATE document_types
     SET is_active = 0,
         archived_at = COALESCE(archived_at, UTC_TIMESTAMP(6)),
         updated_at = UTC_TIMESTAMP(6)
     WHERE id = ?`,
    [existing.documentTypeDbId]
  );

  await createAuditEvent({
    actionCode: 'document_type.archived',
    actionLabel: 'Document type archived',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    changes: [{ fieldName: 'archived_at', newValue: 'now' }],
    entityPk: existing.documentTypeDbId,
    entityTableName: 'document_types',
    sourceModule: 'settings_workspace',
  });

  return mapDocumentType(await getDocumentTypeRow(documentTypeId));
};
