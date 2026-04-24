import type { RowDataPacket } from 'mysql2/promise';
import { queryRows } from '../../lib/mysql.js';
import type { AdminActor } from '../auth/service.js';
import { getWorkspace as getRbacWorkspace } from '../rbac/service.js';

type ServiceRow = RowDataPacket & {
  code: string;
  description: string | null;
  domainName: string | null;
  isActive: number;
  name: string;
  sortOrder: number;
};

type PricingSlabRow = RowDataPacket & {
  baseAmount: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: number;
  maxServiceCount: number | null;
  minServiceCount: number;
  perExtraServiceAmount: number | null;
};

type UrgencyRuleRow = RowDataPacket & {
  code: string;
  isActive: number;
  label: string;
  surchargeType: string;
  surchargeValue: number;
};

type TaxRateRow = RowDataPacket & {
  code: string;
  isActive: number;
  name: string;
  ratePercent: number;
};

type InvoiceStatusRow = RowDataPacket & { code: string; label: string };
type NotificationTypeRow = RowDataPacket & { code: string; label: string };
type ConsultationModeRow = RowDataPacket & { code: string; isActive: number; label: string };
type DocumentCategoryRow = RowDataPacket & { code: string; usageCount: number };
type LatestInvoiceRow = RowDataPacket & { invoiceNumber: string | null };
type SequenceRow = RowDataPacket & { nextValue: number; sequenceYear: number };

const MANUAL_INVOICE_DUE_DAYS = 7;

const buildNextInvoiceNumber = (row: SequenceRow | undefined) => {
  if (!row) {
    return null;
  }

  return `INV-${row.sequenceYear}-${String(row.nextValue).padStart(3, '0')}`;
};

const SYSTEM_TEMPLATES = [
  { channel: 'email', id: 'request-submitted', label: 'Request Submitted Confirmation' },
  { channel: 'email', id: 'consultation-confirmation', label: 'Consultation Confirmation' },
  { channel: 'email', id: 'proposal-published', label: 'Proposal Published Notice' },
  { channel: 'email', id: 'invoice-generated', label: 'Invoice Generated Notice' },
  { channel: 'in-app', id: 'message-reply', label: 'Admin Message Reply Alert' },
  { channel: 'in-app', id: 'refund-initiated', label: 'Refund Initiated Notice' },
  { channel: 'in-app', id: 'document-requested', label: 'Document Request Notice' },
];

export const getWorkspace = async (actor: AdminActor) => {
  const [
    serviceRows,
    pricingRows,
    urgencyRows,
    taxRateRows,
    invoiceStatusRows,
    notificationTypeRows,
    consultationModeRows,
    documentCategoryRows,
    latestInvoiceRows,
    sequenceRows,
  ] = await Promise.all([
    queryRows<ServiceRow>(
      `SELECT
         s.service_code AS code,
         s.service_name AS name,
         s.service_description AS description,
         ld.domain_name AS domainName,
         s.sort_order AS sortOrder,
         s.is_active AS isActive
       FROM services s
       LEFT JOIN legal_domains ld ON ld.id = s.legal_domain_id
       ORDER BY ld.domain_name ASC, s.sort_order ASC, s.service_name ASC`
    ),
    queryRows<PricingSlabRow>(
      `SELECT
         effective_from AS effectiveFrom,
         effective_to AS effectiveTo,
         min_service_count AS minServiceCount,
         max_service_count AS maxServiceCount,
         base_amount AS baseAmount,
         per_extra_service_amount AS perExtraServiceAmount,
         is_active AS isActive
       FROM pricing_service_slabs
       ORDER BY effective_from DESC, min_service_count ASC`
    ),
    queryRows<UrgencyRuleRow>(
      `SELECT
         urgency_code AS code,
         label,
         surcharge_type_code AS surchargeType,
         surcharge_value AS surchargeValue,
         is_active AS isActive
       FROM pricing_urgency_rules
       ORDER BY sort_order ASC, label ASC`
    ),
    queryRows<TaxRateRow>(
      `SELECT
         tax_code AS code,
         tax_name AS name,
         rate_percent AS ratePercent,
         is_active AS isActive
       FROM tax_rates
       ORDER BY effective_from DESC, tax_name ASC`
    ),
    queryRows<InvoiceStatusRow>(
      `SELECT code, label
       FROM invoice_statuses
       ORDER BY sort_order ASC, label ASC`
    ),
    queryRows<NotificationTypeRow>(
      `SELECT code, label
       FROM notification_types
       WHERE is_active = 1
       ORDER BY sort_order ASC, label ASC`
    ),
    queryRows<ConsultationModeRow>(
      `SELECT code, label, is_active AS isActive
       FROM consultation_modes
       ORDER BY sort_order ASC, label ASC`
    ),
    queryRows<DocumentCategoryRow>(
      `SELECT category_code AS code, COUNT(*) AS usageCount
       FROM documents
       WHERE archived_at IS NULL
       GROUP BY category_code
       ORDER BY usageCount DESC, category_code ASC`
    ),
    queryRows<LatestInvoiceRow>(
      `SELECT invoice_number AS invoiceNumber
       FROM invoices
       WHERE archived_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`
    ),
    queryRows<SequenceRow>(
      `SELECT sequence_year AS sequenceYear, next_value AS nextValue
       FROM business_sequences
       WHERE sequence_key = 'invoice'
       ORDER BY sequence_year DESC
       LIMIT 1`
    ),
  ]);

  const canManageRbac = actor.permissionCodes.includes('rbac.manage');
  const rbac = canManageRbac ? await getRbacWorkspace() : { permissions: [], roles: [], users: [] };

  return {
    consultationModes: consultationModeRows.map((row) => ({
      code: row.code,
      isActive: Boolean(row.isActive),
      label: row.label,
    })),
    documentCategories: documentCategoryRows.map((row) => ({
      code: row.code,
      usageCount: Number(row.usageCount || 0),
    })),
    invoiceConfiguration: {
      defaultManualDueDays: MANUAL_INVOICE_DUE_DAYS,
      invoiceStatuses: invoiceStatusRows.map((row) => ({ code: row.code, label: row.label })),
      latestInvoiceNumber: latestInvoiceRows[0]?.invoiceNumber || null,
      nextInvoiceNumber: buildNextInvoiceNumber(sequenceRows[0]),
      taxRates: taxRateRows.map((row) => ({
        code: row.code,
        isActive: Boolean(row.isActive),
        name: row.name,
        ratePercent: Number(row.ratePercent || 0),
      })),
    },
    notificationTypes: notificationTypeRows.map((row) => ({
      code: row.code,
      label: row.label,
    })),
    pricingRules: {
      serviceSlabs: pricingRows.map((row) => ({
        baseAmount: Number(row.baseAmount || 0),
        effectiveFrom: row.effectiveFrom.slice(0, 10),
        effectiveTo: row.effectiveTo ? row.effectiveTo.slice(0, 10) : null,
        isActive: Boolean(row.isActive),
        maxServiceCount: row.maxServiceCount === null ? null : Number(row.maxServiceCount),
        minServiceCount: Number(row.minServiceCount || 0),
        perExtraServiceAmount:
          row.perExtraServiceAmount === null ? null : Number(row.perExtraServiceAmount),
      })),
      urgencyRules: urgencyRows.map((row) => ({
        code: row.code,
        isActive: Boolean(row.isActive),
        label: row.label,
        surchargeType: row.surchargeType,
        surchargeValue: Number(row.surchargeValue || 0),
      })),
    },
    rbac: {
      canManage: canManageRbac,
      permissions: rbac.permissions,
      roles: rbac.roles,
    },
    services: serviceRows.map((row) => ({
      code: row.code,
      description: row.description || '',
      domainName: row.domainName || 'General',
      isActive: Boolean(row.isActive),
      name: row.name,
      sortOrder: Number(row.sortOrder || 0),
    })),
    templates: SYSTEM_TEMPLATES,
  };
};
