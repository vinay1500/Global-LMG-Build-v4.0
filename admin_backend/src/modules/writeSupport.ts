import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { createPublicId } from '../lib/authCrypto.js';
import { notFound } from '../lib/httpErrors.js';
import { executeStatement, queryRows, type QueryExecutor } from '../lib/mysql.js';

type IdRow = RowDataPacket & { id: number };
type MatterRow = IdRow & { clientAccountId: number };
type ThreadRow = IdRow & { clientAccountId: number; matterId: number | null };
type PaymentRow = IdRow & { clientAccountId: number; invoiceId: number | null };
type NotificationDeliveryRow = RowDataPacket & {
  bodyText: string | null;
  inAppEnabled: number;
  isActive: number;
  subject: string | null;
  templateId: string | null;
};
type NotificationTemplateContextRow = RowDataPacket & {
  clientName: string | null;
  documentType: string | null;
  dueDate: string | null;
  invoiceNumber: string | null;
  matterTitle: string | null;
  totalAmount: string | null;
};

const firstRow = <TRow>(rows: TRow[]) => rows[0] || null;

const stringifyChange = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
};

const renderTemplate = (value: string, context: Record<string, string>) =>
  value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, variable: string) => context[variable] || '');

const getNotificationDelivery = async (notificationTypeCode: string, executor?: QueryExecutor) => {
  const row = firstRow(
    await queryRows<NotificationDeliveryRow>(
      `SELECT
         COALESCE(nds.in_app_enabled, 1) AS inAppEnabled,
         COALESCE(nds.is_active, nt.is_active) AS isActive,
         at.public_id AS templateId,
         at.subject,
         at.body_text AS bodyText
       FROM notification_types nt
       LEFT JOIN notification_delivery_settings nds ON nds.notification_type_code = nt.code
       LEFT JOIN admin_templates at ON at.public_id = nds.template_public_id
         AND at.template_type_code = 'notification'
         AND at.is_active = 1
         AND at.archived_at IS NULL
       WHERE nt.code = ?
       LIMIT 1`,
      [notificationTypeCode],
      executor
    )
  );

  return row || { bodyText: null, inAppEnabled: 1, isActive: 1, subject: null, templateId: null };
};

const getNotificationTemplateContext = async (
  input: {
    clientAccountId: number;
    documentId?: number | null;
    invoiceId?: number | null;
    matterId?: number | null;
  },
  executor?: QueryExecutor
) => {
  const row = firstRow(
    await queryRows<NotificationTemplateContextRow>(
      `SELECT
         ca.display_name AS clientName,
         matter.title AS matterTitle,
         invoice.invoice_number AS invoiceNumber,
         DATE_FORMAT(invoice.due_date, '%Y-%m-%d') AS dueDate,
         CAST(invoice.total_amount AS CHAR) AS totalAmount,
         doc.category_code AS documentType
       FROM client_accounts ca
       LEFT JOIN matters matter ON matter.id = ?
       LEFT JOIN invoices invoice ON invoice.id = ?
       LEFT JOIN documents doc ON doc.id = ?
       WHERE ca.id = ?
       LIMIT 1`,
      [input.matterId || null, input.invoiceId || null, input.documentId || null, input.clientAccountId],
      executor
    )
  );

  return {
    actionUrl: '',
    clientName: row?.clientName || 'Client',
    documentType: row?.documentType || 'document',
    dueDate: row?.dueDate || '',
    matterTitle: row?.matterTitle || '',
    platformName: 'Global LMG',
    totalAmount: row?.totalAmount || '',
    invoiceNumber: row?.invoiceNumber || '',
  };
};

export const resolveMatterByPublicId = async (
  matterPublicId: string,
  executor?: QueryExecutor
) => {
  const row = firstRow(
    await queryRows<MatterRow>(
      `SELECT id, client_account_id AS clientAccountId
       FROM matters
       WHERE public_id = ?
         AND archived_at IS NULL
       LIMIT 1`,
      [matterPublicId],
      executor
    )
  );

  if (!row) {
    throw notFound('matter_not_found', 'Matter not found.');
  }

  return row;
};

export const resolveClientAccountByPublicId = async (
  clientAccountPublicId: string,
  executor?: QueryExecutor
) => {
  const row = firstRow(
    await queryRows<IdRow>(
      `SELECT id
       FROM client_accounts
       WHERE public_id = ?
         AND archived_at IS NULL
       LIMIT 1`,
      [clientAccountPublicId],
      executor
    )
  );

  if (!row) {
    throw notFound('client_account_not_found', 'Client account not found.');
  }

  return row;
};

export const resolveInvoiceByPublicId = async (
  invoicePublicId: string,
  executor?: QueryExecutor
) => {
  const row = firstRow(
    await queryRows<IdRow>(
      `SELECT id
       FROM invoices
       WHERE public_id = ?
         AND archived_at IS NULL
       LIMIT 1`,
      [invoicePublicId],
      executor
    )
  );

  if (!row) {
    throw notFound('invoice_not_found', 'Invoice not found.');
  }

  return row;
};

export const resolveDocumentByPublicId = async (
  documentPublicId: string,
  executor?: QueryExecutor
) => {
  const row = firstRow(
    await queryRows<IdRow>(
      `SELECT id
       FROM documents
       WHERE public_id = ?
         AND archived_at IS NULL
       LIMIT 1`,
      [documentPublicId],
      executor
    )
  );

  if (!row) {
    throw notFound('document_not_found', 'Document not found.');
  }

  return row;
};

export const resolveThreadByPublicId = async (
  threadPublicId: string,
  executor?: QueryExecutor
) => {
  const row = firstRow(
    await queryRows<ThreadRow>(
      `SELECT id, client_account_id AS clientAccountId, matter_id AS matterId
       FROM conversation_threads
       WHERE public_id = ?
         AND archived_at IS NULL
       LIMIT 1`,
      [threadPublicId],
      executor
    )
  );

  if (!row) {
    throw notFound('thread_not_found', 'Message thread not found.');
  }

  return row;
};

export const resolvePaymentByPublicId = async (
  paymentPublicId: string,
  executor?: QueryExecutor
) => {
  const row = firstRow(
    await queryRows<PaymentRow>(
      `SELECT
         pt.id,
         pt.client_account_id AS clientAccountId,
         MAX(pa.invoice_id) AS invoiceId
       FROM payment_transactions pt
       LEFT JOIN payment_allocations pa ON pa.payment_transaction_id = pt.id
       WHERE pt.public_id = ?
       GROUP BY pt.id, pt.client_account_id
       LIMIT 1`,
      [paymentPublicId],
      executor
    )
  );

  if (!row) {
    throw notFound('payment_not_found', 'Payment not found.');
  }

  return row;
};

export const resolveInternalUserByPublicId = async (
  userPublicId: string,
  executor?: QueryExecutor
) => {
  const row = firstRow(
    await queryRows<IdRow>(
      `SELECT id
       FROM users
       WHERE public_id = ?
         AND archived_at IS NULL
       LIMIT 1`,
      [userPublicId],
      executor
    )
  );

  if (!row) {
    throw notFound('user_not_found', 'User not found.');
  }

  return row;
};

export const resolveCounselByPublicId = async (
  counselPublicId: string,
  executor?: QueryExecutor
) => {
  const row = firstRow(
    await queryRows<IdRow>(
      `SELECT id
       FROM counsel_partners
       WHERE public_id = ?
         AND archived_at IS NULL
       LIMIT 1`,
      [counselPublicId],
      executor
    )
  );

  if (!row) {
    throw notFound('counsel_not_found', 'Counsel partner not found.');
  }

  return row;
};

export const createAuditEvent = async (
  input: {
    actionCode: string;
    actionLabel: string;
    actorRoleCode: string;
    actorUserId: number | null;
    changes?: Array<{ fieldName: string; newValue?: unknown; oldValue?: unknown }>;
    entityPk?: number | null;
    entityTableName: string;
    requestCorrelationId?: string | null;
    sourceModule: string;
    summaryNewValue?: unknown;
    summaryOldValue?: unknown;
  },
  executor?: QueryExecutor
) => {
  const result = await executeStatement<ResultSetHeader>(
    `INSERT INTO audit_events (
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
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, UTC_TIMESTAMP(6))`,
    [
      createPublicId(),
      input.actorUserId,
      input.actorRoleCode,
      input.entityTableName,
      input.entityPk || null,
      input.actionCode,
      input.actionLabel,
      input.sourceModule,
      input.requestCorrelationId || null,
      stringifyChange(input.summaryOldValue),
      stringifyChange(input.summaryNewValue),
    ],
    executor
  );

  if (input.changes?.length) {
    for (const change of input.changes) {
      await executeStatement(
        `INSERT INTO audit_event_changes (
           audit_event_id,
           field_name,
           old_value_text,
           new_value_text
         ) VALUES (?, ?, ?, ?)`,
        [
          result.insertId,
          change.fieldName,
          stringifyChange(change.oldValue),
          stringifyChange(change.newValue),
        ],
        executor
      );
    }
  }

  return result.insertId;
};

export const createClientNotifications = async (
  input: {
    bodyText: string;
    clientAccountId: number;
    documentId?: number | null;
    eventId?: number | null;
    expiresAt?: string | null;
    invoiceId?: number | null;
    matterId?: number | null;
    notificationTypeCode: string;
    priorityCode?: string;
    threadId?: number | null;
    title: string;
  },
  executor?: QueryExecutor
) => {
  const delivery = await getNotificationDelivery(input.notificationTypeCode, executor);
  if (!delivery.isActive || !delivery.inAppEnabled) {
    return;
  }

  const templateContext = delivery.templateId
    ? await getNotificationTemplateContext(input, executor)
    : null;
  const title = delivery.subject && templateContext
    ? renderTemplate(delivery.subject, templateContext)
    : input.title;
  const bodyText = delivery.bodyText && templateContext
    ? renderTemplate(delivery.bodyText, templateContext)
    : input.bodyText;

  const recipients = await queryRows<IdRow>(
    `SELECT DISTINCT user_id AS id
     FROM client_account_contacts
     WHERE client_account_id = ?
       AND archived_at IS NULL
       AND portal_access_enabled = 1`,
    [input.clientAccountId],
    executor
  );

  for (const recipient of recipients) {
    await executeStatement(
      `INSERT INTO notifications (
         public_id,
         recipient_user_id,
         notification_type_code,
         title,
         body_text,
         priority_code,
         matter_id,
         invoice_id,
         thread_id,
         event_id,
         document_id,
         is_read,
         read_at,
         dismissed_at,
         created_at,
         expires_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, UTC_TIMESTAMP(6), ?)`,
      [
        createPublicId(),
        recipient.id,
        input.notificationTypeCode,
        title || input.title,
        bodyText || input.bodyText,
        input.priorityCode || 'normal',
        input.matterId || null,
        input.invoiceId || null,
        input.threadId || null,
        input.eventId || null,
        input.documentId || null,
        input.expiresAt || null,
      ],
      executor
    );
  }
};

export const touchMatterActivity = async (
  matterDbId: number,
  executor?: QueryExecutor
) => {
  await executeStatement(
    `UPDATE matters
     SET last_activity_at = UTC_TIMESTAMP(6),
         updated_at = UTC_TIMESTAMP(6),
         row_version = row_version + 1
     WHERE id = ?`,
    [matterDbId],
    executor
  );
};

export const touchThreadActivity = async (
  threadDbId: number,
  executor?: QueryExecutor
) => {
  await executeStatement(
    `UPDATE conversation_threads
     SET last_message_at = UTC_TIMESTAMP(6),
         updated_at = UTC_TIMESTAMP(6)
     WHERE id = ?`,
    [threadDbId],
    executor
  );
};
