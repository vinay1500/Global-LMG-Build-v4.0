import type { RowDataPacket } from 'mysql2/promise';
import { badRequest } from '../../lib/httpErrors.js';
import { queryRows } from '../../lib/mysql.js';
import type { AdminActor } from '../auth/service.js';
import { fetchMatters, fetchThreads } from '../shared.js';
import { createAuditEvent } from '../writeSupport.js';

type SummaryRow = RowDataPacket & {
  averageResolutionDays: number | null;
  convertedRequests: number;
  refundsWriteOffs: number | null;
  totalCollections: number | null;
  totalRequests: number;
};

type RevenueRow = RowDataPacket & {
  currentRevenue: number | null;
  monthLabel: string;
  previousRevenue: number | null;
};

type IntakeRow = RowDataPacket & {
  converted: number | null;
  leads: number | null;
  monthLabel: string;
};

type StageRow = RowDataPacket & {
  name: string;
  value: number;
};

type AgingRow = RowDataPacket & {
  amount: number;
  bucket: string;
};

type ResolutionRow = RowDataPacket & {
  days: number | null;
  name: string;
};

type DocumentActivityRow = RowDataPacket & {
  label: string;
  value: number;
};

type KpiRow = RowDataPacket & {
  activeMatters: number;
  closedMatters: number;
  convertedRequests: number;
  declinedRequests: number;
  failedOperationalTasks: number;
  failedReminders: number;
  openRequests: number;
  outstandingInvoiceAmount: number | null;
  overdueInvoices: number;
  paidInvoiceAmount: number | null;
  pendingDocumentReviews: number;
  pendingReminders: number;
  recentClientActivity: number;
  staleMatters: number;
  upcomingEvents: number;
  waitingThreads: number;
};

type DrilldownRow = RowDataPacket & {
  amount: number | null;
  clientName: string | null;
  dateValue: string | null;
  id: string;
  matterTitle: string | null;
  routeId: string | null;
  routeType: string;
  status: string | null;
  subtitle: string | null;
  title: string;
};

type CountRow = RowDataPacket & { total: number };

export type ReportDrilldownKind =
  | 'active-matters'
  | 'closed-matters'
  | 'converted-requests'
  | 'declined-requests'
  | 'failed-reminders'
  | 'open-requests'
  | 'outstanding-invoices'
  | 'overdue-invoices'
  | 'paid-invoices'
  | 'pending-documents'
  | 'pending-reminders'
  | 'recent-notifications'
  | 'stale-matters'
  | 'upcoming-events'
  | 'waiting-threads';

type DrilldownDefinition = {
  csvFileName: string;
  description: string;
  from: string;
  label: string;
  orderBy: string;
  select: string;
  where: string;
};

const safeNumber = (value: number | null | undefined) => Number(value || 0);

const DRILLDOWN_DEFINITIONS: Record<ReportDrilldownKind, DrilldownDefinition> = {
  'active-matters': {
    csvFileName: 'active-matters',
    description: 'Active matter records that are not completed or archived.',
    from: `FROM matters m
      INNER JOIN client_accounts ca ON ca.id = m.client_account_id
      LEFT JOIN matter_stages ms ON ms.code = m.current_stage_code`,
    label: 'Active Matters',
    orderBy: 'ORDER BY m.last_activity_at DESC, m.id DESC',
    select: `m.public_id AS id,
      m.title,
      m.matter_number AS subtitle,
      m.operational_status_code AS status,
      ca.display_name AS clientName,
      m.title AS matterTitle,
      NULL AS amount,
      m.last_activity_at AS dateValue,
      'matter' AS routeType,
      m.public_id AS routeId`,
    where: `m.archived_at IS NULL AND m.operational_status_code NOT IN ('completed', 'archived')`,
  },
  'closed-matters': {
    csvFileName: 'closed-matters',
    description: 'Matters that are completed, archived, or have a closed timestamp.',
    from: `FROM matters m
      INNER JOIN client_accounts ca ON ca.id = m.client_account_id
      LEFT JOIN matter_stages ms ON ms.code = m.current_stage_code`,
    label: 'Closed Matters',
    orderBy: 'ORDER BY COALESCE(m.closed_at, m.updated_at) DESC, m.id DESC',
    select: `m.public_id AS id,
      m.title,
      m.matter_number AS subtitle,
      m.operational_status_code AS status,
      ca.display_name AS clientName,
      m.title AS matterTitle,
      NULL AS amount,
      COALESCE(m.closed_at, m.updated_at) AS dateValue,
      'matter' AS routeType,
      m.public_id AS routeId`,
    where: `m.archived_at IS NULL AND (m.operational_status_code IN ('completed', 'archived') OR m.closed_at IS NOT NULL)`,
  },
  'converted-requests': {
    csvFileName: 'converted-requests',
    description: 'Requests converted into matters.',
    from: `FROM service_requests sr
      INNER JOIN client_accounts ca ON ca.id = sr.client_account_id
      LEFT JOIN matters m ON m.service_request_id = sr.id AND m.archived_at IS NULL`,
    label: 'Converted Requests',
    orderBy: 'ORDER BY sr.updated_at DESC, sr.id DESC',
    select: `sr.public_id AS id,
      sr.title,
      sr.request_number AS subtitle,
      sr.status_code AS status,
      ca.display_name AS clientName,
      m.title AS matterTitle,
      sr.quote_total_amount AS amount,
      sr.updated_at AS dateValue,
      'request' AS routeType,
      sr.public_id AS routeId`,
    where: `sr.archived_at IS NULL AND sr.status_code = 'converted'`,
  },
  'declined-requests': {
    csvFileName: 'declined-requests',
    description: 'Requests declined or closed without conversion.',
    from: `FROM service_requests sr
      INNER JOIN client_accounts ca ON ca.id = sr.client_account_id
      LEFT JOIN matters m ON m.service_request_id = sr.id AND m.archived_at IS NULL`,
    label: 'Declined Requests',
    orderBy: 'ORDER BY sr.updated_at DESC, sr.id DESC',
    select: `sr.public_id AS id,
      sr.title,
      sr.request_number AS subtitle,
      sr.status_code AS status,
      ca.display_name AS clientName,
      m.title AS matterTitle,
      sr.quote_total_amount AS amount,
      sr.updated_at AS dateValue,
      'request' AS routeType,
      sr.public_id AS routeId`,
    where: `sr.archived_at IS NULL AND sr.status_code = 'lost-closed'`,
  },
  'failed-reminders': {
    csvFileName: 'failed-reminders',
    description: 'Failed reminder jobs waiting for review or retry.',
    from: `FROM event_reminders er
      INNER JOIN events evt ON evt.id = er.event_id
      INNER JOIN users recipient ON recipient.id = er.recipient_user_id
      LEFT JOIN client_accounts ca ON ca.id = evt.client_account_id`,
    label: 'Failed Reminders',
    orderBy: 'ORDER BY er.scheduled_at ASC, er.id ASC',
    select: `CAST(er.id AS CHAR) AS id,
      evt.title,
      COALESCE(er.failure_reason, 'Retry required') AS subtitle,
      er.delivery_status_code AS status,
      ca.display_name AS clientName,
      evt.title AS matterTitle,
      NULL AS amount,
      er.scheduled_at AS dateValue,
      'reminder' AS routeType,
      CAST(er.id AS CHAR) AS routeId`,
    where: `er.delivery_status_code = 'failed'`,
  },
  'open-requests': {
    csvFileName: 'open-requests',
    description: 'Requests still in the operations queue.',
    from: `FROM service_requests sr
      INNER JOIN client_accounts ca ON ca.id = sr.client_account_id
      LEFT JOIN matters m ON m.service_request_id = sr.id AND m.archived_at IS NULL`,
    label: 'Open Requests',
    orderBy: 'ORDER BY sr.created_at DESC, sr.id DESC',
    select: `sr.public_id AS id,
      sr.title,
      sr.request_number AS subtitle,
      sr.status_code AS status,
      ca.display_name AS clientName,
      m.title AS matterTitle,
      sr.quote_total_amount AS amount,
      sr.created_at AS dateValue,
      'request' AS routeType,
      sr.public_id AS routeId`,
    where: `sr.archived_at IS NULL AND sr.status_code NOT IN ('converted', 'lost-closed')`,
  },
  'outstanding-invoices': {
    csvFileName: 'outstanding-invoices',
    description: 'Invoices with a remaining balance due.',
    from: `FROM invoices i
      INNER JOIN client_accounts ca ON ca.id = i.client_account_id
      LEFT JOIN matters m ON m.id = i.matter_id`,
    label: 'Outstanding Invoices',
    orderBy: 'ORDER BY i.due_date ASC, i.id ASC',
    select: `i.public_id AS id,
      i.invoice_number AS title,
      CONCAT('Due ', DATE_FORMAT(i.due_date, '%Y-%m-%d')) AS subtitle,
      i.status_code AS status,
      ca.display_name AS clientName,
      m.title AS matterTitle,
      i.amount_due AS amount,
      i.due_date AS dateValue,
      'invoice' AS routeType,
      i.public_id AS routeId`,
    where: `i.archived_at IS NULL AND i.amount_due > 0 AND i.status_code NOT IN ('paid', 'refunded', 'void')`,
  },
  'overdue-invoices': {
    csvFileName: 'overdue-invoices',
    description: 'Invoices past due with a balance due.',
    from: `FROM invoices i
      INNER JOIN client_accounts ca ON ca.id = i.client_account_id
      LEFT JOIN matters m ON m.id = i.matter_id`,
    label: 'Overdue Invoices',
    orderBy: 'ORDER BY i.due_date ASC, i.id ASC',
    select: `i.public_id AS id,
      i.invoice_number AS title,
      CONCAT('Due ', DATE_FORMAT(i.due_date, '%Y-%m-%d')) AS subtitle,
      i.status_code AS status,
      ca.display_name AS clientName,
      m.title AS matterTitle,
      i.amount_due AS amount,
      i.due_date AS dateValue,
      'invoice' AS routeType,
      i.public_id AS routeId`,
    where: `i.archived_at IS NULL AND i.amount_due > 0 AND i.due_date < UTC_DATE() AND i.status_code NOT IN ('paid', 'refunded', 'void')`,
  },
  'paid-invoices': {
    csvFileName: 'paid-invoices',
    description: 'Invoices with recorded paid amounts.',
    from: `FROM invoices i
      INNER JOIN client_accounts ca ON ca.id = i.client_account_id
      LEFT JOIN matters m ON m.id = i.matter_id`,
    label: 'Paid Invoices',
    orderBy: 'ORDER BY i.updated_at DESC, i.id DESC',
    select: `i.public_id AS id,
      i.invoice_number AS title,
      CONCAT('Paid ', FORMAT(i.amount_paid, 2)) AS subtitle,
      i.status_code AS status,
      ca.display_name AS clientName,
      m.title AS matterTitle,
      i.amount_paid AS amount,
      i.updated_at AS dateValue,
      'invoice' AS routeType,
      i.public_id AS routeId`,
    where: `i.archived_at IS NULL AND i.amount_paid > 0`,
  },
  'pending-documents': {
    csvFileName: 'pending-document-reviews',
    description: 'Documents whose current version is not marked clean/reviewed.',
    from: `FROM documents d
      INNER JOIN client_accounts ca ON ca.id = d.owner_client_account_id
      LEFT JOIN document_versions dv ON dv.document_id = d.id AND dv.is_current = 1
      LEFT JOIN matter_documents md ON md.document_id = d.id
      LEFT JOIN matters m ON m.id = md.matter_id`,
    label: 'Pending Document Reviews',
    orderBy: 'ORDER BY COALESCE(dv.uploaded_at, d.created_at) DESC, d.id DESC',
    select: `d.public_id AS id,
      d.title,
      COALESCE(dv.original_file_name, d.document_number) AS subtitle,
      COALESCE(dv.virus_scan_status_code, 'pending') AS status,
      ca.display_name AS clientName,
      m.title AS matterTitle,
      NULL AS amount,
      COALESCE(dv.uploaded_at, d.created_at) AS dateValue,
      'document' AS routeType,
      d.public_id AS routeId`,
    where: `d.archived_at IS NULL AND COALESCE(dv.virus_scan_status_code, 'pending') <> 'clean'`,
  },
  'pending-reminders': {
    csvFileName: 'pending-reminders',
    description: 'Pending reminder jobs.',
    from: `FROM event_reminders er
      INNER JOIN events evt ON evt.id = er.event_id
      INNER JOIN users recipient ON recipient.id = er.recipient_user_id
      LEFT JOIN client_accounts ca ON ca.id = evt.client_account_id`,
    label: 'Pending Reminders',
    orderBy: 'ORDER BY er.scheduled_at ASC, er.id ASC',
    select: `CAST(er.id AS CHAR) AS id,
      evt.title,
      CONCAT('Recipient: ', COALESCE(recipient.display_name, recipient.email, 'Client portal user')) AS subtitle,
      er.delivery_status_code AS status,
      ca.display_name AS clientName,
      evt.title AS matterTitle,
      NULL AS amount,
      er.scheduled_at AS dateValue,
      'reminder' AS routeType,
      CAST(er.id AS CHAR) AS routeId`,
    where: `er.delivery_status_code = 'pending'`,
  },
  'recent-notifications': {
    csvFileName: 'recent-client-notifications',
    description: 'Client-visible notifications created in the last seven days.',
    from: `FROM notifications n
      INNER JOIN users recipient ON recipient.id = n.recipient_user_id
      LEFT JOIN matters m ON m.id = n.matter_id
      LEFT JOIN client_account_contacts cac ON cac.user_id = recipient.id AND cac.archived_at IS NULL
      LEFT JOIN client_accounts ca ON ca.id = cac.client_account_id`,
    label: 'Recent Client Activity',
    orderBy: 'ORDER BY n.created_at DESC, n.id DESC',
    select: `n.public_id AS id,
      n.title,
      n.notification_type_code AS subtitle,
      CASE WHEN n.is_read = 1 THEN 'read' ELSE 'unread' END AS status,
      ca.display_name AS clientName,
      m.title AS matterTitle,
      NULL AS amount,
      n.created_at AS dateValue,
      'notification' AS routeType,
      n.public_id AS routeId`,
    where: `n.created_at >= DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 7 DAY)`,
  },
  'stale-matters': {
    csvFileName: 'stale-matters',
    description: 'Active matters with no activity in the last 14 days.',
    from: `FROM matters m
      INNER JOIN client_accounts ca ON ca.id = m.client_account_id
      LEFT JOIN matter_stages ms ON ms.code = m.current_stage_code`,
    label: 'Stale Matters',
    orderBy: 'ORDER BY m.last_activity_at ASC, m.id ASC',
    select: `m.public_id AS id,
      m.title,
      m.matter_number AS subtitle,
      m.operational_status_code AS status,
      ca.display_name AS clientName,
      m.title AS matterTitle,
      NULL AS amount,
      m.last_activity_at AS dateValue,
      'matter' AS routeType,
      m.public_id AS routeId`,
    where: `m.archived_at IS NULL AND m.operational_status_code NOT IN ('completed', 'archived') AND m.last_activity_at < UTC_TIMESTAMP(6) - INTERVAL 14 DAY`,
  },
  'upcoming-events': {
    csvFileName: 'upcoming-events',
    description: 'Upcoming scheduled events.',
    from: `FROM events evt
      INNER JOIN client_accounts ca ON ca.id = evt.client_account_id
      LEFT JOIN matters m ON m.id = evt.matter_id`,
    label: 'Upcoming Events',
    orderBy: 'ORDER BY evt.scheduled_start_at ASC, evt.id ASC',
    select: `evt.public_id AS id,
      evt.title,
      evt.event_type_code AS subtitle,
      evt.status_code AS status,
      ca.display_name AS clientName,
      m.title AS matterTitle,
      NULL AS amount,
      evt.scheduled_start_at AS dateValue,
      'event' AS routeType,
      evt.public_id AS routeId`,
    where: `evt.status_code = 'upcoming' AND evt.scheduled_start_at >= UTC_TIMESTAMP(6)`,
  },
  'waiting-threads': {
    csvFileName: 'waiting-message-threads',
    description: 'Conversation threads waiting for an admin response.',
    from: `FROM conversation_threads ct
      INNER JOIN client_accounts ca ON ca.id = ct.client_account_id
      LEFT JOIN matters m ON m.id = ct.matter_id`,
    label: 'Waiting Threads',
    orderBy: 'ORDER BY COALESCE(ct.last_message_at, ct.updated_at) DESC, ct.id DESC',
    select: `ct.public_id AS id,
      COALESCE(ct.subject, ct.thread_number) AS title,
      ct.thread_number AS subtitle,
      ct.status_code AS status,
      ca.display_name AS clientName,
      m.title AS matterTitle,
      NULL AS amount,
      COALESCE(ct.last_message_at, ct.updated_at) AS dateValue,
      'message' AS routeType,
      ct.public_id AS routeId`,
    where: `ct.archived_at IS NULL AND ct.status_code = 'waiting'`,
  },
};

const assertDrilldownKind = (value: string): ReportDrilldownKind => {
  if (value in DRILLDOWN_DEFINITIONS) {
    return value as ReportDrilldownKind;
  }

  throw badRequest('unsupported_report_drilldown', `Unsupported report drilldown: ${value}`);
};

const clampLimit = (limit?: number) => Math.max(1, Math.min(limit || 50, 250));
const clampOffset = (offset?: number) => Math.max(0, offset || 0);

const mapDrilldownRow = (row: DrilldownRow) => ({
  amount: row.amount === null || row.amount === undefined ? undefined : Number(row.amount),
  clientName: row.clientName || undefined,
  date: row.dateValue || undefined,
  id: row.id,
  matterTitle: row.matterTitle || undefined,
  routeId: row.routeId || undefined,
  routeType: row.routeType as
    | 'document'
    | 'event'
    | 'invoice'
    | 'matter'
    | 'message'
    | 'notification'
    | 'reminder'
    | 'request',
  status: row.status || undefined,
  subtitle: row.subtitle || undefined,
  title: row.title,
});

const getKpiRows = async () =>
  queryRows<KpiRow>(
    `SELECT
       (SELECT COUNT(*) FROM service_requests sr WHERE sr.archived_at IS NULL AND sr.status_code NOT IN ('converted', 'lost-closed')) AS openRequests,
       (SELECT COUNT(*) FROM service_requests sr WHERE sr.archived_at IS NULL AND sr.status_code = 'converted') AS convertedRequests,
       (SELECT COUNT(*) FROM service_requests sr WHERE sr.archived_at IS NULL AND sr.status_code = 'lost-closed') AS declinedRequests,
       (SELECT COUNT(*) FROM matters m WHERE m.archived_at IS NULL AND m.operational_status_code NOT IN ('completed', 'archived')) AS activeMatters,
       (SELECT COUNT(*) FROM matters m WHERE m.archived_at IS NULL AND m.operational_status_code NOT IN ('completed', 'archived') AND m.last_activity_at < UTC_TIMESTAMP(6) - INTERVAL 14 DAY) AS staleMatters,
       (SELECT COUNT(*) FROM matters m WHERE m.archived_at IS NULL AND (m.operational_status_code IN ('completed', 'archived') OR m.closed_at IS NOT NULL)) AS closedMatters,
       (SELECT COUNT(*) FROM invoices i WHERE i.archived_at IS NULL AND i.amount_due > 0 AND i.due_date < UTC_DATE() AND i.status_code NOT IN ('paid', 'refunded', 'void')) AS overdueInvoices,
       (SELECT COALESCE(SUM(i.amount_due), 0) FROM invoices i WHERE i.archived_at IS NULL AND i.amount_due > 0 AND i.status_code NOT IN ('paid', 'refunded', 'void')) AS outstandingInvoiceAmount,
       (SELECT COALESCE(SUM(i.amount_paid), 0) FROM invoices i WHERE i.archived_at IS NULL AND i.amount_paid > 0) AS paidInvoiceAmount,
       (SELECT COUNT(*) FROM conversation_threads ct WHERE ct.archived_at IS NULL AND ct.status_code = 'waiting') AS waitingThreads,
       (
         SELECT COUNT(*)
         FROM documents d
         LEFT JOIN document_versions dv ON dv.document_id = d.id AND dv.is_current = 1
         WHERE d.archived_at IS NULL
           AND COALESCE(dv.virus_scan_status_code, 'pending') <> 'clean'
       ) AS pendingDocumentReviews,
       (SELECT COUNT(*) FROM events evt WHERE evt.status_code = 'upcoming' AND evt.scheduled_start_at >= UTC_TIMESTAMP(6)) AS upcomingEvents,
       (SELECT COUNT(*) FROM event_reminders er WHERE er.delivery_status_code = 'pending') AS pendingReminders,
       (SELECT COUNT(*) FROM event_reminders er WHERE er.delivery_status_code = 'failed') AS failedReminders,
       (SELECT COUNT(*) FROM notifications n WHERE n.created_at >= DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 7 DAY)) AS recentClientActivity,
       (SELECT COUNT(*) FROM event_reminders er WHERE er.delivery_status_code = 'failed') AS failedOperationalTasks`
  );

const formatKpis = (row: KpiRow | undefined) => ({
  activeMatters: safeNumber(row?.activeMatters),
  closedMatters: safeNumber(row?.closedMatters),
  convertedRequests: safeNumber(row?.convertedRequests),
  declinedRequests: safeNumber(row?.declinedRequests),
  failedOperationalTasks: safeNumber(row?.failedOperationalTasks),
  failedReminders: safeNumber(row?.failedReminders),
  openRequests: safeNumber(row?.openRequests),
  outstandingInvoiceAmount: safeNumber(row?.outstandingInvoiceAmount),
  overdueInvoices: safeNumber(row?.overdueInvoices),
  paidInvoiceAmount: safeNumber(row?.paidInvoiceAmount),
  pendingDocumentReviews: safeNumber(row?.pendingDocumentReviews),
  pendingReminders: safeNumber(row?.pendingReminders),
  recentClientActivity: safeNumber(row?.recentClientActivity),
  staleMatters: safeNumber(row?.staleMatters),
  upcomingEvents: safeNumber(row?.upcomingEvents),
  waitingThreads: safeNumber(row?.waitingThreads),
});

export const getWorkspace = async () => {
  const [summaryRows, revenueRows, intakeRows, stageRows, agingRows, resolutionRows, documentRows, kpiRows, matters, threads] =
    await Promise.all([
      queryRows<SummaryRow>(
        `SELECT
           (SELECT COALESCE(SUM(pt.gross_amount), 0)
            FROM payment_transactions pt
            WHERE pt.status_code IN ('captured', 'partially-refunded', 'refunded')) AS totalCollections,
           (SELECT COALESCE(SUM(rf.amount), 0) FROM refunds rf) AS refundsWriteOffs,
           (SELECT COUNT(*) FROM service_requests sr WHERE sr.archived_at IS NULL) AS totalRequests,
           (SELECT COUNT(*) FROM matters m WHERE m.archived_at IS NULL AND m.service_request_id IS NOT NULL) AS convertedRequests,
           (SELECT AVG(DATEDIFF(m.closed_at, m.opened_at))
            FROM matters m
            WHERE m.archived_at IS NULL AND m.closed_at IS NOT NULL) AS averageResolutionDays`
      ),
      queryRows<RevenueRow>(
        `SELECT
           DATE_FORMAT(months.monthStart, '%b') AS monthLabel,
           COALESCE(
             (
               SELECT SUM(pt.gross_amount)
               FROM payment_transactions pt
               WHERE pt.status_code IN ('captured', 'partially-refunded', 'refunded')
                 AND DATE_FORMAT(COALESCE(pt.captured_at, pt.created_at), '%Y-%m-01') = months.monthStart
             ),
             0
           ) AS currentRevenue,
           COALESCE(
             (
               SELECT SUM(pt_prev.gross_amount)
               FROM payment_transactions pt_prev
               WHERE pt_prev.status_code IN ('captured', 'partially-refunded', 'refunded')
                 AND DATE_FORMAT(COALESCE(pt_prev.captured_at, pt_prev.created_at), '%Y-%m-01') =
                     DATE_FORMAT(DATE_SUB(months.monthStart, INTERVAL 1 YEAR), '%Y-%m-01')
             ),
             0
           ) AS previousRevenue
         FROM (
           SELECT DATE_FORMAT(DATE_SUB(DATE_FORMAT(UTC_DATE(), '%Y-%m-01'), INTERVAL seq.n MONTH), '%Y-%m-01') AS monthStart
           FROM (
             SELECT 7 AS n UNION ALL SELECT 6 UNION ALL SELECT 5 UNION ALL SELECT 4
             UNION ALL SELECT 3 UNION ALL SELECT 2 UNION ALL SELECT 1 UNION ALL SELECT 0
           ) AS seq
         ) AS months
         ORDER BY months.monthStart ASC`
      ),
      queryRows<IntakeRow>(
        `SELECT
           DATE_FORMAT(months.monthStart, '%b') AS monthLabel,
           COALESCE(COUNT(sr.id), 0) AS leads,
           COALESCE(COUNT(DISTINCT m.id), 0) AS converted
         FROM (
           SELECT DATE_FORMAT(DATE_SUB(DATE_FORMAT(UTC_DATE(), '%Y-%m-01'), INTERVAL seq.n MONTH), '%Y-%m-01') AS monthStart
           FROM (
             SELECT 5 AS n UNION ALL SELECT 4 UNION ALL SELECT 3
             UNION ALL SELECT 2 UNION ALL SELECT 1 UNION ALL SELECT 0
           ) AS seq
         ) AS months
         LEFT JOIN service_requests sr
           ON DATE_FORMAT(sr.created_at, '%Y-%m-01') = months.monthStart
          AND sr.archived_at IS NULL
         LEFT JOIN matters m ON m.service_request_id = sr.id AND m.archived_at IS NULL
         GROUP BY months.monthStart
         ORDER BY months.monthStart ASC`
      ),
      queryRows<StageRow>(
        `SELECT
           COALESCE(ms.label, m.current_stage_code) AS name,
           COUNT(*) AS value
         FROM matters m
         LEFT JOIN matter_stages ms ON ms.code = m.current_stage_code
         WHERE m.archived_at IS NULL
         GROUP BY COALESCE(ms.label, m.current_stage_code), m.current_stage_code
         ORDER BY COUNT(*) DESC, name ASC
         LIMIT 5`
      ),
      queryRows<AgingRow>(
        `SELECT
           CASE
             WHEN DATEDIFF(UTC_DATE(), due_date) BETWEEN 1 AND 15 THEN '1-15 Days'
             WHEN DATEDIFF(UTC_DATE(), due_date) BETWEEN 16 AND 30 THEN '16-30 Days'
             WHEN DATEDIFF(UTC_DATE(), due_date) BETWEEN 31 AND 60 THEN '31-60 Days'
             WHEN DATEDIFF(UTC_DATE(), due_date) > 60 THEN '60+ Days'
             ELSE 'Current'
           END AS bucket,
           SUM(amount_due) AS amount
         FROM invoices
         WHERE archived_at IS NULL
           AND amount_due > 0
         GROUP BY
           CASE
             WHEN DATEDIFF(UTC_DATE(), due_date) BETWEEN 1 AND 15 THEN '1-15 Days'
             WHEN DATEDIFF(UTC_DATE(), due_date) BETWEEN 16 AND 30 THEN '16-30 Days'
             WHEN DATEDIFF(UTC_DATE(), due_date) BETWEEN 31 AND 60 THEN '31-60 Days'
             WHEN DATEDIFF(UTC_DATE(), due_date) > 60 THEN '60+ Days'
             ELSE 'Current'
           END`
      ),
      queryRows<ResolutionRow>(
        `SELECT
           ld.domain_name AS name,
           AVG(DATEDIFF(m.closed_at, m.opened_at)) AS days
         FROM matters m
         INNER JOIN legal_domains ld ON ld.id = m.legal_domain_id
         WHERE m.archived_at IS NULL
           AND m.closed_at IS NOT NULL
         GROUP BY ld.domain_name
         ORDER BY days DESC
         LIMIT 5`
      ),
      queryRows<DocumentActivityRow>(
        `SELECT
           CASE
             WHEN COALESCE(dv.virus_scan_status_code, 'pending') = 'clean' THEN 'Reviewed'
             WHEN COALESCE(dv.virus_scan_status_code, 'pending') = 'infected' THEN 'Requires Attention'
             ELSE 'Pending Review'
           END AS label,
           COUNT(*) AS value
         FROM documents d
         LEFT JOIN document_versions dv ON dv.document_id = d.id AND dv.is_current = 1
         WHERE d.archived_at IS NULL
         GROUP BY
           CASE
             WHEN COALESCE(dv.virus_scan_status_code, 'pending') = 'clean' THEN 'Reviewed'
             WHEN COALESCE(dv.virus_scan_status_code, 'pending') = 'infected' THEN 'Requires Attention'
             ELSE 'Pending Review'
           END
         ORDER BY value DESC`
      ),
      getKpiRows(),
      fetchMatters({}),
      fetchThreads({}),
    ]);

  const summary = summaryRows[0] || {
    averageResolutionDays: 0,
    convertedRequests: 0,
    refundsWriteOffs: 0,
    totalCollections: 0,
    totalRequests: 0,
  };

  const assigneeMap = new Map<
    string,
    { activeMatters: number; label: string; waitingThreads: number }
  >();

  for (const matter of matters) {
    const label = matter.assignedStaff || matter.assignedCounsel || 'Unassigned';
    const current = assigneeMap.get(label) || { activeMatters: 0, label, waitingThreads: 0 };
    if (!['completed', 'archived'].includes(matter.operationalStatus)) {
      current.activeMatters += 1;
    }
    assigneeMap.set(label, current);
  }

  for (const thread of threads) {
    const label = thread.assignedTo || 'Unassigned';
    const current = assigneeMap.get(label) || { activeMatters: 0, label, waitingThreads: 0 };
    if (thread.unreadCount > 0 || thread.status === 'waiting') {
      current.waitingThreads += 1;
    }
    assigneeMap.set(label, current);
  }

  const workloadByAssignee = Array.from(assigneeMap.values())
    .sort((left, right) => right.activeMatters + right.waitingThreads - (left.activeMatters + left.waitingThreads))
    .slice(0, 4)
    .map((entry) => ({
      activeMatters: entry.activeMatters,
      label: entry.label,
      utilizationRate: Math.min(100, entry.activeMatters * 18 + entry.waitingThreads * 7),
      waitingThreads: entry.waitingThreads,
    }));

  return {
    documentActivity: documentRows.map((row) => ({
      label: row.label,
      value: safeNumber(row.value),
    })),
    intakeTrend: intakeRows.map((row) => ({
      converted: safeNumber(row.converted),
      leads: safeNumber(row.leads),
      month: row.monthLabel,
    })),
    invoiceAging: ['Current', '1-15 Days', '16-30 Days', '31-60 Days', '60+ Days'].map((bucket) => ({
      amount: safeNumber(agingRows.find((row) => row.bucket === bucket)?.amount),
      bucket,
    })),
    kpis: formatKpis(kpiRows[0]),
    resolutionTimes: resolutionRows.map((row) => ({
      days: Math.round(safeNumber(row.days)),
      label: row.name,
    })),
    revenueTrend: revenueRows.map((row) => ({
      currentRevenue: safeNumber(row.currentRevenue),
      month: row.monthLabel,
      previousRevenue: safeNumber(row.previousRevenue),
    })),
    stageMix: stageRows.map((row) => ({
      label: row.name,
      value: safeNumber(row.value),
    })),
    summary: {
      averageResolutionDays: Math.round(safeNumber(summary.averageResolutionDays)),
      clientConversionRate:
        safeNumber(summary.totalRequests) > 0
          ? Number(((safeNumber(summary.convertedRequests) / safeNumber(summary.totalRequests)) * 100).toFixed(1))
          : 0,
      refundsWriteOffs: safeNumber(summary.refundsWriteOffs),
      totalCollections: safeNumber(summary.totalCollections),
      totalRequests: safeNumber(summary.totalRequests),
    },
    workloadByAssignee,
  };
};

export const getDrilldown = async (
  input: {
    kind: string;
    limit?: number;
    offset?: number;
  }
) => {
  const kind = assertDrilldownKind(input.kind);
  const definition = DRILLDOWN_DEFINITIONS[kind];
  const limit = clampLimit(input.limit);
  const offset = clampOffset(input.offset);

  const [countRows, rows] = await Promise.all([
    queryRows<CountRow>(
      `SELECT COUNT(*) AS total
       ${definition.from}
       WHERE ${definition.where}`
    ),
    queryRows<DrilldownRow>(
      `SELECT ${definition.select}
       ${definition.from}
       WHERE ${definition.where}
       ${definition.orderBy}
       LIMIT ? OFFSET ?`,
      [limit, offset]
    ),
  ]);

  return {
    description: definition.description,
    items: rows.map(mapDrilldownRow),
    kind,
    label: definition.label,
    limit,
    offset,
    total: safeNumber(countRows[0]?.total),
  };
};

const csvEscape = (value: unknown) => {
  if (value === undefined || value === null) {
    return '';
  }

  return `"${String(value).replace(/"/g, '""')}"`;
};

export const exportDrilldownCsv = async (
  actor: AdminActor,
  input: {
    kind: string;
  }
) => {
  const kind = assertDrilldownKind(input.kind);
  const definition = DRILLDOWN_DEFINITIONS[kind];
  const drilldown = await getDrilldown({ kind, limit: 5000, offset: 0 });
  const rows = [
    ['ID', 'Title', 'Subtitle', 'Status', 'Client', 'Matter/Event', 'Amount', 'Date', 'Route Type', 'Route ID'],
    ...drilldown.items.map((item) => [
      item.id,
      item.title,
      item.subtitle || '',
      item.status || '',
      item.clientName || '',
      item.matterTitle || '',
      item.amount ?? '',
      item.date || '',
      item.routeType,
      item.routeId || '',
    ]),
  ];

  await createAuditEvent({
    actionCode: 'report.exported',
    actionLabel: 'Report drilldown exported',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    changes: [{ fieldName: 'report_kind', newValue: kind }],
    entityPk: null,
    entityTableName: 'reports',
    sourceModule: 'reports_workspace',
    summaryNewValue: `${definition.label} CSV exported with ${drilldown.items.length} row(s).`,
  });

  return {
    csv: rows.map((row) => row.map(csvEscape).join(',')).join('\n'),
    fileName: `global-lmg-${definition.csvFileName}-${new Date().toISOString().slice(0, 10)}.csv`,
  };
};
