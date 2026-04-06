import type { RowDataPacket } from 'mysql2/promise';
import { getMysqlPool } from '../../lib/mysql.js';
import { notFound } from '../../lib/httpErrors.js';
import { selectAll, selectOne, withConnection } from '../../lib/mysqlUtils.js';
import { fromMysqlDateTime } from '../../lib/datetime.js';

interface CountRow extends RowDataPacket {
  count_value: number;
}

interface RequestListRow extends RowDataPacket {
  client_display_name: string;
  client_public_id: string;
  legal_domain_name: string;
  linked_matter_number: string | null;
  linked_matter_public_id: string | null;
  public_id: string;
  quote_total_amount: string | number;
  request_number: string;
  status_code: string;
  submitted_at: string | null;
  title: string;
}

interface RequestDetailRow extends RowDataPacket {
  client_display_name: string;
  client_public_id: string;
  consultation_mode_code: string;
  contact_email_snapshot: string;
  contact_mobile_snapshot: string;
  contact_name_snapshot: string;
  detailed_description: string | null;
  issue_summary: string;
  legal_domain_name: string;
  linked_matter_number: string | null;
  linked_matter_public_id: string | null;
  preferred_end_at: string | null;
  preferred_start_at: string | null;
  public_id: string;
  quote_total_amount: string | number;
  request_number: string;
  status_code: string;
  submitted_at: string | null;
  title: string;
  urgency_code: string;
  urgency_label: string;
}

interface RequestServiceRow extends RowDataPacket {
  quoted_base_fee: string | number;
  service_code: string;
  service_name: string;
  sort_order: number;
}

interface QuoteRow extends RowDataPacket {
  accepted_at: string | null;
  consultation_mode_surcharge_amount: string | number;
  created_at: string;
  created_by_user_public_id: string;
  currency_code: string;
  discount_amount: string | number;
  is_final: number;
  public_id: string;
  service_count: number;
  tax_amount: string | number;
  total_amount: string | number;
  urgency_surcharge_amount: string | number;
  version_no: number;
}

interface QuoteLineRow extends RowDataPacket {
  description: string;
  line_amount: string | number;
  line_type_code: string;
  pricing_quote_public_id: string;
  quantity: string | number;
  sort_order: number;
  unit_amount: string | number;
}

interface RequestDocumentRow extends RowDataPacket {
  category_code: string;
  document_public_id: string;
  document_title: string;
  latest_file_name: string | null;
  visibility_scope_code: string;
}

interface StatusHistoryRow extends RowDataPacket {
  changed_by_user_public_id: string | null;
  created_at: string;
  from_status_code: string | null;
  note_text: string | null;
  to_status_code: string;
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');
const toAmount = (value: string | number | null | undefined) => Number(value || 0);

export const adminRequestService = {
  async listRequests(options: {
    limit?: number;
    offset?: number;
    search?: string;
    statusCode?: string;
  } = {}) {
    return withConnection(getMysqlPool(), async (connection) => {
      const limit = Math.min(Math.max(options.limit || 20, 1), 100);
      const offset = Math.max(options.offset || 0, 0);
      const values: Array<string | number> = [];
      const clauses = ['sr.archived_at IS NULL'];

      if (options.statusCode?.trim()) {
        clauses.push('sr.status_code = ?');
        values.push(options.statusCode.trim());
      }

      if (options.search?.trim()) {
        const like = `%${escapeLike(options.search.trim())}%`;
        clauses.push(
          `(sr.title LIKE ? ESCAPE '\\\\' OR sr.request_number LIKE ? ESCAPE '\\\\' OR ca.display_name LIKE ? ESCAPE '\\\\' OR sr.issue_summary LIKE ? ESCAPE '\\\\')`
        );
        values.push(like, like, like, like);
      }

      const whereClause = `WHERE ${clauses.join(' AND ')}`;
      const rows = await selectAll<RequestListRow>(
        connection,
        `SELECT
           sr.public_id,
           sr.request_number,
           sr.status_code,
           sr.title,
           sr.quote_total_amount,
           sr.submitted_at,
           ca.public_id AS client_public_id,
           ca.display_name AS client_display_name,
           ld.name AS legal_domain_name,
           m.public_id AS linked_matter_public_id,
           m.matter_number AS linked_matter_number
         FROM service_requests sr
         INNER JOIN client_accounts ca
           ON ca.id = sr.client_account_id
         INNER JOIN legal_domains ld
           ON ld.id = sr.legal_domain_id
         LEFT JOIN matters m
           ON m.service_request_id = sr.id
         ${whereClause}
         ORDER BY COALESCE(sr.submitted_at, sr.created_at) DESC
         LIMIT ?
         OFFSET ?`,
        [...values, limit, offset]
      );

      const total = await selectOne<CountRow>(
        connection,
        `SELECT COUNT(*) AS count_value
         FROM service_requests sr
         INNER JOIN client_accounts ca
           ON ca.id = sr.client_account_id
         ${whereClause}`,
        values
      );

      return {
        items: rows.map((row) => ({
          clientAccountId: row.client_public_id,
          clientName: row.client_display_name,
          id: row.public_id,
          legalDomainName: row.legal_domain_name,
          linkedMatterId: row.linked_matter_public_id,
          linkedMatterNumber: row.linked_matter_number,
          quoteTotalAmount: toAmount(row.quote_total_amount),
          requestNumber: row.request_number,
          statusCode: row.status_code,
          submittedAt: fromMysqlDateTime(row.submitted_at),
          title: row.title,
        })),
        limit,
        offset,
        total: Number(total?.count_value || 0),
      };
    });
  },

  async getRequest(requestPublicId: string) {
    return withConnection(getMysqlPool(), async (connection) => {
      const requestRow = await selectOne<RequestDetailRow>(
        connection,
        `SELECT
           sr.public_id,
           sr.request_number,
           sr.status_code,
           sr.title,
           sr.issue_summary,
           sr.detailed_description,
           sr.contact_name_snapshot,
           sr.contact_email_snapshot,
           sr.contact_mobile_snapshot,
           sr.consultation_mode_code,
           sr.preferred_start_at,
           sr.preferred_end_at,
           sr.quote_total_amount,
           sr.submitted_at,
           ca.public_id AS client_public_id,
           ca.display_name AS client_display_name,
           ld.name AS legal_domain_name,
           pur.urgency_code,
           pur.label AS urgency_label,
           m.public_id AS linked_matter_public_id,
           m.matter_number AS linked_matter_number
         FROM service_requests sr
         INNER JOIN client_accounts ca
           ON ca.id = sr.client_account_id
         INNER JOIN legal_domains ld
           ON ld.id = sr.legal_domain_id
         INNER JOIN pricing_urgency_rules pur
           ON pur.id = sr.urgency_rule_id
         LEFT JOIN matters m
           ON m.service_request_id = sr.id
         WHERE sr.public_id = ?
           AND sr.archived_at IS NULL
         LIMIT 1`,
        [requestPublicId]
      );

      if (!requestRow?.public_id) {
        throw notFound('service_request_not_found', 'Service request not found.');
      }

      const services = await selectAll<RequestServiceRow>(
        connection,
        `SELECT
           s.service_code,
           s.name AS service_name,
           rs.quoted_base_fee,
           rs.sort_order
         FROM request_services rs
         INNER JOIN service_requests sr
           ON sr.id = rs.service_request_id
         INNER JOIN services s
           ON s.id = rs.service_id
         WHERE sr.public_id = ?
         ORDER BY rs.sort_order ASC, s.name ASC`,
        [requestPublicId]
      );

      const quotes = await selectAll<QuoteRow>(
        connection,
        `SELECT
           pq.public_id,
           pq.version_no,
           pq.service_count,
           pq.urgency_surcharge_amount,
           pq.consultation_mode_surcharge_amount,
           pq.discount_amount,
           pq.tax_amount,
           pq.total_amount,
           pq.currency_code,
           pq.is_final,
           pq.accepted_at,
           pq.created_at,
           creator.public_id AS created_by_user_public_id
         FROM pricing_quotes pq
         INNER JOIN service_requests sr
           ON sr.id = pq.service_request_id
         INNER JOIN users creator
           ON creator.id = pq.created_by_user_id
         WHERE sr.public_id = ?
         ORDER BY pq.version_no DESC`,
        [requestPublicId]
      );

      const quoteLines = await selectAll<QuoteLineRow>(
        connection,
        `SELECT
           pq.public_id AS pricing_quote_public_id,
           pql.line_type_code,
           pql.description,
           pql.quantity,
           pql.unit_amount,
           pql.line_amount,
           pql.sort_order
         FROM pricing_quote_lines pql
         INNER JOIN pricing_quotes pq
           ON pq.id = pql.pricing_quote_id
         INNER JOIN service_requests sr
           ON sr.id = pq.service_request_id
         WHERE sr.public_id = ?
         ORDER BY pq.version_no DESC, pql.sort_order ASC`,
        [requestPublicId]
      );

      const documents = await selectAll<RequestDocumentRow>(
        connection,
        `SELECT
           d.public_id AS document_public_id,
           d.title AS document_title,
           d.category_code,
           d.visibility_scope_code,
           dv.original_file_name AS latest_file_name
         FROM request_documents rd
         INNER JOIN service_requests sr
           ON sr.id = rd.service_request_id
         INNER JOIN documents d
           ON d.id = rd.document_id
         LEFT JOIN document_versions dv
           ON dv.document_id = d.id
          AND dv.is_current = 1
         WHERE sr.public_id = ?
         ORDER BY d.updated_at DESC`,
        [requestPublicId]
      );

      const statusHistory = await selectAll<StatusHistoryRow>(
        connection,
        `SELECT
           rsh.from_status_code,
           rsh.to_status_code,
           rsh.note_text,
           rsh.created_at,
           changer.public_id AS changed_by_user_public_id
         FROM request_status_history rsh
         INNER JOIN service_requests sr
           ON sr.id = rsh.service_request_id
         LEFT JOIN users changer
           ON changer.id = rsh.changed_by_user_id
         WHERE sr.public_id = ?
         ORDER BY rsh.created_at DESC`,
        [requestPublicId]
      );

      const quoteLineMap = new Map<string, Array<{
        description: string;
        lineAmount: number;
        lineTypeCode: string;
        quantity: number;
        sortOrder: number;
        unitAmount: number;
      }>>();

      for (const line of quoteLines) {
        const current = quoteLineMap.get(line.pricing_quote_public_id) || [];
        current.push({
          description: line.description,
          lineAmount: toAmount(line.line_amount),
          lineTypeCode: line.line_type_code,
          quantity: toAmount(line.quantity),
          sortOrder: Number(line.sort_order),
          unitAmount: toAmount(line.unit_amount),
        });
        quoteLineMap.set(line.pricing_quote_public_id, current);
      }

      return {
        clientAccountId: requestRow.client_public_id,
        clientName: requestRow.client_display_name,
        consultationModeCode: requestRow.consultation_mode_code,
        contactEmail: requestRow.contact_email_snapshot,
        contactMobile: requestRow.contact_mobile_snapshot,
        contactName: requestRow.contact_name_snapshot,
        detailedDescription: requestRow.detailed_description,
        documents: documents.map((document) => ({
          categoryCode: document.category_code,
          documentId: document.document_public_id,
          latestFileName: document.latest_file_name,
          title: document.document_title,
          visibilityScopeCode: document.visibility_scope_code,
        })),
        id: requestRow.public_id,
        issueSummary: requestRow.issue_summary,
        legalDomainName: requestRow.legal_domain_name,
        linkedMatterId: requestRow.linked_matter_public_id,
        linkedMatterNumber: requestRow.linked_matter_number,
        preferredEndAt: fromMysqlDateTime(requestRow.preferred_end_at),
        preferredStartAt: fromMysqlDateTime(requestRow.preferred_start_at),
        quoteTotalAmount: toAmount(requestRow.quote_total_amount),
        quotes: quotes.map((quote) => ({
          acceptedAt: fromMysqlDateTime(quote.accepted_at),
          consultationModeSurchargeAmount: toAmount(quote.consultation_mode_surcharge_amount),
          createdAt: fromMysqlDateTime(quote.created_at),
          createdByUserId: quote.created_by_user_public_id,
          currencyCode: quote.currency_code,
          discountAmount: toAmount(quote.discount_amount),
          id: quote.public_id,
          isFinal: Boolean(quote.is_final),
          lines: quoteLineMap.get(quote.public_id) || [],
          serviceCount: Number(quote.service_count),
          taxAmount: toAmount(quote.tax_amount),
          totalAmount: toAmount(quote.total_amount),
          urgencySurchargeAmount: toAmount(quote.urgency_surcharge_amount),
          versionNo: Number(quote.version_no),
        })),
        requestNumber: requestRow.request_number,
        services: services.map((service) => ({
          quotedBaseFee: toAmount(service.quoted_base_fee),
          serviceCode: service.service_code,
          serviceName: service.service_name,
          sortOrder: Number(service.sort_order),
        })),
        statusCode: requestRow.status_code,
        statusHistory: statusHistory.map((entry) => ({
          changedByUserId: entry.changed_by_user_public_id,
          createdAt: fromMysqlDateTime(entry.created_at),
          fromStatusCode: entry.from_status_code,
          noteText: entry.note_text,
          toStatusCode: entry.to_status_code,
        })),
        submittedAt: fromMysqlDateTime(requestRow.submitted_at),
        title: requestRow.title,
        urgencyCode: requestRow.urgency_code,
        urgencyLabel: requestRow.urgency_label,
      };
    });
  },
};
