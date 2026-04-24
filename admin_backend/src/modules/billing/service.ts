import type { RowDataPacket } from 'mysql2/promise';
import { badRequest, notFound } from '../../lib/httpErrors.js';
import { executeStatement, queryRows, withTransaction } from '../../lib/mysql.js';
import type { AdminActor } from '../auth/service.js';
import { fetchInvoices, fetchMatters, fetchPayments } from '../shared.js';
import {
  createAuditEvent,
  createClientNotifications,
  resolveInvoiceByPublicId,
  resolvePaymentByPublicId,
  touchMatterActivity,
} from '../writeSupport.js';
import { createPublicId } from '../../lib/authCrypto.js';

type RefundRow = RowDataPacket & {
  amount: number;
  clientId: string | null;
  clientName: string | null;
  completedAt: string | null;
  id: string;
  invoiceId: string | null;
  matterId: string | null;
  paymentId: string;
  reasonText: string;
  requestedAt: string;
  requestedBy: string | null;
  status: string;
};

type PaymentSummaryRow = RowDataPacket & {
  clientAccountId: number;
  grossAmount: number;
  invoiceId: number | null;
  matterId: number | null;
  refundedAmount: number;
  statusCode: string;
};

type MatterBillingMetaRow = RowDataPacket & {
  billingName: string;
  city: string | null;
  clientAccountId: number;
  clientName: string;
  countryCode: string | null;
  email: string;
  gstin: string | null;
  line1: string | null;
  line2: string | null;
  matterDbId: number;
  matterNumber: string;
  phone: string;
  postalCode: string | null;
  state: string | null;
  title: string;
};

type InvoiceDispatchRow = RowDataPacket & {
  clientAccountId: number;
  clientName: string;
  invoiceDbId: number;
  invoiceId: string;
  invoiceNumber: string;
  matterDbId: number | null;
  matterId: string | null;
  matterTitle: string | null;
  statusCode: string;
  totalAmount: number;
 };

const MANUAL_INVOICE_DUE_DAYS = 7;

const firstRow = <TRow>(rows: TRow[]) => rows[0] || null;

const toDateOnly = (value: Date) => value.toISOString().slice(0, 10);

const addDaysDateOnly = (days: number) => toDateOnly(new Date(Date.now() + days * 24 * 60 * 60 * 1000));

const allocateInvoiceNumber = async (connection: Parameters<typeof executeStatement>[2]) => {
  const year = new Date().getUTCFullYear();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const rows = await queryRows<RowDataPacket & { nextValue: number }>(
    `SELECT next_value AS nextValue
     FROM business_sequences
     WHERE sequence_key = 'invoice' AND sequence_year = ?
     FOR UPDATE`,
    [year],
    connection
  );
  const current = rows[0];

  if (!current) {
    await executeStatement(
      `INSERT INTO business_sequences (
         sequence_key,
         sequence_year,
         next_value,
         created_at,
         updated_at
       ) VALUES ('invoice', ?, 2, ?, ?)`,
      [year, now, now],
      connection
    );

    return `INV-${year}-${String(1).padStart(3, '0')}`;
  }

  await executeStatement(
    `UPDATE business_sequences
     SET next_value = ?,
         updated_at = ?
     WHERE sequence_key = 'invoice'
       AND sequence_year = ?`,
    [Number(current.nextValue) + 1, now, year],
    connection
  );

  return `INV-${year}-${String(current.nextValue).padStart(3, '0')}`;
};

const getMatterBillingMeta = async (
  matterPublicId: string,
  executor?: Parameters<typeof queryRows>[2]
) => {
  const row = firstRow(
    await queryRows<MatterBillingMetaRow>(
      `SELECT
         m.id AS matterDbId,
         m.matter_number AS matterNumber,
         m.title,
         ca.id AS clientAccountId,
         ca.display_name AS clientName,
         ca.billing_name AS billingName,
         ca.primary_email AS email,
         ca.primary_phone AS phone,
         ca.gstin,
         addr.line1,
         addr.line2,
         addr.city,
         addr.state,
         addr.postal_code AS postalCode,
         addr.country_code AS countryCode
       FROM matters m
       INNER JOIN client_accounts ca ON ca.id = m.client_account_id
       LEFT JOIN client_addresses addr
         ON addr.client_account_id = ca.id
        AND addr.is_primary = 1
        AND addr.archived_at IS NULL
       WHERE m.public_id = ?
         AND m.archived_at IS NULL
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

const getInvoiceDispatchMeta = async (
  invoicePublicId: string,
  executor?: Parameters<typeof queryRows>[2]
) => {
  const row = firstRow(
    await queryRows<InvoiceDispatchRow>(
      `SELECT
         inv.id AS invoiceDbId,
         inv.public_id AS invoiceId,
         inv.invoice_number AS invoiceNumber,
         inv.client_account_id AS clientAccountId,
         ca.display_name AS clientName,
         inv.matter_id AS matterDbId,
         matter.public_id AS matterId,
         matter.title AS matterTitle,
         inv.status_code AS statusCode,
         inv.total_amount AS totalAmount
       FROM invoices inv
       INNER JOIN client_accounts ca ON ca.id = inv.client_account_id
       LEFT JOIN matters matter ON matter.id = inv.matter_id
       WHERE inv.public_id = ?
         AND inv.archived_at IS NULL
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

const listRefunds = async () => {
  const rows = await queryRows<RefundRow>(
    `SELECT
       rf.public_id AS id,
       pt.public_id AS paymentId,
       inv.public_id AS invoiceId,
       matter.public_id AS matterId,
       ca.public_id AS clientId,
       ca.display_name AS clientName,
       rf.amount,
       rf.refund_status_code AS status,
       rf.reason_text AS reasonText,
       rf.requested_at AS requestedAt,
       rf.completed_at AS completedAt,
       requester.display_name AS requestedBy
     FROM refunds rf
     JOIN payment_transactions pt ON pt.id = rf.payment_transaction_id
     LEFT JOIN invoices inv ON inv.id = rf.invoice_id
     LEFT JOIN matters matter ON matter.id = inv.matter_id
     JOIN client_accounts ca ON ca.id = pt.client_account_id
     LEFT JOIN users requester ON requester.id = rf.requested_by_user_id
     ORDER BY rf.requested_at DESC`
  );

  return rows.map((row) => ({
    amount: row.amount,
    clientId: row.clientId || '',
    clientName: row.clientName || 'Unknown client',
    completedAt: row.completedAt || undefined,
    id: row.id,
    invoiceId: row.invoiceId || '',
    matterId: row.matterId || '',
    paymentId: row.paymentId,
    reasonText: row.reasonText,
    requestedAt: row.requestedAt.replace(' ', 'T'),
    requestedBy: row.requestedBy || 'System',
    status: row.status,
  }));
};

export const getWorkspace = async () => {
  return {
    invoices: await fetchInvoices({}),
    matters: await fetchMatters({ limit: 100 }),
    payments: await fetchPayments(),
    refunds: await listRefunds(),
  };
};

export const createInvoice = async (
  actor: AdminActor,
  payload: {
    amount: number;
    description: string;
    dueDate?: string;
    matterId: string;
  }
) =>
  withTransaction(async (connection) => {
    const matter = await getMatterBillingMeta(payload.matterId, connection);
    const invoicePublicId = createPublicId();
    const invoiceNumber = await allocateInvoiceNumber(connection);
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const issueDate = toDateOnly(new Date());
    const dueDate = payload.dueDate || addDaysDateOnly(MANUAL_INVOICE_DUE_DAYS);

    const invoiceResult = await executeStatement(
      `INSERT INTO invoices (
         public_id,
         invoice_number,
         client_account_id,
         matter_id,
         matter_package_id,
         subscription_id,
         invoice_type_code,
         status_code,
         currency_code,
         issue_date,
         due_date,
         subtotal_amount,
         discount_amount,
         tax_amount,
         total_amount,
         amount_paid,
         amount_refunded,
         amount_due,
         created_by_user_id,
         created_at,
         updated_at,
         archived_at
       ) VALUES (?, ?, ?, ?, NULL, NULL, 'manual-admin', 'draft', 'INR', ?, ?, ?, 0, 0, ?, 0, 0, ?, ?, ?, ?, NULL)`,
      [
        invoicePublicId,
        invoiceNumber,
        matter.clientAccountId,
        matter.matterDbId,
        issueDate,
        dueDate,
        payload.amount,
        payload.amount,
        payload.amount,
        actor.userId,
        createdAt,
        createdAt,
      ],
      connection
    );

    await executeStatement(
      `INSERT INTO invoice_billing_snapshots (
         invoice_id,
         billing_name,
         billing_email,
         billing_phone,
         address_line1,
         address_line2,
         city,
         state,
         postal_code,
         country_code,
         gstin,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceResult.insertId,
        matter.billingName || matter.clientName,
        matter.email,
        matter.phone,
        matter.line1 || 'Address pending',
        matter.line2 || null,
        matter.city || '',
        matter.state || '',
        matter.postalCode || '',
        matter.countryCode || 'IN',
        matter.gstin || null,
        createdAt,
      ],
      connection
    );

    await executeStatement(
      `INSERT INTO invoice_lines (
         invoice_id,
         line_type_code,
         service_id,
         subscription_plan_id,
         description,
         quantity,
         unit_price,
         line_subtotal,
         discount_amount,
         taxable_amount,
         line_total,
         sort_order,
         created_at
       ) VALUES (?, 'manual-admin', NULL, NULL, ?, 1, ?, ?, 0, ?, ?, 1, ?)`,
      [
        invoiceResult.insertId,
        payload.description,
        payload.amount,
        payload.amount,
        payload.amount,
        payload.amount,
        createdAt,
      ],
      connection
    );

    await executeStatement(
      `INSERT INTO invoice_installments (
         invoice_id,
         installment_no,
         due_date,
         amount_due,
         amount_paid,
         amount_remaining,
         status_code,
         paid_at,
         created_at
       ) VALUES (?, 1, ?, ?, 0, ?, 'pending', NULL, ?)`,
      [invoiceResult.insertId, dueDate, payload.amount, payload.amount, createdAt],
      connection
    );

    await touchMatterActivity(matter.matterDbId, connection);

    await createAuditEvent(
      {
        actionCode: 'invoice.created',
        actionLabel: 'Draft invoice created',
        actorRoleCode: actor.roleCodes[0] || 'billing_admin',
        actorUserId: actor.userId,
        changes: [
          { fieldName: 'description', newValue: payload.description },
          { fieldName: 'amount_due', newValue: payload.amount },
          { fieldName: 'due_date', newValue: dueDate },
          { fieldName: 'status_code', newValue: 'draft' },
        ],
        entityPk: invoiceResult.insertId,
        entityTableName: 'invoices',
        sourceModule: 'billing_workspace',
        summaryNewValue: `Created draft invoice ${invoiceNumber} for matter ${matter.matterNumber}`,
      },
      connection
    );

    return {
      invoiceId: invoicePublicId,
      status: 'created' as const,
    };
  });

export const sendInvoice = async (actor: AdminActor, invoiceId: string) =>
  withTransaction(async (connection) => {
    const invoice = await getInvoiceDispatchMeta(invoiceId, connection);

    if (invoice.statusCode === 'paid' || invoice.statusCode === 'void' || invoice.statusCode === 'refunded') {
      throw badRequest(
        'invoice_send_not_allowed',
        'Only draft or outstanding invoices can be sent to the client.'
      );
    }

    const isInitialSend = invoice.statusCode === 'draft';

    if (isInitialSend) {
      await executeStatement(
        `UPDATE invoices
         SET status_code = 'sent',
             updated_at = UTC_TIMESTAMP(6),
             row_version = row_version + 1
         WHERE id = ?`,
        [invoice.invoiceDbId],
        connection
      );
    }

    if (invoice.matterDbId) {
      await executeStatement(
        `UPDATE matters
         SET operational_status_code = CASE
               WHEN operational_status_code IN ('paid', 'completed', 'archived')
                 THEN operational_status_code
               ELSE 'awaiting-payment'
             END,
             last_activity_at = UTC_TIMESTAMP(6),
             updated_at = UTC_TIMESTAMP(6),
             row_version = row_version + 1
         WHERE id = ?`,
        [invoice.matterDbId],
        connection
      );
    }

    await createClientNotifications(
      {
        bodyText: isInitialSend
          ? `Invoice ${invoice.invoiceNumber} has been issued for INR ${invoice.totalAmount.toFixed(2)}.`
          : `Reminder: invoice ${invoice.invoiceNumber} for INR ${invoice.totalAmount.toFixed(2)} is still outstanding.`,
        clientAccountId: invoice.clientAccountId,
        invoiceId: invoice.invoiceDbId,
        matterId: invoice.matterDbId,
        notificationTypeCode: isInitialSend ? 'invoice_generated' : 'payment_reminder',
        priorityCode: 'normal',
        title: isInitialSend ? 'Invoice ready for payment' : 'Payment reminder',
      },
      connection
    );

    await createAuditEvent(
      {
        actionCode: isInitialSend ? 'invoice.sent' : 'invoice.reminder_sent',
        actionLabel: isInitialSend ? 'Invoice sent to client' : 'Invoice reminder sent',
        actorRoleCode: actor.roleCodes[0] || 'billing_admin',
        actorUserId: actor.userId,
        changes: isInitialSend
          ? [{ fieldName: 'status_code', oldValue: 'draft', newValue: 'sent' }]
          : [{ fieldName: 'reminder_sent', newValue: true }],
        entityPk: invoice.invoiceDbId,
        entityTableName: 'invoices',
        sourceModule: 'billing_workspace',
        summaryNewValue: isInitialSend
          ? `Sent invoice ${invoice.invoiceNumber}`
          : `Sent reminder for invoice ${invoice.invoiceNumber}`,
      },
      connection
    );

    return {
      invoiceId: invoice.invoiceId,
      status: isInitialSend ? ('sent' as const) : ('reminder_sent' as const),
    };
  });

export const createRefund = async (
  actor: AdminActor,
  payload: {
    amount: number;
    invoiceId?: string;
    paymentId: string;
    reasonText: string;
  }
) => {
  return withTransaction(async (connection) => {
    const payment = await resolvePaymentByPublicId(payload.paymentId, connection);
    const invoice = payload.invoiceId
      ? await resolveInvoiceByPublicId(payload.invoiceId, connection)
      : payment.invoiceId
        ? { id: payment.invoiceId }
        : null;

    const paymentSummaryRows = await queryRows<PaymentSummaryRow>(
      `SELECT
         pt.client_account_id AS clientAccountId,
         pt.gross_amount AS grossAmount,
         pt.status_code AS statusCode,
         MAX(pa.invoice_id) AS invoiceId,
         MAX(inv.matter_id) AS matterId,
         COALESCE(SUM(rf.amount), 0) AS refundedAmount
       FROM payment_transactions pt
       LEFT JOIN payment_allocations pa ON pa.payment_transaction_id = pt.id
       LEFT JOIN invoices inv ON inv.id = pa.invoice_id
       LEFT JOIN refunds rf ON rf.payment_transaction_id = pt.id
       WHERE pt.id = ?
       GROUP BY pt.client_account_id, pt.gross_amount, pt.status_code`,
      [payment.id],
      connection
    );

    const paymentSummary = paymentSummaryRows[0];

    if (!paymentSummary) {
      throw badRequest('payment_not_refundable', 'Payment summary could not be resolved.');
    }

    const availableAmount = Math.max(paymentSummary.grossAmount - paymentSummary.refundedAmount, 0);
    if (payload.amount > availableAmount) {
      throw badRequest(
        'refund_amount_exceeds_available',
        `Refund exceeds the remaining refundable amount of ${availableAmount}.`
      );
    }

    const refundResult = await executeStatement(
      `INSERT INTO refunds (
         public_id,
         payment_transaction_id,
         invoice_id,
         amount,
         refund_status_code,
         reason_text,
         gateway_refund_ref,
         requested_by_user_id,
         approved_by_user_id,
         requested_at,
         completed_at,
         created_at,
         updated_at
       ) VALUES (
         ?, ?, ?, ?, 'completed', ?, NULL, ?, ?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6),
         UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
       )`,
      [
        createPublicId(),
        payment.id,
        invoice?.id || null,
        payload.amount,
        payload.reasonText,
        actor.userId,
        actor.userId,
      ],
      connection
    );

    const totalRefunded = paymentSummary.refundedAmount + payload.amount;
    const nextPaymentStatus =
      totalRefunded >= paymentSummary.grossAmount ? 'refunded' : 'partially-refunded';

    await executeStatement(
      `UPDATE payment_transactions
       SET status_code = ?, updated_at = UTC_TIMESTAMP(6), row_version = row_version + 1
       WHERE id = ?`,
      [nextPaymentStatus, payment.id],
      connection
    );

    if (invoice?.id) {
      await executeStatement(
        `UPDATE invoices
         SET amount_refunded = amount_refunded + ?,
             status_code = CASE
               WHEN amount_refunded + ? >= total_amount THEN 'refunded'
               ELSE status_code
             END,
             updated_at = UTC_TIMESTAMP(6),
             row_version = row_version + 1
         WHERE id = ?`,
        [payload.amount, payload.amount, invoice.id],
        connection
      );
    }

    if (paymentSummary.matterId) {
      await touchMatterActivity(paymentSummary.matterId, connection);
    }

    await createAuditEvent(
      {
        actionCode: 'refund.created',
        actionLabel: 'Refund issued',
        actorRoleCode: actor.roleCodes[0] || 'billing_admin',
        actorUserId: actor.userId,
        changes: [
          { fieldName: 'amount', newValue: payload.amount },
          { fieldName: 'reason_text', newValue: payload.reasonText },
          { fieldName: 'payment_status', oldValue: paymentSummary.statusCode, newValue: nextPaymentStatus },
        ],
        entityPk: refundResult.insertId,
        entityTableName: 'refunds',
        sourceModule: 'billing_workspace',
        summaryNewValue: `Refunded ${payload.amount}`,
      },
      connection
    );

    await createClientNotifications(
      {
        bodyText: `A refund of INR ${payload.amount.toFixed(2)} has been initiated against your payment.`,
        clientAccountId: paymentSummary.clientAccountId,
        invoiceId: invoice?.id || null,
        matterId: paymentSummary.matterId || null,
        notificationTypeCode: 'payment_reminder',
        priorityCode: 'normal',
        title: 'Refund issued',
      },
      connection
    );

    return { status: 'created' as const };
  });
};
