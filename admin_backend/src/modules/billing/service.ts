import type { RowDataPacket } from 'mysql2/promise';
import { badRequest } from '../../lib/httpErrors.js';
import { executeStatement, queryRows, withTransaction } from '../../lib/mysql.js';
import type { AdminActor } from '../auth/service.js';
import { fetchInvoices, fetchPayments } from '../shared.js';
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
    payments: await fetchPayments(),
    refunds: await listRefunds(),
  };
};

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
