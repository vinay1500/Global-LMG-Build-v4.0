import { fromMysqlDateTime, toMysqlDateTime } from '../../lib/datetime.js';
import { selectOne, withConnection } from '../../lib/mysqlUtils.js';
import { ensurePlatformReady } from '../platform/bootstrap.js';
const deriveRelatedEntity = (row) => {
    if (row.request_public_id) {
        return {
            relatedEntityId: row.request_public_id,
            relatedEntityType: 'request',
        };
    }
    if (row.matter_public_id) {
        return {
            relatedEntityId: row.matter_public_id,
            relatedEntityType: 'matter',
        };
    }
    if (row.invoice_public_id) {
        return {
            relatedEntityId: row.invoice_public_id,
            relatedEntityType: 'invoice',
        };
    }
    if (row.thread_public_id) {
        return {
            relatedEntityId: row.thread_public_id,
            relatedEntityType: 'thread',
        };
    }
    return {
        relatedEntityId: undefined,
        relatedEntityType: undefined,
    };
};
export class MysqlStoredUploadRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async initialize() {
        await ensurePlatformReady();
    }
    async getById(id) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            const row = await selectOne(connection, `SELECT
           dui.public_id,
           owner.public_id AS owner_public_id,
           dui.source_module,
           dui.request_public_id,
           dui.matter_public_id,
           dui.invoice_public_id,
           dui.thread_public_id,
           dui.storage_driver_code,
           dui.storage_key,
           dui.original_name,
           dui.mime_type,
           dui.size_bytes,
           dui.checksum_sha256,
           dui.status_code,
           dui.created_at,
           dui.stored_at,
           dui.expires_at
         FROM document_upload_intents dui
         INNER JOIN users owner ON owner.id = dui.owner_user_id
         WHERE dui.public_id = ?
         LIMIT 1`, [id]);
            if (!row) {
                return undefined;
            }
            const relation = deriveRelatedEntity(row);
            return {
                checksumSha256: row.checksum_sha256,
                createdAt: fromMysqlDateTime(row.created_at) || '',
                finalizedAt: row.stored_at ? fromMysqlDateTime(row.stored_at) : undefined,
                id: row.public_id,
                mimeType: row.mime_type,
                originalName: row.original_name,
                ownerAccountId: row.owner_public_id,
                relatedEntityId: relation.relatedEntityId,
                relatedEntityType: relation.relatedEntityType,
                sizeBytes: Number(row.size_bytes || 0),
                sourceModule: row.source_module,
                status: row.status_code,
                storageDriver: row.storage_driver_code,
                storageKey: row.storage_key,
            };
        });
    }
    async save(record) {
        await this.initialize();
        await withConnection(this.pool, async (connection) => {
            const ownerRow = await selectOne(connection, `SELECT
           u.id AS user_id,
           ca.id AS client_account_id
         FROM users u
         INNER JOIN client_account_contacts cac
           ON cac.user_id = u.id
           AND cac.portal_access_enabled = 1
           AND cac.archived_at IS NULL
         INNER JOIN client_accounts ca
           ON ca.id = cac.client_account_id
           AND ca.archived_at IS NULL
         WHERE u.public_id = ?
         LIMIT 1`, [record.ownerAccountId]);
            if (!ownerRow?.user_id || !ownerRow?.client_account_id) {
                throw new Error(`Upload owner ${record.ownerAccountId} could not be resolved.`);
            }
            const requestPublicId = record.relatedEntityType === 'request' ? record.relatedEntityId || null : null;
            const matterPublicId = record.relatedEntityType === 'matter' ? record.relatedEntityId || null : null;
            const invoicePublicId = record.relatedEntityType === 'invoice' ? record.relatedEntityId || null : null;
            const threadPublicId = record.relatedEntityType === 'thread' ? record.relatedEntityId || null : null;
            await connection.execute(`INSERT INTO document_upload_intents (
          public_id, owner_user_id, owner_client_account_id, source_module, request_public_id,
          matter_public_id, invoice_public_id, thread_public_id, original_name, mime_type,
          size_bytes, checksum_sha256, storage_driver_code, storage_key, status_code, document_id,
          document_version_id, created_at, expires_at, stored_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          source_module = VALUES(source_module),
          request_public_id = VALUES(request_public_id),
          matter_public_id = VALUES(matter_public_id),
          invoice_public_id = VALUES(invoice_public_id),
          thread_public_id = VALUES(thread_public_id),
          original_name = VALUES(original_name),
          mime_type = VALUES(mime_type),
          size_bytes = VALUES(size_bytes),
          checksum_sha256 = VALUES(checksum_sha256),
          storage_driver_code = VALUES(storage_driver_code),
          storage_key = VALUES(storage_key),
          status_code = VALUES(status_code),
          stored_at = VALUES(stored_at)`, [
                record.id,
                Number(ownerRow.user_id),
                Number(ownerRow.client_account_id),
                record.sourceModule,
                requestPublicId,
                matterPublicId,
                invoicePublicId,
                threadPublicId,
                record.originalName,
                record.mimeType,
                record.sizeBytes,
                record.checksumSha256,
                record.storageDriver,
                record.storageKey,
                record.status,
                null,
                null,
                toMysqlDateTime(record.createdAt),
                toMysqlDateTime(new Date(Date.parse(record.createdAt) + 24 * 60 * 60 * 1000)),
                record.finalizedAt ? toMysqlDateTime(record.finalizedAt) : null,
            ]);
        });
    }
}
