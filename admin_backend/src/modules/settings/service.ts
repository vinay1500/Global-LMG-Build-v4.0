import type { RowDataPacket } from 'mysql2/promise';
import { queryRows } from '../../lib/mysql.js';
import type { AdminActor } from '../auth/service.js';
import { getWorkspace as getRbacWorkspace } from '../rbac/service.js';
import { getPricingRules, getServiceCatalog } from './catalogPricing.js';
import { getInvoiceSettings } from './invoiceSettings.js';
import { getNotificationSettings } from './notificationSettings.js';
import { getPlatformSettings } from './platformSettings.js';
import { getDocumentTypes, getTemplates } from './templatesDocuments.js';

type TaxRateRow = RowDataPacket & {
  code: string;
  isActive: number;
  name: string;
  ratePercent: number;
};

type InvoiceStatusRow = RowDataPacket & { code: string; label: string };
type NotificationTypeRow = RowDataPacket & { code: string; label: string };
type ConsultationModeRow = RowDataPacket & { code: string; isActive: number; label: string };
type LatestInvoiceRow = RowDataPacket & { invoiceNumber: string | null };
type SequenceRow = RowDataPacket & { nextValue: number; sequenceYear: number };

const MANUAL_INVOICE_DUE_DAYS = 7;

const buildNextInvoiceNumber = (row: SequenceRow | undefined) => {
  if (!row) {
    return null;
  }

  return `INV-${row.sequenceYear}-${String(row.nextValue).padStart(3, '0')}`;
};

export const getWorkspace = async (actor: AdminActor) => {
  const [
    serviceCatalog,
    pricingRules,
    templateRegistry,
    documentTypeRegistry,
    taxRateRows,
    invoiceStatusRows,
    notificationTypeRows,
    consultationModeRows,
    latestInvoiceRows,
    sequenceRows,
    invoiceSettings,
    notificationSettings,
    platformSettings,
  ] = await Promise.all([
    getServiceCatalog(),
    getPricingRules(),
    getTemplates(),
    getDocumentTypes(),
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
    getInvoiceSettings(),
    getNotificationSettings(),
    getPlatformSettings(),
  ]);

  const canManageRbac = actor.permissionCodes.includes('rbac.manage');
  const rbac = canManageRbac ? await getRbacWorkspace() : { permissions: [], roles: [], users: [] };

  return {
    consultationModes: consultationModeRows.map((row) => ({
      code: row.code,
      isActive: Boolean(row.isActive),
      label: row.label,
    })),
    documentCategories: documentTypeRegistry.documentTypes.map((documentType) => ({
      code: documentType.code,
      usageCount: documentType.usageCount,
    })),
    documentTypes: documentTypeRegistry.documentTypes,
    invoiceConfiguration: {
      defaultManualDueDays: MANUAL_INVOICE_DUE_DAYS,
      invoiceStatuses: invoiceStatusRows.map((row) => ({ code: row.code, label: row.label })),
      latestInvoiceNumber: latestInvoiceRows[0]?.invoiceNumber || null,
      nextInvoiceNumber: buildNextInvoiceNumber(sequenceRows[0]),
      settings: invoiceSettings,
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
    notificationSettings,
    platformSettings,
    pricingRules,
    rbac: {
      canManage: canManageRbac,
      permissions: rbac.permissions,
      roles: rbac.roles,
      users: rbac.users,
    },
    serviceDomains: serviceCatalog.domains,
    services: serviceCatalog.services,
    templates: templateRegistry.templates,
  };
};
