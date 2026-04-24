import type { RowDataPacket } from 'mysql2/promise';
import { queryRows } from '../../lib/mysql.js';
import { fetchMatters, fetchThreads } from '../shared.js';

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

const safeNumber = (value: number | null | undefined) => Number(value || 0);

export const getWorkspace = async () => {
  const [summaryRows, revenueRows, intakeRows, stageRows, agingRows, resolutionRows, documentRows, matters, threads] =
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
