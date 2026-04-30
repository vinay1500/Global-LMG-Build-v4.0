import type { RowDataPacket } from 'mysql2/promise';
import { createPublicId } from '../../lib/authCrypto.js';
import { badRequest, notFound } from '../../lib/httpErrors.js';
import { executeStatement, queryRows, withTransaction, type QueryExecutor } from '../../lib/mysql.js';
import { toUiDateTime } from '../../lib/viewModels.js';
import type { AdminActor } from '../auth/service.js';
import {
  createAuditEvent,
  createClientNotifications,
  resolveMatterByPublicId,
  touchMatterActivity,
} from '../writeSupport.js';
import { getInvoiceSettings } from '../settings/invoiceSettings.js';
import { calculateInvoiceTax, insertInvoiceLineTaxes } from '../billing/tax.js';

type MatterPackageRow = RowDataPacket & {
  archivedAt: string | null;
  createdAt: string;
  createdBy: string;
  dbId: number;
  description: string | null;
  displayOrder: number;
  id: string;
  isRecommended: number;
  packageName: string;
  price: number;
  proposalVersion: number;
  publishedAt: string | null;
  selectedAt: string | null;
  selectedPackageDbId: number | null;
  supersededAt: string | null;
};

type PackageFeatureRow = RowDataPacket & {
  featureText: string;
  packageDbId: number;
};

type PackageServiceRow = RowDataPacket & {
  packageDbId: number;
  serviceCode: string;
};

type ProposalInvoiceRow = RowDataPacket & {
  invoiceId: string;
  invoiceNumber: string;
  matterPackageDbId: number;
  statusCode: string;
};

type MatterMetaRow = RowDataPacket & {
  billingName: string;
  city: string | null;
  clientAccountId: number;
  countryCode: string | null;
  displayName: string;
  dueAmount: number;
  email: string;
  gstin: string | null;
  line1: string | null;
  line2: string | null;
  matterId: number;
  matterNumber: string;
  operationalStatusCode: string;
  paidAmount: number;
  phone: string;
  postalCode: string | null;
  selectedPackageDbId: number | null;
  state: string | null;
  title: string;
};

type ExistingInvoiceRow = RowDataPacket & {
  dbId: number;
  id: string;
};

type CapturedPaymentRow = RowDataPacket & {
  capturedAmount: number;
};

type DraftPackageInput = {
  description?: string;
  displayOrder?: number;
  featurePoints?: string[];
  id?: string;
  isRecommended?: boolean;
  name: string;
  price: number;
  serviceCodes?: string[];
};

type ProposalStatus = 'archived' | 'draft' | 'published' | 'selected' | 'superseded';

const CLOSED_MATTER_STATUSES = new Set(['archived', 'completed']);

const toDateOnly = (value: Date) => value.toISOString().slice(0, 10);

const firstRow = <TRow>(rows: TRow[]) => rows[0] || null;

const uniqueStrings = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

const assertMatterPackageMutable = (matter: Pick<MatterMetaRow, 'operationalStatusCode'>) => {
  if (CLOSED_MATTER_STATUSES.has(matter.operationalStatusCode)) {
    throw badRequest(
      'matter_closed',
      'This matter is closed. Reopen it before changing package proposals or selections.'
    );
  }
};

const allocateInvoiceNumber = async (connection: QueryExecutor) => {
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

const proposalStatusForRows = (
  rows: MatterPackageRow[],
  selectedPackageDbId: number | null
): ProposalStatus => {
  if (rows.every((row) => Boolean(row.archivedAt))) {
    return 'archived';
  }

  if (rows.some((row) => Boolean(row.supersededAt))) {
    return 'superseded';
  }

  if (selectedPackageDbId && rows.some((row) => row.dbId === selectedPackageDbId)) {
    return 'selected';
  }

  if (rows.some((row) => Boolean(row.publishedAt))) {
    return 'published';
  }

  return 'draft';
};

const buildProposalGroups = (
  rows: MatterPackageRow[],
  features: PackageFeatureRow[],
  services: PackageServiceRow[],
  invoices: ProposalInvoiceRow[]
) => {
  const proposalMap = new Map<number, MatterPackageRow[]>();

  for (const row of rows) {
    const existing = proposalMap.get(row.proposalVersion) || [];
    existing.push(row);
    proposalMap.set(row.proposalVersion, existing);
  }

  return [...proposalMap.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([proposalVersion, proposalRows]) => {
      const status = proposalStatusForRows(proposalRows, proposalRows[0]?.selectedPackageDbId || null);
      const packageDbIds = proposalRows.map((row) => row.dbId);
      const selectedPackageDbId =
        proposalRows.find((row) => row.selectedPackageDbId && row.selectedPackageDbId === row.dbId)?.dbId ||
        null;
      const linkedInvoice =
        invoices.find((invoice) =>
          selectedPackageDbId
            ? invoice.matterPackageDbId === selectedPackageDbId
            : packageDbIds.includes(invoice.matterPackageDbId)
        ) || null;

      return {
        linkedInvoice: linkedInvoice
          ? {
              id: linkedInvoice.invoiceId,
              invoiceNumber: linkedInvoice.invoiceNumber,
              matterPackageId:
                proposalRows.find((row) => row.dbId === linkedInvoice.matterPackageDbId)?.id || '',
              statusCode: linkedInvoice.statusCode,
            }
          : null,
        packages: proposalRows
          .sort((left, right) => left.displayOrder - right.displayOrder || left.dbId - right.dbId)
          .map((row) => ({
            createdAt: toUiDateTime(row.createdAt),
            createdBy: row.createdBy,
            description: row.description || '',
            displayOrder: row.displayOrder,
            featurePoints: features
              .filter((feature) => feature.packageDbId === row.dbId)
              .map((feature) => feature.featureText),
            id: row.id,
            isRecommended: Boolean(row.isRecommended),
            isSelected: row.selectedPackageDbId === row.dbId,
            name: row.packageName,
            price: row.price,
            publishedAt: row.publishedAt ? toUiDateTime(row.publishedAt) : undefined,
            selectedAt: row.selectedAt ? toUiDateTime(row.selectedAt) : undefined,
            serviceCodes: services
              .filter((service) => service.packageDbId === row.dbId)
              .map((service) => service.serviceCode),
            supersededAt: row.supersededAt ? toUiDateTime(row.supersededAt) : undefined,
          })),
        proposalVersion,
        publishedAt: proposalRows[0]?.publishedAt ? toUiDateTime(proposalRows[0].publishedAt) : undefined,
        selectedAt: proposalRows.find((row) => row.selectedAt)?.selectedAt
          ? toUiDateTime(proposalRows.find((row) => row.selectedAt)!.selectedAt!)
          : undefined,
        selectedPackageId:
          proposalRows.find((row) => row.selectedPackageDbId && row.selectedPackageDbId === row.dbId)?.id ||
          null,
        status,
        supersededAt: proposalRows[0]?.supersededAt
          ? toUiDateTime(proposalRows[0].supersededAt)
          : undefined,
      };
    });
};

const getMatterMeta = async (
  matterPublicId: string,
  executor?: Parameters<typeof queryRows>[2]
) => {
  const rows = await queryRows<MatterMetaRow>(
    `SELECT
       m.id AS matterId,
       m.title,
       m.matter_number AS matterNumber,
       m.operational_status_code AS operationalStatusCode,
       m.client_account_id AS clientAccountId,
       m.selected_matter_package_id AS selectedPackageDbId,
       m.paid_total_amount AS paidAmount,
       m.due_total_amount AS dueAmount,
       ca.display_name AS displayName,
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
  );

  const matter = rows[0];

  if (!matter) {
    throw notFound('matter_not_found', 'Matter not found.');
  }

  return matter;
};

const getMatterServiceCodes = async (
  matterDbId: number,
  executor?: Parameters<typeof queryRows>[2]
) => {
  const rows = await queryRows<RowDataPacket & { serviceCode: string }>(
    `SELECT s.service_code AS serviceCode
     FROM matter_services ms
     INNER JOIN services s ON s.id = ms.service_id
     WHERE ms.matter_id = ?
     ORDER BY ms.id ASC`,
    [matterDbId],
    executor
  );

  return rows.map((row) => row.serviceCode);
};

const loadMatterPackageWorkspace = async (
  matterPublicId: string,
  executor?: Parameters<typeof queryRows>[2]
) => {
  const matter = await getMatterMeta(matterPublicId, executor);

  const packageRows = await queryRows<MatterPackageRow>(
    `SELECT
       mp.id AS dbId,
       mp.public_id AS id,
       mp.package_name AS packageName,
       mp.description,
       mp.total_price AS price,
       mp.display_order AS displayOrder,
       mp.is_recommended AS isRecommended,
       mp.proposal_version_no AS proposalVersion,
       mp.created_at AS createdAt,
       mp.published_at AS publishedAt,
       mp.superseded_at AS supersededAt,
       mp.selected_at AS selectedAt,
       mp.archived_at AS archivedAt,
       creator.display_name AS createdBy,
       ? AS selectedPackageDbId
     FROM matter_packages mp
     INNER JOIN users creator ON creator.id = mp.created_by_user_id
     WHERE mp.matter_id = ?
     ORDER BY mp.proposal_version_no DESC, mp.display_order ASC, mp.id ASC`,
    [matter.selectedPackageDbId, matter.matterId],
    executor
  );

  const packageDbIds = packageRows.map((row) => row.dbId);
  const features = packageDbIds.length
      ? await queryRows<PackageFeatureRow>(
          `SELECT matter_package_id AS packageDbId, feature_text AS featureText
           FROM matter_package_features
           WHERE matter_package_id IN (${packageDbIds.map(() => '?').join(', ')})
           ORDER BY sort_order ASC, id ASC`,
        packageDbIds,
        executor
      )
    : [];
  const services = packageDbIds.length
      ? await queryRows<PackageServiceRow>(
          `SELECT mps.matter_package_id AS packageDbId, s.service_code AS serviceCode
           FROM matter_package_services mps
           INNER JOIN services s ON s.id = mps.service_id
           WHERE mps.matter_package_id IN (${packageDbIds.map(() => '?').join(', ')})
           ORDER BY mps.sort_order ASC, mps.id ASC`,
        packageDbIds,
        executor
      )
    : [];
  const invoices = packageDbIds.length
      ? await queryRows<ProposalInvoiceRow>(
          `SELECT
             inv.public_id AS invoiceId,
             inv.invoice_number AS invoiceNumber,
             inv.status_code AS statusCode,
           inv.matter_package_id AS matterPackageDbId
         FROM invoices inv
           WHERE inv.matter_package_id IN (${packageDbIds.map(() => '?').join(', ')})
             AND inv.archived_at IS NULL
           ORDER BY inv.created_at DESC, inv.id DESC`,
        packageDbIds,
        executor
      )
    : [];

  const proposals = buildProposalGroups(packageRows, features, services, invoices);

  return {
    active: proposals.find((proposal) => proposal.status === 'published' || proposal.status === 'selected') || null,
    draft: proposals.find((proposal) => proposal.status === 'draft') || null,
    history: proposals.filter((proposal) => proposal.status === 'archived' || proposal.status === 'superseded'),
    linkedInvoiceSummary:
      proposals.find((proposal) => proposal.selectedPackageId)?.linkedInvoice || null,
    matter: {
      id: matterPublicId,
      matterNumber: matter.matterNumber,
      title: matter.title,
    },
    selectedPackageId:
      packageRows.find((row) => row.selectedPackageDbId && row.selectedPackageDbId === row.dbId)?.id || null,
  };
};

const createPackageInvoice = async (
  actor: AdminActor,
  matter: MatterMetaRow,
  packageRow: MatterPackageRow,
  connection: QueryExecutor
) => {
  const invoicePublicId = createPublicId();
  const invoiceNumber = await allocateInvoiceNumber(connection);
  const now = new Date();
  const createdAt = now.toISOString().slice(0, 19).replace('T', ' ');
  const issueDate = toDateOnly(now);
  const invoiceSettings = await getInvoiceSettings(connection);
  const dueDate = toDateOnly(
    new Date(now.getTime() + invoiceSettings.paymentTermsDays * 24 * 60 * 60 * 1000)
  );
  const tax = await calculateInvoiceTax(
    {
      clientState: matter.state,
      lineAmount: packageRow.price,
    },
    connection
  );

  const invoiceInsert = await executeStatement(
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
     ) VALUES (?, ?, ?, ?, ?, NULL, 'matter-package', 'sent', 'INR', ?, ?, ?, 0, ?, ?, 0, 0, ?, ?, ?, ?, NULL)`,
    [
      invoicePublicId,
      invoiceNumber,
      matter.clientAccountId,
      matter.matterId,
      packageRow.dbId,
      issueDate,
      dueDate,
      tax.subtotalDecimal,
      tax.taxDecimal,
      tax.totalDecimal,
      tax.totalDecimal,
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
      invoiceInsert.insertId,
      matter.billingName || matter.displayName,
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

  const lineInsert = await executeStatement(
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
     ) VALUES (?, 'service-package', NULL, NULL, ?, 1, ?, ?, 0, ?, ?, 1, ?)`,
    [
      invoiceInsert.insertId,
      packageRow.packageName,
      tax.lineSubtotalDecimal,
      tax.lineSubtotalDecimal,
      tax.taxableDecimal,
      tax.lineTotalDecimal,
      createdAt,
    ],
    connection
  );

  await insertInvoiceLineTaxes(lineInsert.insertId, tax, createdAt, connection);

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
    [invoiceInsert.insertId, dueDate, tax.totalDecimal, tax.totalDecimal, createdAt],
    connection
  );

  return {
    invoiceDbId: invoiceInsert.insertId,
    invoiceId: invoicePublicId,
    invoiceNumber,
    totalAmount: Number(tax.totalDecimal),
  };
};

const findActiveInvoiceForPackage = async (
  matterPackageDbId: number,
  connection: QueryExecutor
) =>
  firstRow(
    await queryRows<ExistingInvoiceRow>(
      `SELECT id AS dbId, public_id AS id
       FROM invoices
       WHERE matter_package_id = ?
         AND archived_at IS NULL
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [matterPackageDbId],
      connection
    )
  );

const invoiceHasCapturedPayment = async (
  invoiceDbId: number,
  connection: QueryExecutor
) => {
  const row = firstRow(
    await queryRows<CapturedPaymentRow>(
      `SELECT COALESCE(SUM(pa.amount_applied), 0) AS capturedAmount
       FROM payment_allocations pa
       INNER JOIN payment_transactions pt
         ON pt.id = pa.payment_transaction_id
       WHERE pa.invoice_id = ?
         AND pt.status_code = 'captured'`,
      [invoiceDbId],
      connection
    )
  );

  return Number(row?.capturedAmount || 0) > 0;
};

export const getMatterPackageProposals = async (matterId: string) =>
  loadMatterPackageWorkspace(matterId);

export const saveDraftProposal = async (
  actor: AdminActor,
  matterId: string,
  payload: {
    packages: DraftPackageInput[];
    proposalVersion?: number;
  }
) =>
  withTransaction(async (connection) => {
    const matter = await resolveMatterByPublicId(matterId, connection);
    const matterMeta = await getMatterMeta(matterId, connection);
    const packages = payload.packages;
    assertMatterPackageMutable(matterMeta);

    if (packages.length === 0) {
      throw badRequest('proposal_packages_required', 'Add at least one package before saving the draft.');
    }

    if (packages.filter((entry) => entry.isRecommended).length > 1) {
      throw badRequest('proposal_multiple_recommended', 'Only one package can be marked as recommended.');
    }

    const existingRows = await queryRows<MatterPackageRow>(
      `SELECT
         mp.id AS dbId,
         mp.public_id AS id,
         mp.package_name AS packageName,
         mp.description,
         mp.total_price AS price,
         mp.display_order AS displayOrder,
         mp.is_recommended AS isRecommended,
         mp.proposal_version_no AS proposalVersion,
         mp.created_at AS createdAt,
         mp.published_at AS publishedAt,
         mp.superseded_at AS supersededAt,
         mp.selected_at AS selectedAt,
         mp.archived_at AS archivedAt,
         creator.display_name AS createdBy,
         ? AS selectedPackageDbId
       FROM matter_packages mp
       INNER JOIN users creator ON creator.id = mp.created_by_user_id
       WHERE mp.matter_id = ?`,
      [matterMeta.selectedPackageDbId, matter.id],
      connection
    );

    const draftRows = existingRows.filter(
      (row) => !row.archivedAt && !row.publishedAt && !row.supersededAt
    );
    const highestVersion = existingRows.reduce(
      (maxVersion, row) => Math.max(maxVersion, row.proposalVersion),
      0
    );
    const proposalVersion = payload.proposalVersion || draftRows[0]?.proposalVersion || highestVersion + 1;
    const targetRows = existingRows.filter((row) => row.proposalVersion === proposalVersion);
    const isUpdatingDraft = targetRows.length > 0;

    if (
      targetRows.some((row) => Boolean(row.publishedAt) || Boolean(row.supersededAt) || Boolean(row.archivedAt))
    ) {
      throw badRequest(
        'proposal_version_locked',
        'This proposal version is no longer editable. Create a new draft version instead.'
      );
    }

    if (targetRows.length > 0) {
      await executeStatement(
        `DELETE FROM matter_packages
         WHERE matter_id = ?
           AND proposal_version_no = ?
           AND published_at IS NULL
           AND superseded_at IS NULL
           AND archived_at IS NULL`,
        [matter.id, proposalVersion],
        connection
      );
    }

    const defaultServiceCodes = await getMatterServiceCodes(matter.id, connection);
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    for (const [index, packageInput] of packages.entries()) {
      const packageInsert = await executeStatement(
        `INSERT INTO matter_packages (
           public_id,
           matter_id,
           proposal_version_no,
           package_name,
           description,
           total_price,
           display_order,
           is_recommended,
           created_by_user_id,
           created_at,
           updated_at,
           published_at,
           superseded_at,
           selected_at,
           archived_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)`,
        [
          createPublicId(),
          matter.id,
          proposalVersion,
          packageInput.name.trim(),
          packageInput.description?.trim() || null,
          packageInput.price,
          packageInput.displayOrder ?? index,
          packageInput.isRecommended ? 1 : 0,
          actor.userId,
          createdAt,
          createdAt,
        ],
        connection
      );

      for (const [serviceIndex, serviceCode] of (
        packageInput.serviceCodes?.length ? uniqueStrings(packageInput.serviceCodes) : defaultServiceCodes
      ).entries()) {
        const serviceRows = await queryRows<RowDataPacket & { dbId: number }>(
          `SELECT id AS dbId
           FROM services
           WHERE service_code = ?
           LIMIT 1`,
          [serviceCode],
          connection
        );
        const service = serviceRows[0];

        if (!service) {
          continue;
        }

        await executeStatement(
          `INSERT INTO matter_package_services (
             matter_package_id,
             service_id,
             sort_order,
             created_at
           ) VALUES (?, ?, ?, ?)`,
          [packageInsert.insertId, service.dbId, serviceIndex, createdAt],
          connection
        );
      }

      for (const [featureIndex, featureText] of uniqueStrings(packageInput.featurePoints || []).entries()) {
        await executeStatement(
          `INSERT INTO matter_package_features (
             matter_package_id,
             feature_text,
             sort_order,
             created_at
           ) VALUES (?, ?, ?, ?)`,
          [packageInsert.insertId, featureText, featureIndex, createdAt],
          connection
        );
      }
    }

    await touchMatterActivity(matter.id, connection);
    await createAuditEvent(
      {
        actionCode: isUpdatingDraft ? 'package.updated' : 'package.created',
        actionLabel: isUpdatingDraft ? 'Package proposal draft updated' : 'Package proposal draft created',
        actorRoleCode: actor.roleCodes[0] || 'case_manager',
        actorUserId: actor.userId,
        changes: [
          { fieldName: 'proposal_version_no', newValue: proposalVersion },
          { fieldName: 'package_count', newValue: packages.length },
        ],
        entityPk: matter.id,
        entityTableName: 'matter_packages',
        sourceModule: 'matter_package_studio',
        summaryNewValue: `Draft v${proposalVersion}`,
      },
      connection
    );

    return loadMatterPackageWorkspace(matterId, connection);
  });

export const publishProposal = async (
  actor: AdminActor,
  matterId: string,
  payload: {
    note?: string;
    proposalVersion: number;
  }
) =>
  withTransaction(async (connection) => {
    const matter = await resolveMatterByPublicId(matterId, connection);
    const matterMeta = await getMatterMeta(matterId, connection);
    assertMatterPackageMutable(matterMeta);
    const targetRows = await queryRows<MatterPackageRow>(
      `SELECT
         mp.id AS dbId,
         mp.public_id AS id,
         mp.package_name AS packageName,
         mp.description,
         mp.total_price AS price,
         mp.display_order AS displayOrder,
         mp.is_recommended AS isRecommended,
         mp.proposal_version_no AS proposalVersion,
         mp.created_at AS createdAt,
         mp.published_at AS publishedAt,
         mp.superseded_at AS supersededAt,
         mp.selected_at AS selectedAt,
         mp.archived_at AS archivedAt,
         creator.display_name AS createdBy,
         ? AS selectedPackageDbId
       FROM matter_packages mp
       INNER JOIN users creator ON creator.id = mp.created_by_user_id
       WHERE mp.matter_id = ?
         AND mp.proposal_version_no = ?`,
      [matterMeta.selectedPackageDbId, matter.id, payload.proposalVersion],
      connection
    );

    if (targetRows.length === 0) {
      throw notFound('proposal_not_found', 'Proposal version not found.');
    }

    if (targetRows.every((row) => Boolean(row.publishedAt) && !row.archivedAt && !row.supersededAt)) {
      return loadMatterPackageWorkspace(matterId, connection);
    }

    if (
      targetRows.some((row) => Boolean(row.archivedAt) || Boolean(row.supersededAt) || Boolean(row.publishedAt))
    ) {
      throw badRequest(
        'proposal_not_publishable',
        'Only a live draft proposal can be published.'
      );
    }

    if (targetRows.some((row) => !row.packageName.trim() || Number(row.price) <= 0)) {
      throw badRequest(
        'proposal_incomplete',
        'Every package must have a name and a positive price before publishing.'
      );
    }

    await executeStatement(
      `UPDATE matter_packages
       SET superseded_at = UTC_TIMESTAMP(6),
           updated_at = UTC_TIMESTAMP(6),
           row_version = row_version + 1
       WHERE matter_id = ?
         AND proposal_version_no <> ?
         AND published_at IS NOT NULL
         AND superseded_at IS NULL
         AND archived_at IS NULL`,
      [matter.id, payload.proposalVersion],
      connection
    );

    await executeStatement(
      `UPDATE matter_packages
       SET published_at = UTC_TIMESTAMP(6),
           updated_at = UTC_TIMESTAMP(6),
           row_version = row_version + 1
       WHERE matter_id = ?
         AND proposal_version_no = ?
         AND published_at IS NULL
         AND superseded_at IS NULL
         AND archived_at IS NULL`,
      [matter.id, payload.proposalVersion],
      connection
    );

    await executeStatement(
      `UPDATE matters
       SET operational_status_code = 'package-ready',
           last_activity_at = UTC_TIMESTAMP(6),
           updated_at = UTC_TIMESTAMP(6),
           row_version = row_version + 1
       WHERE id = ?`,
      [matter.id],
      connection
    );

    await createClientNotifications(
      {
        bodyText:
          payload.note?.trim() ||
          'A service proposal is ready for review in your dashboard.',
        clientAccountId: matterMeta.clientAccountId,
        matterId: matter.id,
        notificationTypeCode: 'proposal',
        priorityCode: 'normal',
        title: 'Service proposal ready',
      },
      connection
    );

    await createAuditEvent(
      {
        actionCode: 'package.published',
        actionLabel: 'Package proposal published',
        actorRoleCode: actor.roleCodes[0] || 'case_manager',
        actorUserId: actor.userId,
        entityPk: matter.id,
        entityTableName: 'matter_packages',
        sourceModule: 'matter_package_studio',
        summaryNewValue: `Published v${payload.proposalVersion}`,
      },
      connection
    );

    return loadMatterPackageWorkspace(matterId, connection);
  });

export const overridePackageSelection = async (
  actor: AdminActor,
  matterId: string,
  payload: {
    matterPackageId: string;
    reasonText: string;
  }
) =>
  withTransaction(async (connection) => {
    const matter = await resolveMatterByPublicId(matterId, connection);
    const matterMeta = await getMatterMeta(matterId, connection);
    assertMatterPackageMutable(matterMeta);
    const packageRows = await queryRows<MatterPackageRow>(
      `SELECT
         mp.id AS dbId,
         mp.public_id AS id,
         mp.package_name AS packageName,
         mp.description,
         mp.total_price AS price,
         mp.display_order AS displayOrder,
         mp.is_recommended AS isRecommended,
         mp.proposal_version_no AS proposalVersion,
         mp.created_at AS createdAt,
         mp.published_at AS publishedAt,
         mp.superseded_at AS supersededAt,
         mp.selected_at AS selectedAt,
         mp.archived_at AS archivedAt,
         creator.display_name AS createdBy,
         ? AS selectedPackageDbId
       FROM matter_packages mp
       INNER JOIN users creator ON creator.id = mp.created_by_user_id
       WHERE mp.public_id = ?
         AND mp.matter_id = ?
       LIMIT 1`,
      [matterMeta.selectedPackageDbId, payload.matterPackageId, matter.id],
      connection
    );
    const packageRow = packageRows[0];

    if (!packageRow) {
      throw notFound('package_not_found', 'Matter package not found.');
    }

    if (!packageRow.publishedAt || packageRow.supersededAt || packageRow.archivedAt) {
      throw badRequest(
        'package_not_selectable',
        'Only an active published package can be selected or overridden.'
      );
    }

    if (matterMeta.selectedPackageDbId === packageRow.dbId) {
      throw badRequest('package_already_selected', 'This package is already the active selection.');
    }

    if (matterMeta.selectedPackageDbId) {
      const existingInvoice = await findActiveInvoiceForPackage(
        matterMeta.selectedPackageDbId,
        connection
      );

      if (existingInvoice?.dbId && (await invoiceHasCapturedPayment(existingInvoice.dbId, connection))) {
        throw badRequest(
          'package_override_blocked_by_payment',
          'A captured payment already exists for the current package invoice. Resolve billing manually before overriding.'
        );
      }

      if (existingInvoice?.dbId) {
        await executeStatement(
          `UPDATE invoices
           SET status_code = 'void',
               amount_due = 0,
               archived_at = UTC_TIMESTAMP(6),
               updated_at = UTC_TIMESTAMP(6),
               row_version = row_version + 1
           WHERE id = ?`,
          [existingInvoice.dbId],
          connection
        );

        await executeStatement(
          `UPDATE invoice_installments
           SET status_code = 'void',
               amount_remaining = 0
           WHERE invoice_id = ?`,
          [existingInvoice.dbId],
          connection
        );
      }
    }

    await executeStatement(
      `UPDATE matter_packages
       SET selected_at = CASE
         WHEN proposal_version_no = ? AND id = ? THEN UTC_TIMESTAMP(6)
         WHEN proposal_version_no = ? THEN NULL
         ELSE selected_at
       END,
           updated_at = UTC_TIMESTAMP(6),
           row_version = row_version + 1
       WHERE matter_id = ?`,
      [packageRow.proposalVersion, packageRow.dbId, packageRow.proposalVersion, matter.id],
      connection
    );

    const invoice = await createPackageInvoice(actor, matterMeta, packageRow, connection);

    await executeStatement(
      `UPDATE matters
       SET selected_matter_package_id = ?,
           quoted_total_amount = ?,
           due_total_amount = ?,
           operational_status_code = 'awaiting-payment',
           last_activity_at = UTC_TIMESTAMP(6),
           updated_at = UTC_TIMESTAMP(6),
           row_version = row_version + 1
       WHERE id = ?`,
      [
        packageRow.dbId,
        invoice.totalAmount,
        Math.max(invoice.totalAmount - matterMeta.paidAmount, 0),
        matter.id,
      ],
      connection
    );

    await createClientNotifications(
      {
        bodyText: `A replacement invoice ${invoice.invoiceNumber} has been issued for your updated service package.`,
        clientAccountId: matterMeta.clientAccountId,
        invoiceId: invoice.invoiceDbId,
        matterId: matter.id,
        notificationTypeCode: 'invoice_generated',
        priorityCode: 'normal',
        title: 'Updated package invoice issued',
      },
      connection
    );

    await createClientNotifications(
      {
        bodyText:
          'Your selected service package has been updated by the Global LMG operations team.',
        clientAccountId: matterMeta.clientAccountId,
        matterId: matter.id,
        notificationTypeCode: 'proposal',
        priorityCode: 'normal',
        title: 'Package selection updated',
      },
      connection
    );

    await createAuditEvent(
      {
        actionCode: 'package.selection_overridden',
        actionLabel: 'Package selection overridden',
        actorRoleCode: actor.roleCodes[0] || 'case_manager',
        actorUserId: actor.userId,
        changes: [
          { fieldName: 'matter_package_id', newValue: payload.matterPackageId },
          { fieldName: 'reason_text', newValue: payload.reasonText },
        ],
        entityPk: matter.id,
        entityTableName: 'matter_packages',
        sourceModule: 'matter_package_studio',
        summaryNewValue: payload.reasonText,
      },
      connection
    );

    await touchMatterActivity(matter.id, connection);

    return {
      generatedInvoiceId: invoice.invoiceId,
      status: 'updated' as const,
      workspace: await loadMatterPackageWorkspace(matterId, connection),
    };
  });

export const archiveProposal = async (
  actor: AdminActor,
  matterId: string,
  proposalVersion: number
) =>
  withTransaction(async (connection) => {
    const matter = await resolveMatterByPublicId(matterId, connection);
    const matterMeta = await getMatterMeta(matterId, connection);
    assertMatterPackageMutable(matterMeta);
    const rows = await queryRows<MatterPackageRow>(
      `SELECT
         mp.id AS dbId,
         mp.public_id AS id,
         mp.package_name AS packageName,
         mp.description,
         mp.total_price AS price,
         mp.display_order AS displayOrder,
         mp.is_recommended AS isRecommended,
         mp.proposal_version_no AS proposalVersion,
         mp.created_at AS createdAt,
         mp.published_at AS publishedAt,
         mp.superseded_at AS supersededAt,
         mp.selected_at AS selectedAt,
         mp.archived_at AS archivedAt,
         creator.display_name AS createdBy,
         ? AS selectedPackageDbId
       FROM matter_packages mp
       INNER JOIN users creator ON creator.id = mp.created_by_user_id
       WHERE mp.matter_id = ?
         AND mp.proposal_version_no = ?`,
      [matterMeta.selectedPackageDbId, matter.id, proposalVersion],
      connection
    );

    if (rows.length === 0) {
      throw notFound('proposal_not_found', 'Proposal version not found.');
    }

    if (matterMeta.selectedPackageDbId && rows.some((row) => row.dbId === matterMeta.selectedPackageDbId)) {
      throw badRequest(
        'proposal_archive_blocked',
        'The selected package proposal cannot be archived while it is the active matter selection.'
      );
    }

    const status = proposalStatusForRows(rows, matterMeta.selectedPackageDbId);
    if (status === 'published' || status === 'selected') {
      throw badRequest(
        'proposal_archive_blocked',
        'Only draft or superseded proposal versions can be archived.'
      );
    }

    await executeStatement(
      `UPDATE matter_packages
       SET archived_at = UTC_TIMESTAMP(6),
           updated_at = UTC_TIMESTAMP(6),
           row_version = row_version + 1
       WHERE matter_id = ?
         AND proposal_version_no = ?
         AND archived_at IS NULL`,
      [matter.id, proposalVersion],
      connection
    );

    await createAuditEvent(
      {
        actionCode: 'package.archived',
        actionLabel: 'Proposal archived',
        actorRoleCode: actor.roleCodes[0] || 'case_manager',
        actorUserId: actor.userId,
        entityPk: matter.id,
        entityTableName: 'matter_packages',
        sourceModule: 'matter_package_studio',
        summaryNewValue: `Archived v${proposalVersion}`,
      },
      connection
    );

    return loadMatterPackageWorkspace(matterId, connection);
  });
