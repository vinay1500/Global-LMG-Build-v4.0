import { z } from 'zod';
import { renderInvoicePdf } from '../../lib/invoicePdf.js';
import { getMysqlPool } from '../../lib/mysql.js';
import { badRequest, conflict, notFound } from '../../lib/httpErrors.js';
import { escapeHtml } from '../../lib/html.js';
import { createPublicId } from '../../lib/ids.js';
import { executeResult, selectOne, withConnection, withTransaction } from '../../lib/mysqlUtils.js';
import { nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { allocateBusinessNumber } from '../platform/sequences.js';
import { domainService } from '../domain/service.js';
import { transactionalEmailService } from '../notifications/emailService.js';
import { adminNotificationService } from '../notifications/service.js';
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const createPackageInvoiceLineSchema = z.object({
    description: z.string().trim().min(2).max(255),
    discountAmount: z.coerce.number().min(0).default(0),
    lineTypeCode: z.string().trim().min(2).max(32).default('service'),
    quantity: z.coerce.number().positive(),
    taxCode: z.string().trim().max(32).optional(),
    taxName: z.string().trim().max(120).optional(),
    taxPercent: z.coerce.number().min(0).max(100).default(0),
    unitPrice: z.coerce.number().min(0),
});
const createPackageInvoiceSchema = z.object({
    billingSnapshot: z
        .object({
        addressLine1: z.string().trim().min(2).max(255),
        addressLine2: z.string().trim().max(255).optional(),
        billingEmail: z.string().trim().email().max(255),
        billingName: z.string().trim().min(2).max(200),
        billingPhone: z.string().trim().min(4).max(40),
        city: z.string().trim().min(2).max(100),
        countryCode: z.string().trim().min(2).max(16),
        gstin: z.string().trim().max(24).optional(),
        postalCode: z.string().trim().min(2).max(20),
        state: z.string().trim().min(2).max(100),
    })
        .optional(),
    clientAccountId: z.string().trim().min(2).max(64),
    currencyCode: z.string().trim().length(3).default('INR'),
    dueDate: z.string().trim().regex(datePattern),
    issueDate: z.string().trim().regex(datePattern),
    lines: z.array(createPackageInvoiceLineSchema).min(1).max(25),
    matterId: z.string().trim().min(2).max(64),
    messageText: z.string().trim().max(4000).optional(),
    packageDescription: z.string().trim().max(4000).optional(),
    packageName: z.string().trim().min(2).max(160),
    recipientEmail: z.string().trim().email().max(320).optional(),
    sendEmailNow: z.boolean().default(false),
});
const recordManualPaymentAllocationSchema = z.object({
    amountApplied: z.coerce.number().positive(),
    installmentId: z.coerce.number().int().positive().optional(),
    invoiceId: z.string().trim().min(2).max(64),
});
const recordManualPaymentSchema = z.object({
    allocations: z.array(recordManualPaymentAllocationSchema).min(1).max(25),
    amount: z.coerce.number().positive(),
    clientAccountId: z.string().trim().min(2).max(64),
    currencyCode: z.string().trim().length(3).default('INR'),
    gatewayOrderRef: z.string().trim().max(255).optional(),
    gatewayPaymentRef: z.string().trim().max(255).optional(),
    initiatedAt: z.string().trim().datetime().optional(),
    noteText: z.string().trim().max(4000).optional(),
    paymentProviderCode: z.string().trim().min(2).max(32).default('manual'),
});
const roundMoney = (value) => Number(value.toFixed(2));
const buildInvoiceEmailHtml = (input) => [
    `<p>Hello${input.billingName ? ` ${escapeHtml(input.billingName)}` : ''},</p>`,
    `<p>Please find attached invoice <strong>${escapeHtml(input.invoiceNumber)}</strong>.</p>`,
    `<p>Total: <strong>${escapeHtml(String(input.totalAmount))} ${escapeHtml(input.currencyCode)}</strong><br />Amount due: <strong>${escapeHtml(String(input.amountDue))} ${escapeHtml(input.currencyCode)}</strong><br />Due date: <strong>${escapeHtml(input.dueDate)}</strong></p>`,
    input.messageText
        ? `<p><strong>Note from Global LMG:</strong><br />${escapeHtml(input.messageText).replace(/\n/g, '<br />')}</p>`
        : '',
    '<p>Regards,<br />Global LMG</p>',
]
    .filter(Boolean)
    .join('');
const requireBillingSnapshot = (snapshot) => {
    const required = [
        ['billingName', snapshot.billingName],
        ['billingEmail', snapshot.billingEmail],
        ['billingPhone', snapshot.billingPhone],
        ['addressLine1', snapshot.addressLine1],
        ['city', snapshot.city],
        ['state', snapshot.state],
        ['postalCode', snapshot.postalCode],
        ['countryCode', snapshot.countryCode],
    ];
    const missing = required.filter(([, value]) => !value || !String(value).trim()).map(([key]) => key);
    if (missing.length > 0) {
        throw badRequest('invoice_billing_snapshot_incomplete', `Billing snapshot is missing: ${missing.join(', ')}.`);
    }
    return {
        addressLine1: String(snapshot.addressLine1 || '').trim(),
        addressLine2: snapshot.addressLine2?.trim() || null,
        billingEmail: String(snapshot.billingEmail || '').trim(),
        billingName: String(snapshot.billingName || '').trim(),
        billingPhone: String(snapshot.billingPhone || '').trim(),
        city: String(snapshot.city || '').trim(),
        countryCode: String(snapshot.countryCode || '').trim(),
        gstin: snapshot.gstin?.trim() || null,
        postalCode: String(snapshot.postalCode || '').trim(),
        state: String(snapshot.state || '').trim(),
    };
};
export const adminBillingService = {
    createPackageInvoiceSchema,
    recordManualPaymentSchema,
    async listInvoices() {
        return domainService.listInvoices();
    },
    async getInvoice(invoicePublicId) {
        return domainService.getInvoiceByPublicId(invoicePublicId);
    },
    async getInvoicePdf(invoicePublicId) {
        const invoice = await domainService.getInvoiceByPublicId(invoicePublicId);
        const pdf = await renderInvoicePdf(invoice);
        return {
            buffer: pdf,
            filename: `${invoice.invoiceNumber || invoice.id}.pdf`,
            invoice,
        };
    },
    async createPackageInvoice(actorUserId, actorRoleCode, input) {
        const payload = createPackageInvoiceSchema.parse(input);
        const created = await withTransaction(getMysqlPool(), async (connection) => {
            const client = await selectOne(connection, `SELECT
           ca.id AS client_account_id,
           ca.display_name,
           ca.legal_name,
           ca.primary_email,
           ca.primary_phone,
           m.id AS matter_id,
           m.public_id AS matter_public_id
         FROM client_accounts ca
         INNER JOIN matters m
           ON m.public_id = ?
          AND m.client_account_id = ca.id
          AND m.archived_at IS NULL
         WHERE ca.public_id = ?
           AND ca.archived_at IS NULL
         LIMIT 1`, [payload.matterId, payload.clientAccountId]);
            if (!client?.client_account_id || !client?.matter_id) {
                throw notFound('invoice_client_or_matter_not_found', 'The selected client or matter could not be resolved together.');
            }
            const contact = await selectOne(connection, `SELECT
           u.display_name AS name,
           u.email,
           u.phone,
           cac.is_billing,
           cac.is_primary
         FROM client_account_contacts cac
         INNER JOIN users u
           ON u.id = cac.user_id
         WHERE cac.client_account_id = ?
           AND cac.archived_at IS NULL
         ORDER BY cac.is_billing DESC, cac.is_primary DESC, cac.id ASC
         LIMIT 1`, [Number(client.client_account_id)]);
            const address = await selectOne(connection, `SELECT
           line1,
           line2,
           city,
           state,
           postal_code,
           country_code
         FROM client_addresses
         WHERE client_account_id = ?
           AND archived_at IS NULL
         ORDER BY is_primary DESC, id ASC
         LIMIT 1`, [Number(client.client_account_id)]);
            const billingSnapshot = requireBillingSnapshot({
                addressLine1: payload.billingSnapshot?.addressLine1 || address?.line1,
                addressLine2: payload.billingSnapshot?.addressLine2 || address?.line2,
                billingEmail: payload.billingSnapshot?.billingEmail ||
                    payload.recipientEmail ||
                    contact?.email ||
                    client.primary_email,
                billingName: payload.billingSnapshot?.billingName ||
                    contact?.name ||
                    client.display_name ||
                    client.legal_name,
                billingPhone: payload.billingSnapshot?.billingPhone || contact?.phone || client.primary_phone,
                city: payload.billingSnapshot?.city || address?.city,
                countryCode: payload.billingSnapshot?.countryCode || address?.country_code,
                gstin: payload.billingSnapshot?.gstin || null,
                postalCode: payload.billingSnapshot?.postalCode || address?.postal_code,
                state: payload.billingSnapshot?.state || address?.state,
            });
            const normalizedLines = payload.lines.map((line, index) => {
                const subtotal = roundMoney(line.quantity * line.unitPrice);
                const discountAmount = roundMoney(line.discountAmount || 0);
                if (discountAmount > subtotal) {
                    throw badRequest('invoice_line_discount_invalid', `Line ${index + 1} has a discount larger than its subtotal.`);
                }
                const taxableAmount = roundMoney(subtotal - discountAmount);
                const taxAmount = roundMoney((taxableAmount * (line.taxPercent || 0)) / 100);
                return {
                    ...line,
                    discountAmount,
                    lineTotal: roundMoney(taxableAmount + taxAmount),
                    subtotal,
                    taxAmount,
                    taxableAmount,
                };
            });
            const subtotalAmount = roundMoney(normalizedLines.reduce((sum, line) => sum + line.subtotal, 0));
            const discountAmount = roundMoney(normalizedLines.reduce((sum, line) => sum + line.discountAmount, 0));
            const taxAmount = roundMoney(normalizedLines.reduce((sum, line) => sum + line.taxAmount, 0));
            const totalAmount = roundMoney(subtotalAmount - discountAmount + taxAmount);
            const timestamp = toMysqlDateTime(nowUtc());
            const packagePublicId = createPublicId();
            const invoicePublicId = createPublicId();
            const invoiceNumber = await allocateBusinessNumber(connection, 'invoice', 'INV');
            const packageResult = await executeResult(connection, `INSERT INTO matter_packages (
          public_id, matter_id, package_name, description, total_price, created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                packagePublicId,
                Number(client.matter_id),
                payload.packageName,
                payload.packageDescription || null,
                totalAmount,
                actorUserId,
                timestamp,
                timestamp,
            ]);
            const invoiceResult = await executeResult(connection, `INSERT INTO invoices (
          public_id, invoice_number, client_account_id, matter_id, subscription_id, invoice_type_code, status_code,
          currency_code, issue_date, due_date, subtotal_amount, discount_amount, tax_amount, total_amount,
          amount_paid, amount_refunded, amount_due, created_by_user_id, created_at, updated_at, archived_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                invoicePublicId,
                invoiceNumber,
                Number(client.client_account_id),
                Number(client.matter_id),
                null,
                'package',
                'draft',
                payload.currencyCode.toUpperCase(),
                payload.issueDate,
                payload.dueDate,
                subtotalAmount,
                discountAmount,
                taxAmount,
                totalAmount,
                0,
                0,
                totalAmount,
                actorUserId,
                timestamp,
                timestamp,
                null,
            ]);
            const invoiceId = Number(invoiceResult.insertId);
            await connection.execute(`INSERT INTO invoice_billing_snapshots (
          invoice_id, billing_name, billing_email, billing_phone, address_line1, address_line2,
          city, state, postal_code, country_code, gstin, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                invoiceId,
                billingSnapshot.billingName,
                billingSnapshot.billingEmail,
                billingSnapshot.billingPhone,
                billingSnapshot.addressLine1,
                billingSnapshot.addressLine2,
                billingSnapshot.city,
                billingSnapshot.state,
                billingSnapshot.postalCode,
                billingSnapshot.countryCode,
                billingSnapshot.gstin,
                timestamp,
            ]);
            for (const [index, line] of normalizedLines.entries()) {
                const lineResult = await executeResult(connection, `INSERT INTO invoice_lines (
            invoice_id, line_type_code, service_id, subscription_plan_id, description, quantity,
            unit_price, line_subtotal, discount_amount, taxable_amount, line_total, sort_order, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    invoiceId,
                    line.lineTypeCode,
                    null,
                    null,
                    line.description,
                    line.quantity,
                    line.unitPrice,
                    line.subtotal,
                    line.discountAmount,
                    line.taxableAmount,
                    line.lineTotal,
                    index,
                    timestamp,
                ]);
                if (line.taxPercent > 0) {
                    await connection.execute(`INSERT INTO invoice_line_taxes (
              invoice_line_id, tax_rate_id, tax_code_snapshot, tax_name_snapshot, tax_percent_snapshot,
              taxable_amount, tax_amount, sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                        Number(lineResult.insertId),
                        null,
                        line.taxCode || 'CUSTOM',
                        line.taxName || 'Tax',
                        line.taxPercent,
                        line.taxableAmount,
                        line.taxAmount,
                        0,
                        timestamp,
                    ]);
                }
            }
            await connection.execute(`INSERT INTO invoice_installments (
          invoice_id, installment_no, due_date, amount_due, amount_paid, amount_remaining, status_code, paid_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [invoiceId, 1, payload.dueDate, totalAmount, 0, totalAmount, 'pending', null, timestamp]);
            await adminNotificationService.insertAuditEvent(connection, {
                actionCode: 'invoice_created',
                actionLabel: 'Invoice created',
                actorRoleCodeSnapshot: actorRoleCode,
                actorUserId,
                entityPk: invoiceId,
                entityTableName: 'invoices',
                sourceModule: 'Admin Billing',
                summaryNewValue: `${invoiceNumber} · ${payload.packageName}`,
            });
            return {
                invoiceId: invoicePublicId,
                invoiceNumber,
                matterId: client.matter_public_id,
                packageId: packagePublicId,
                packageRecordId: Number(packageResult.insertId),
            };
        });
        if (payload.sendEmailNow) {
            await this.sendInvoiceEmail(created.invoiceId, {
                messageText: payload.messageText,
                recipientEmail: payload.recipientEmail,
            });
            await withTransaction(getMysqlPool(), async (connection) => {
                await executeResult(connection, `UPDATE invoices
           SET status_code = 'sent',
               updated_at = ?
           WHERE public_id = ?`, [toMysqlDateTime(nowUtc()), created.invoiceId]);
            });
        }
        return created;
    },
    async sendInvoiceEmail(invoicePublicId, input = {}) {
        const pdf = await this.getInvoicePdf(invoicePublicId);
        const invoice = pdf.invoice;
        const recipientEmail = input.recipientEmail?.trim() || invoice.billingSnapshot?.billingEmail?.trim();
        if (!recipientEmail) {
            throw badRequest('invoice_recipient_missing', 'This invoice does not have a billing email. Provide a recipient email to send it.');
        }
        const note = input.messageText?.trim();
        const subject = `Invoice ${invoice.invoiceNumber} from Global LMG`;
        const lines = [
            `Hello${invoice.billingSnapshot?.billingName ? ` ${invoice.billingSnapshot.billingName}` : ''},`,
            '',
            `Please find attached invoice ${invoice.invoiceNumber}.`,
            `Total: ${invoice.totalAmount} ${invoice.currencyCode}`,
            `Amount due: ${invoice.amountDue} ${invoice.currencyCode}`,
            `Due date: ${invoice.dueDate}`,
        ];
        if (note) {
            lines.push('', `Note from Global LMG: ${note}`);
        }
        lines.push('', 'Regards,', 'Global LMG');
        const delivery = await transactionalEmailService.send({
            attachments: [
                {
                    contentBase64: pdf.buffer.toString('base64'),
                    fileName: pdf.filename,
                },
            ],
            html: buildInvoiceEmailHtml({
                amountDue: invoice.amountDue,
                billingName: invoice.billingSnapshot?.billingName,
                currencyCode: invoice.currencyCode,
                dueDate: invoice.dueDate,
                invoiceNumber: invoice.invoiceNumber,
                messageText: note,
                totalAmount: invoice.totalAmount,
            }),
            subject,
            text: lines.join('\n'),
            to: recipientEmail,
        });
        await withTransaction(getMysqlPool(), async (connection) => {
            await executeResult(connection, `UPDATE invoices
         SET status_code = CASE WHEN status_code = 'paid' THEN status_code ELSE 'sent' END,
             updated_at = ?
         WHERE public_id = ?`, [toMysqlDateTime(nowUtc()), invoicePublicId]);
        });
        return {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            providerReference: delivery.providerReference ?? null,
            recipientEmail,
        };
    },
    async listPayments() {
        return domainService.listPayments();
    },
    async listRefunds() {
        return domainService.listRefunds();
    },
    async recordManualPayment(actorUserId, actorRoleCode, input) {
        const payload = recordManualPaymentSchema.parse(input);
        const amountApplied = roundMoney(payload.allocations.reduce((sum, allocation) => sum + allocation.amountApplied, 0));
        if (roundMoney(payload.amount) !== amountApplied) {
            throw badRequest('manual_payment_amount_mismatch', 'Payment amount must match the total allocated amount.');
        }
        return withTransaction(getMysqlPool(), async (connection) => {
            const timestamp = toMysqlDateTime(payload.initiatedAt || nowUtc());
            const client = await selectOne(connection, 'SELECT id FROM client_accounts WHERE public_id = ? AND archived_at IS NULL LIMIT 1', [payload.clientAccountId]);
            if (!client?.id) {
                throw notFound('client_account_not_found', 'Client account not found.');
            }
            const allocationRows = [];
            for (const allocation of payload.allocations) {
                const resolved = await selectOne(connection, `SELECT
             i.id AS invoice_id,
             i.client_account_id,
             i.currency_code,
             i.amount_due,
             i.amount_paid,
             i.due_date,
             i.matter_id,
             ii.id AS invoice_installment_id
           FROM invoices i
           LEFT JOIN invoice_installments ii
             ON ii.id = ?
            AND ii.invoice_id = i.id
           WHERE i.public_id = ?
             AND i.archived_at IS NULL
           LIMIT 1`, [allocation.installmentId || null, allocation.invoiceId]);
                if (!resolved?.invoice_id) {
                    throw notFound('invoice_not_found', 'One or more invoices could not be resolved.');
                }
                if (Number(resolved.client_account_id) !== Number(client.id)) {
                    throw conflict('manual_payment_client_mismatch', 'Every allocated invoice must belong to the selected client account.');
                }
                if (resolved.currency_code !== payload.currencyCode.toUpperCase()) {
                    throw conflict('manual_payment_currency_mismatch', 'Allocated invoices must use the same currency as the payment.');
                }
                if (Number(allocation.amountApplied) > roundMoney(Number(resolved.amount_due || 0))) {
                    throw conflict('manual_payment_exceeds_invoice_due', 'Allocated amount exceeds the amount due on one of the invoices.');
                }
                allocationRows.push({
                    amountApplied: roundMoney(allocation.amountApplied),
                    installmentId: resolved.invoice_installment_id ? Number(resolved.invoice_installment_id) : null,
                    invoiceId: Number(resolved.invoice_id),
                    matterId: resolved.matter_id ? Number(resolved.matter_id) : null,
                });
            }
            const paymentPublicId = createPublicId();
            const paymentInsert = await executeResult(connection, `INSERT INTO payment_transactions (
          public_id, client_account_id, payment_method_id, gateway_provider_code, gateway_order_ref,
          gateway_payment_ref, status_code, currency_code, gross_amount, gateway_fee_amount, net_amount,
          failure_reason, initiated_at, authorized_at, captured_at, failed_at, created_by_user_id,
          created_at, updated_at, row_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                paymentPublicId,
                Number(client.id),
                null,
                payload.paymentProviderCode,
                payload.gatewayOrderRef || null,
                payload.gatewayPaymentRef || null,
                'captured',
                payload.currencyCode.toUpperCase(),
                roundMoney(payload.amount),
                0,
                roundMoney(payload.amount),
                payload.noteText || null,
                timestamp,
                timestamp,
                timestamp,
                null,
                actorUserId,
                timestamp,
                timestamp,
                1,
            ]);
            const paymentId = Number(paymentInsert.insertId);
            const touchedMatterIds = new Set();
            for (const allocation of allocationRows) {
                await connection.execute(`INSERT INTO payment_allocations (
            payment_transaction_id, invoice_id, invoice_installment_id, amount_applied, created_at
          ) VALUES (?, ?, ?, ?, ?)`, [paymentId, allocation.invoiceId, allocation.installmentId, allocation.amountApplied, timestamp]);
                if (allocation.installmentId) {
                    await connection.execute(`UPDATE invoice_installments
             SET amount_paid = amount_paid + ?,
                 amount_remaining = GREATEST(0, amount_remaining - ?),
                 status_code = CASE
                   WHEN GREATEST(0, amount_remaining - ?) <= 0 THEN 'paid'
                   ELSE 'pending'
                 END,
                 paid_at = CASE
                   WHEN GREATEST(0, amount_remaining - ?) <= 0 THEN COALESCE(paid_at, ?)
                   ELSE paid_at
                 END
             WHERE id = ?`, [
                        allocation.amountApplied,
                        allocation.amountApplied,
                        allocation.amountApplied,
                        allocation.amountApplied,
                        timestamp,
                        allocation.installmentId,
                    ]);
                }
                await connection.execute(`UPDATE invoices
           SET amount_paid = amount_paid + ?,
               amount_due = GREATEST(0, amount_due - ?),
               status_code = CASE
                 WHEN GREATEST(0, amount_due - ?) <= 0 THEN 'paid'
                 WHEN due_date < UTC_DATE() THEN 'overdue'
                 ELSE 'pending'
               END,
               updated_at = ?,
               row_version = row_version + 1
           WHERE id = ?`, [
                    allocation.amountApplied,
                    allocation.amountApplied,
                    allocation.amountApplied,
                    timestamp,
                    allocation.invoiceId,
                ]);
                if (allocation.matterId) {
                    touchedMatterIds.add(allocation.matterId);
                }
            }
            for (const matterId of touchedMatterIds) {
                const totals = await selectOne(connection, `SELECT
             COALESCE(SUM(amount_paid), 0) AS paid_total,
             COALESCE(SUM(amount_refunded), 0) AS refunded_total,
             COALESCE(SUM(amount_due), 0) AS due_total
           FROM invoices
           WHERE matter_id = ?
             AND archived_at IS NULL`, [matterId]);
                await connection.execute(`UPDATE matters
           SET paid_total_amount = ?,
               refunded_total_amount = ?,
               due_total_amount = ?,
               last_activity_at = ?,
               updated_at = ?,
               row_version = row_version + 1
           WHERE id = ?`, [
                    roundMoney(Number(totals?.paid_total || 0)),
                    roundMoney(Number(totals?.refunded_total || 0)),
                    roundMoney(Number(totals?.due_total || 0)),
                    timestamp,
                    timestamp,
                    matterId,
                ]);
            }
            await adminNotificationService.insertAuditEvent(connection, {
                actionCode: 'payment_recorded',
                actionLabel: 'Manual payment recorded',
                actorRoleCodeSnapshot: actorRoleCode,
                actorUserId,
                entityPk: paymentId,
                entityTableName: 'payment_transactions',
                sourceModule: 'Admin Billing',
                summaryNewValue: `${payload.currencyCode.toUpperCase()} ${roundMoney(payload.amount)}`,
            });
            return {
                amount: roundMoney(payload.amount),
                paymentId: paymentPublicId,
                statusCode: 'captured',
            };
        });
    },
    async createRefund(actorUserPublicId, actorRoleCode, input) {
        return domainService.createRefund(actorUserPublicId, actorRoleCode, input);
    },
    async getOverview() {
        return withConnection(getMysqlPool(), async (connection) => {
            const [outstanding, overdue, paidInvoices, refunds] = await Promise.all([
                selectOne(connection, 'SELECT COUNT(*) AS count_value FROM invoices WHERE archived_at IS NULL AND amount_due > 0'),
                selectOne(connection, `SELECT COUNT(*) AS count_value
           FROM invoices
           WHERE archived_at IS NULL
             AND amount_due > 0
             AND due_date < UTC_DATE()`),
                selectOne(connection, `SELECT COUNT(*) AS count_value
           FROM invoices
           WHERE archived_at IS NULL
             AND status_code = 'paid'`),
                selectOne(connection, `SELECT COUNT(*) AS count_value
           FROM refunds
           WHERE refund_status_code IN ('requested', 'processing')`),
            ]);
            return {
                overdueInvoices: Number(overdue?.count_value || 0),
                paidInvoices: Number(paidInvoices?.count_value || 0),
                pendingRefunds: Number(refunds?.count_value || 0),
                outstandingInvoices: Number(outstanding?.count_value || 0),
            };
        });
    },
};
