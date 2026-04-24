import type { RowDataPacket } from 'mysql2/promise';
import { queryRows } from '../../lib/mysql.js';

type RequestMetricRow = RowDataPacket & {
  convertedThisMonth: number;
  openRequests: number;
  scheduledConsultations: number;
  urgentRequests: number;
};

type RequestRow = RowDataPacket & {
  clientEmail: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  consultationMode: string;
  createdAt: string;
  expertiseArea: string;
  issueSummary: string;
  matterId: string | null;
  matterNumber: string | null;
  ownerName: string | null;
  preferredEndAt: string | null;
  preferredStartAt: string | null;
  quoteTotalAmount: number;
  requestNumber: string;
  selectedServices: string | null;
  statusCode: string;
  statusLabel: string | null;
  title: string;
  urgencyCode: string;
  urgencyLabel: string | null;
  id: string;
};

const toIso = (value: string | null) => (value ? value.replace(' ', 'T') : undefined);

const toLabel = (value: string) =>
  value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const getWorkspace = async () => {
  const [metricRows, requestRows] = await Promise.all([
    queryRows<RequestMetricRow>(
      `SELECT
         SUM(CASE WHEN sr.status_code NOT IN ('converted', 'lost-closed') THEN 1 ELSE 0 END) AS openRequests,
         SUM(CASE WHEN pur.urgency_code IN ('within-2hrs', 'within-6hrs')
                    AND sr.status_code NOT IN ('converted', 'lost-closed')
                  THEN 1 ELSE 0 END) AS urgentRequests,
         SUM(CASE WHEN sr.preferred_start_at IS NOT NULL THEN 1 ELSE 0 END) AS scheduledConsultations,
         SUM(
           CASE
             WHEN sr.status_code = 'converted'
              AND YEAR(COALESCE(m.opened_at, sr.updated_at, sr.created_at)) = YEAR(UTC_DATE())
              AND MONTH(COALESCE(m.opened_at, sr.updated_at, sr.created_at)) = MONTH(UTC_DATE())
             THEN 1 ELSE 0
           END
         ) AS convertedThisMonth
       FROM service_requests sr
       INNER JOIN pricing_urgency_rules pur ON pur.id = sr.urgency_rule_id
       LEFT JOIN matters m ON m.service_request_id = sr.id AND m.archived_at IS NULL
       WHERE sr.archived_at IS NULL`
    ),
    queryRows<RequestRow>(
      `SELECT
         sr.public_id AS id,
         sr.request_number AS requestNumber,
         ca.public_id AS clientId,
         ca.display_name AS clientName,
         ca.primary_email AS clientEmail,
         ca.primary_phone AS clientPhone,
         sr.title,
         sr.issue_summary AS issueSummary,
         ld.domain_name AS expertiseArea,
         sr.status_code AS statusCode,
         rs.label AS statusLabel,
         sr.consultation_mode_code AS consultationMode,
         pur.urgency_code AS urgencyCode,
         pur.label AS urgencyLabel,
         sr.preferred_start_at AS preferredStartAt,
         sr.preferred_end_at AS preferredEndAt,
         sr.quote_total_amount AS quoteTotalAmount,
         sr.created_at AS createdAt,
         owner.display_name AS ownerName,
         matter.public_id AS matterId,
         matter.matter_number AS matterNumber,
         GROUP_CONCAT(services.service_code ORDER BY req_services.sort_order SEPARATOR ',') AS selectedServices
       FROM service_requests sr
       INNER JOIN client_accounts ca ON ca.id = sr.client_account_id
       INNER JOIN legal_domains ld ON ld.id = sr.legal_domain_id
       INNER JOIN pricing_urgency_rules pur ON pur.id = sr.urgency_rule_id
       LEFT JOIN request_statuses rs ON rs.code = sr.status_code
       LEFT JOIN users owner ON owner.id = ca.owner_user_id
       LEFT JOIN matters matter ON matter.service_request_id = sr.id AND matter.archived_at IS NULL
       LEFT JOIN request_services req_services ON req_services.service_request_id = sr.id
       LEFT JOIN services ON services.id = req_services.service_id
       WHERE sr.archived_at IS NULL
       GROUP BY
         sr.id,
         sr.public_id,
         sr.request_number,
         ca.public_id,
         ca.display_name,
         ca.primary_email,
         ca.primary_phone,
         sr.title,
         sr.issue_summary,
         ld.domain_name,
         sr.status_code,
         rs.label,
         sr.consultation_mode_code,
         pur.urgency_code,
         pur.label,
         sr.preferred_start_at,
         sr.preferred_end_at,
         sr.quote_total_amount,
         sr.created_at,
         owner.display_name,
         matter.public_id,
         matter.matter_number
       ORDER BY sr.created_at DESC`
    ),
  ]);

  const metrics = metricRows[0] || {
    convertedThisMonth: 0,
    openRequests: 0,
    scheduledConsultations: 0,
    urgentRequests: 0,
  };

  return {
    metrics: {
      convertedThisMonth: Number(metrics.convertedThisMonth || 0),
      openRequests: Number(metrics.openRequests || 0),
      scheduledConsultations: Number(metrics.scheduledConsultations || 0),
      urgentRequests: Number(metrics.urgentRequests || 0),
    },
    requests: requestRows.map((row) => ({
      clientEmail: row.clientEmail,
      clientId: row.clientId,
      clientName: row.clientName,
      clientPhone: row.clientPhone,
      consultationMode: row.consultationMode,
      createdAt: row.createdAt.replace(' ', 'T'),
      expertiseArea: row.expertiseArea,
      id: row.id,
      issueSummary: row.issueSummary,
      matterId: row.matterId || undefined,
      matterNumber: row.matterNumber || undefined,
      ownerName: row.ownerName || 'Intake Desk',
      preferredEndAt: toIso(row.preferredEndAt),
      preferredStartAt: toIso(row.preferredStartAt),
      quoteTotalAmount: Number(row.quoteTotalAmount || 0),
      requestNumber: row.requestNumber,
      selectedServices: row.selectedServices ? row.selectedServices.split(',').filter(Boolean) : [],
      statusCode: row.statusCode,
      statusLabel: row.statusLabel || toLabel(row.statusCode),
      title: row.title,
      urgencyCode: row.urgencyCode,
      urgencyLabel: row.urgencyLabel || toLabel(row.urgencyCode),
    })),
  };
};
