import { z } from 'zod';
import { getMysqlPool } from '../../lib/mysql.js';
import { executeResult, selectAll, withTransaction } from '../../lib/mysqlUtils.js';
import { fromMysqlDateTime, nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { domainService } from '../domain/service.js';
import { notFound } from '../../lib/httpErrors.js';
import { documentStorageService } from '../storage/service.js';
const updateVisibilitySchema = z.object({
    visibilityScopeCode: z.enum(['internal', 'shared', 'client']),
});
const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');
export const adminDocumentService = {
    updateVisibilitySchema,
    async listDocuments(options = {}) {
        return withTransaction(getMysqlPool(), async (connection) => {
            const limit = Math.min(Math.max(options.limit || 20, 1), 100);
            const offset = Math.max(options.offset || 0, 0);
            const values = [];
            let whereClause = 'WHERE d.archived_at IS NULL';
            if (options.search?.trim()) {
                const like = `%${escapeLike(options.search.trim())}%`;
                whereClause +=
                    " AND (d.title LIKE ? ESCAPE '\\\\' OR d.document_number LIKE ? ESCAPE '\\\\' OR owner.display_name LIKE ? ESCAPE '\\\\')";
                values.push(like, like, like);
            }
            const rows = await selectAll(connection, `SELECT
           d.public_id,
           d.title,
           d.category_code,
           d.visibility_scope_code,
           d.current_version_no,
           d.updated_at,
           owner.public_id AS owner_client_account_public_id,
           owner.display_name AS client_display_name,
           dv.original_file_name AS latest_file_name
         FROM documents d
         INNER JOIN client_accounts owner
           ON owner.id = d.owner_client_account_id
         LEFT JOIN document_versions dv
           ON dv.document_id = d.id
          AND dv.is_current = 1
         ${whereClause}
         ORDER BY d.updated_at DESC
         LIMIT ?
         OFFSET ?`, [...values, limit, offset]);
            return {
                items: rows.map((row) => ({
                    categoryCode: row.category_code,
                    clientName: row.client_display_name,
                    currentVersionNo: row.current_version_no,
                    id: row.public_id,
                    latestFileName: row.latest_file_name,
                    ownerClientAccountId: row.owner_client_account_public_id,
                    title: row.title,
                    updatedAt: fromMysqlDateTime(row.updated_at),
                    visibilityScopeCode: row.visibility_scope_code,
                })),
                limit,
                offset,
            };
        });
    },
    async getDocument(documentPublicId) {
        return domainService.getDocumentByPublicId(documentPublicId);
    },
    async downloadDocument(actorPublicId, documentPublicId, options = {}) {
        return documentStorageService.getAdminDocumentDownload(actorPublicId, documentPublicId, options);
    },
    async previewDocument(actorPublicId, documentPublicId, options = {}) {
        return documentStorageService.getAdminDocumentDownload(actorPublicId, documentPublicId, options);
    },
    async updateVisibility(documentPublicId, input) {
        const payload = updateVisibilitySchema.parse(input);
        return withTransaction(getMysqlPool(), async (connection) => {
            const result = await executeResult(connection, `UPDATE documents
         SET visibility_scope_code = ?,
             updated_at = ?,
             row_version = row_version + 1
         WHERE public_id = ?
           AND archived_at IS NULL`, [payload.visibilityScopeCode, toMysqlDateTime(nowUtc()), documentPublicId]);
            if (result.affectedRows === 0) {
                throw notFound('document_not_found', 'Document not found.');
            }
            return {
                documentId: documentPublicId,
                visibilityScopeCode: payload.visibilityScopeCode,
            };
        });
    },
};
