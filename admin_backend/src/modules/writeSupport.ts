import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { createPublicId } from '../lib/authCrypto.js';
import { notFound } from '../lib/httpErrors.js';
import { executeStatement, queryRows, type QueryExecutor } from '../lib/mysql.js';
import { getRequestContext } from '../lib/observability.js';
import { sendEmail } from './providers/email.js';
import { sendSms } from './providers/sms.js';
import type { DeliveryChannel, ProviderDeliveryResult } from './providers/types.js';

type IdRow = RowDataPacket & { id: number };
type MatterRow = IdRow & { clientAccountId: number };
type ThreadRow = IdRow & { clientAccountId: number; matterId: number | null };
type PaymentRow = IdRow & { clientAccountId: number; invoiceId: number | null };
type NotificationDeliveryRow = RowDataPacket & {
  bodyText: string | null;
  emailEnabled: number;
  inAppEnabled: number;
  isActive: number;
  smsEnabled: number;
  subject: string | null;
  templateId: string | null;
};
type NotificationRecipientRow = RowDataPacket & {
  caseActivityAlerts: number | null;
  email: string | null;
  emailUpdates: number | null;
  fullName: string | null;
  id: number;
  inAppAlerts: number | null;
  invoiceReminders: number | null;
  phone: string | null;
  smsAlerts: number | null;
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

const truncate = (value: string, maxLength = 1200) =>
  value.length > maxLength ? value.slice(0, maxLength - 1) : value;

const maskEmail = (value: string) => {
  const [localPart, domainPart] = value.split('@');
  if (!domainPart) {
    return 'masked-email';
  }

  return `${localPart.slice(0, 2)}***@${domainPart}`;
};

const maskPhone = (value: string) => {
  const normalized = value.replace(/\s+/g, '');
  return normalized.length <= 4 ? 'masked-phone' : `***${normalized.slice(-4)}`;
};

const notificationPreferenceAllows = (
  recipient: NotificationRecipientRow,
  notificationTypeCode: string,
  channel: 'email' | 'in_app' | 'sms'
) => {
  const channelAllowed =
    channel === 'email'
      ? recipient.emailUpdates !== 0
      : channel === 'sms'
        ? recipient.smsAlerts !== 0
        : recipient.inAppAlerts !== 0;

  if (!channelAllowed) {
    return false;
  }

  if (['invoice_generated', 'payment_reminder'].includes(notificationTypeCode)) {
    return recipient.invoiceReminders !== 0;
  }

  return recipient.caseActivityAlerts !== 0;
};

const getNotificationDelivery = async (notificationTypeCode: string, executor?: QueryExecutor) => {
  const row = firstRow(
    await queryRows<NotificationDeliveryRow>(
      `SELECT
         COALESCE(nds.in_app_enabled, 1) AS inAppEnabled,
         COALESCE(nds.email_enabled, 0) AS emailEnabled,
         COALESCE(nds.sms_enabled, 0) AS smsEnabled,
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

  return row || {
    bodyText: null,
    emailEnabled: 0,
    inAppEnabled: 1,
    isActive: 1,
    smsEnabled: 0,
    subject: null,
    templateId: null,
  };
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
    ipAddress?: string | null;
    requestCorrelationId?: string | null;
    sourceModule: string;
    summaryNewValue?: unknown;
    summaryOldValue?: unknown;
    userAgent?: string | null;
  },
  executor?: QueryExecutor
) => {
  const requestContext = getRequestContext();
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
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(6))`,
    [
      createPublicId(),
      input.actorUserId,
      input.actorRoleCode,
      input.entityTableName,
      input.entityPk || null,
      input.actionCode,
      input.actionLabel,
      input.sourceModule,
      input.requestCorrelationId ?? requestContext?.requestId ?? null,
      input.ipAddress ?? requestContext?.ipAddress ?? null,
      input.userAgent ?? requestContext?.userAgent ?? null,
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

const auditNotificationDelivery = async (
  input: {
    channel: DeliveryChannel;
    maskedRecipient: string;
    notificationId: number | null;
    notificationTypeCode: string;
    relatedInvoiceId?: number | null;
    result: ProviderDeliveryResult;
  },
  executor?: QueryExecutor
) => {
  const statusSuffix =
    input.result.status === 'sent'
      ? 'sent'
      : input.result.status === 'preview'
        ? 'previewed'
        : input.result.status === 'disabled'
          ? 'suppressed'
          : 'failed';
  const isInvoiceEmail =
    input.channel === 'email' &&
    input.relatedInvoiceId &&
    input.notificationTypeCode === 'invoice_generated';

  await createAuditEvent(
    {
      actionCode: isInvoiceEmail
        ? `invoice.email_${statusSuffix}`
        : `notification.${input.channel}_${statusSuffix}`,
      actionLabel: isInvoiceEmail
        ? `Invoice email ${statusSuffix}`
        : `Notification ${input.channel} ${statusSuffix}`,
      actorRoleCode: 'system',
      actorUserId: null,
      changes: [
        { fieldName: 'channel', newValue: input.channel },
        { fieldName: 'provider_code', newValue: input.result.providerCode },
        { fieldName: 'delivery_status', newValue: input.result.status },
        { fieldName: 'provider_reference', newValue: input.result.providerReference || null },
        { fieldName: 'failure_reason', newValue: input.result.errorMessage || null },
        { fieldName: 'recipient', newValue: input.maskedRecipient },
      ],
      entityPk: isInvoiceEmail ? input.relatedInvoiceId : input.notificationId,
      entityTableName: isInvoiceEmail ? 'invoices' : 'notifications',
      sourceModule: 'notification_delivery',
      summaryNewValue: {
        channel: input.channel,
        notificationTypeCode: input.notificationTypeCode,
        providerCode: input.result.providerCode,
        status: input.result.status,
      },
    },
    executor
  );
};

const dispatchNotificationChannel = async (
  input: {
    bodyText: string;
    channel: DeliveryChannel;
    notificationId: number | null;
    notificationTypeCode: string;
    recipient: NotificationRecipientRow;
    relatedInvoiceId?: number | null;
    title: string;
  },
  executor?: QueryExecutor
) => {
  if (input.channel === 'email') {
    if (!input.recipient.email) {
      await auditNotificationDelivery(
        {
          channel: input.channel,
          maskedRecipient: 'missing-email',
          notificationId: input.notificationId,
          notificationTypeCode: input.notificationTypeCode,
          relatedInvoiceId: input.relatedInvoiceId,
          result: {
            errorMessage: 'Recipient has no email address.',
            providerCode: 'local',
            status: 'failed',
          },
        },
        executor
      );
      return;
    }

    const result = await sendEmail({
      subject: input.title,
      text: input.bodyText,
      to: input.recipient.email,
    });

    await auditNotificationDelivery(
      {
        channel: input.channel,
        maskedRecipient: maskEmail(input.recipient.email),
        notificationId: input.notificationId,
        notificationTypeCode: input.notificationTypeCode,
        relatedInvoiceId: input.relatedInvoiceId,
        result,
      },
      executor
    );
    return;
  }

  if (!input.recipient.phone) {
    await auditNotificationDelivery(
      {
        channel: input.channel,
        maskedRecipient: 'missing-phone',
        notificationId: input.notificationId,
        notificationTypeCode: input.notificationTypeCode,
        relatedInvoiceId: input.relatedInvoiceId,
        result: {
          errorMessage: 'Recipient has no phone number.',
          providerCode: 'local',
          status: 'failed',
        },
      },
      executor
    );
    return;
  }

  const result = await sendSms({
    body: truncate(`${input.title}\n${input.bodyText}`),
    to: input.recipient.phone,
  });

  await auditNotificationDelivery(
    {
      channel: input.channel,
      maskedRecipient: maskPhone(input.recipient.phone),
      notificationId: input.notificationId,
      notificationTypeCode: input.notificationTypeCode,
      relatedInvoiceId: input.relatedInvoiceId,
      result,
    },
    executor
  );
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
    suppressExternalDelivery?: boolean;
    threadId?: number | null;
    title: string;
  },
  executor?: QueryExecutor
) => {
  const delivery = await getNotificationDelivery(input.notificationTypeCode, executor);
  if (!delivery.isActive) {
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

  const recipients = await queryRows<NotificationRecipientRow>(
    `SELECT DISTINCT
       u.id,
       u.email,
       u.phone,
       u.display_name AS fullName,
       COALESCE(unp.in_app_alerts, 1) AS inAppAlerts,
       COALESCE(unp.email_updates, 1) AS emailUpdates,
       COALESCE(unp.sms_alerts, 1) AS smsAlerts,
       COALESCE(unp.invoice_reminders, 1) AS invoiceReminders,
       COALESCE(unp.case_activity_alerts, 1) AS caseActivityAlerts
     FROM client_account_contacts cac
     INNER JOIN users u ON u.id = cac.user_id
     LEFT JOIN user_notification_preferences unp ON unp.user_id = u.id
     WHERE cac.client_account_id = ?
       AND cac.archived_at IS NULL
       AND cac.portal_access_enabled = 1
       AND u.archived_at IS NULL
       AND u.login_enabled = 1`,
    [input.clientAccountId],
    executor
  );

  for (const recipient of recipients) {
    let notificationId: number | null = null;

    if (delivery.inAppEnabled && notificationPreferenceAllows(recipient, input.notificationTypeCode, 'in_app')) {
      const notificationResult = await executeStatement(
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
      notificationId = notificationResult.insertId;
    }

    if (
      !input.suppressExternalDelivery &&
      delivery.emailEnabled &&
      notificationPreferenceAllows(recipient, input.notificationTypeCode, 'email')
    ) {
      await dispatchNotificationChannel(
        {
          bodyText: bodyText || input.bodyText,
          channel: 'email',
          notificationId,
          notificationTypeCode: input.notificationTypeCode,
          recipient,
          relatedInvoiceId: input.invoiceId || null,
          title: title || input.title,
        },
        executor
      );
    }

    if (
      !input.suppressExternalDelivery &&
      delivery.smsEnabled &&
      notificationPreferenceAllows(recipient, input.notificationTypeCode, 'sms')
    ) {
      await dispatchNotificationChannel(
        {
          bodyText: bodyText || input.bodyText,
          channel: 'sms',
          notificationId,
          notificationTypeCode: input.notificationTypeCode,
          recipient,
          relatedInvoiceId: input.invoiceId || null,
          title: title || input.title,
        },
        executor
      );
    }
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
