import { createHash } from 'node:crypto';
import path from 'node:path';
import { env } from '../../config/env.js';
import { nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { createPublicId } from '../../lib/ids.js';
import { badRequest, conflict, forbidden, notFound, serviceUnavailable, } from '../../lib/httpErrors.js';
import { getMysqlPool } from '../../lib/mysql.js';
import { selectOne, withTransaction } from '../../lib/mysqlUtils.js';
import { logEvent } from '../../lib/observability.js';
import { allocateBusinessNumber } from '../platform/sequences.js';
import { LocalDocumentStorage } from './localDocumentStorage.js';
import { MysqlStoredUploadRepository } from './mysqlStoredUploadRepository.js';
const CHECKSUM_PATTERN = /^[a-f0-9]{64}$/i;
const MIME_TYPE_PATTERN = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/;
const isMysqlConfigured = Boolean(env.MYSQL_HOST && env.MYSQL_DATABASE && env.MYSQL_USER && env.MYSQL_PASSWORD);
const resolveDocumentRoot = () => path.isAbsolute(env.DOCUMENT_STORAGE_ROOT)
    ? env.DOCUMENT_STORAGE_ROOT
    : path.resolve(process.cwd(), env.DOCUMENT_STORAGE_ROOT);
const storageDriver = new LocalDocumentStorage(resolveDocumentRoot());
let repositoryPromise = null;
let initializationPromise = null;
const serializeError = (error) => error instanceof Error
    ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
    }
    : error;
const getRepository = async () => {
    if (!repositoryPromise) {
        repositoryPromise = (async () => {
            if (!isMysqlConfigured) {
                return null;
            }
            const repository = new MysqlStoredUploadRepository(getMysqlPool());
            await repository.initialize();
            return repository;
        })().catch((error) => {
            repositoryPromise = null;
            throw error;
        });
    }
    return repositoryPromise;
};
const ensureStorageReady = async () => {
    if (!initializationPromise) {
        initializationPromise = (async () => {
            if (env.DOCUMENT_STORAGE_DRIVER === 'disabled') {
                return;
            }
            await storageDriver.ensureReady();
            await getRepository();
        })().catch((error) => {
            initializationPromise = null;
            throw error;
        });
    }
    await initializationPromise;
};
const requireRepository = async () => {
    const repository = await getRepository();
    if (!repository) {
        throw serviceUnavailable('document_storage_unavailable', 'Document storage requires a configured MySQL connection.');
    }
    return repository;
};
const requireUploadEnabled = async () => {
    if (env.DOCUMENT_STORAGE_DRIVER === 'disabled') {
        throw serviceUnavailable('document_storage_disabled', 'Document storage is disabled in this environment.');
    }
    await ensureStorageReady();
};
const normalizeMimeType = (mimeType) => mimeType.trim().toLowerCase();
const validateIntentInput = (input) => {
    if (input.sizeBytes <= 0 || input.sizeBytes > env.DOCUMENT_UPLOAD_MAX_BYTES) {
        throw badRequest('upload_size_invalid', `Uploads must be between 1 byte and ${env.DOCUMENT_UPLOAD_MAX_BYTES} bytes.`);
    }
    if (!CHECKSUM_PATTERN.test(input.checksumSha256)) {
        throw badRequest('upload_checksum_invalid', 'checksumSha256 must be a valid 64-character SHA-256 hex digest.');
    }
    if (!MIME_TYPE_PATTERN.test(normalizeMimeType(input.mimeType))) {
        throw badRequest('upload_mime_invalid', 'mimeType must be a valid MIME type.');
    }
};
const buildRecord = (id, input) => ({
    checksumSha256: input.checksumSha256.toLowerCase(),
    createdAt: nowUtc(),
    id,
    mimeType: normalizeMimeType(input.mimeType),
    originalName: input.originalName.trim(),
    ownerAccountId: input.ownerAccountId,
    relatedEntityId: input.relatedEntityId,
    relatedEntityType: input.relatedEntityType,
    sizeBytes: input.sizeBytes,
    sourceModule: input.sourceModule.trim(),
    status: 'pending',
    storageDriver: input.storageDriver,
    storageKey: input.storageKey,
});
const computeSha256 = (content) => createHash('sha256').update(content).digest('hex');
const toFileExtension = (fileName) => {
    const extension = path.extname(fileName).replace('.', '').trim().toLowerCase();
    return extension || 'bin';
};
const resolveOwnerContext = async (connection, ownerPublicId) => selectOne(connection, `SELECT
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
     LIMIT 1`, [ownerPublicId]);
const resolveAdminOwnerContext = async (connection, ownerPublicId, relatedEntityType, relatedEntityId) => {
    const ownerUser = await selectOne(connection, 'SELECT id FROM users WHERE public_id = ? LIMIT 1', [ownerPublicId]);
    if (!ownerUser?.id || !relatedEntityType || !relatedEntityId) {
        return null;
    }
    if (relatedEntityType === 'thread') {
        const thread = await selectOne(connection, 'SELECT client_account_id FROM conversation_threads WHERE public_id = ? LIMIT 1', [relatedEntityId]);
        if (thread?.client_account_id) {
            return {
                client_account_id: Number(thread.client_account_id),
                user_id: Number(ownerUser.id),
            };
        }
    }
    if (relatedEntityType === 'matter') {
        const matter = await selectOne(connection, 'SELECT client_account_id FROM matters WHERE public_id = ? LIMIT 1', [relatedEntityId]);
        if (matter?.client_account_id) {
            return {
                client_account_id: Number(matter.client_account_id),
                user_id: Number(ownerUser.id),
            };
        }
    }
    if (relatedEntityType === 'invoice') {
        const invoice = await selectOne(connection, 'SELECT client_account_id FROM invoices WHERE public_id = ? LIMIT 1', [relatedEntityId]);
        if (invoice?.client_account_id) {
            return {
                client_account_id: Number(invoice.client_account_id),
                user_id: Number(ownerUser.id),
            };
        }
    }
    if (relatedEntityType === 'client-account') {
        const clientAccount = await selectOne(connection, 'SELECT id FROM client_accounts WHERE public_id = ? LIMIT 1', [relatedEntityId]);
        if (clientAccount?.id) {
            return {
                client_account_id: Number(clientAccount.id),
                user_id: Number(ownerUser.id),
            };
        }
    }
    return null;
};
const linkStoredDocument = async (connection, input) => {
    if (!input.relatedEntityId || !input.relatedEntityType) {
        return;
    }
    const createdAt = toMysqlDateTime(nowUtc());
    if (input.relatedEntityType === 'request') {
        const requestRow = await selectOne(connection, 'SELECT id FROM service_requests WHERE public_id = ? LIMIT 1', [input.relatedEntityId]);
        if (requestRow?.id) {
            await connection.execute(`INSERT INTO request_documents (
          service_request_id, document_id, link_role_code, created_at
        ) VALUES (?, ?, ?, ?)`, [Number(requestRow.id), input.documentId, 'attachment', createdAt]);
        }
        return;
    }
    if (input.relatedEntityType === 'matter') {
        const matterRow = await selectOne(connection, 'SELECT id FROM matters WHERE public_id = ? LIMIT 1', [input.relatedEntityId]);
        if (matterRow?.id) {
            await connection.execute(`INSERT INTO matter_documents (
          matter_id, document_id, link_role_code, created_at
        ) VALUES (?, ?, ?, ?)`, [Number(matterRow.id), input.documentId, 'attachment', createdAt]);
        }
        return;
    }
    if (input.relatedEntityType === 'invoice') {
        const invoiceRow = await selectOne(connection, 'SELECT id FROM invoices WHERE public_id = ? LIMIT 1', [input.relatedEntityId]);
        if (invoiceRow?.id) {
            await connection.execute(`INSERT INTO invoice_documents (
          invoice_id, document_id, link_role_code, created_at
        ) VALUES (?, ?, ?, ?)`, [Number(invoiceRow.id), input.documentId, 'attachment', createdAt]);
        }
        return;
    }
    if (input.relatedEntityType === 'client-account') {
        const clientRow = await selectOne(connection, 'SELECT id FROM client_accounts WHERE public_id = ? LIMIT 1', [input.relatedEntityId]);
        if (clientRow?.id) {
            await connection.execute(`UPDATE documents
         SET owner_client_account_id = ?
         WHERE id = ?`, [Number(clientRow.id), input.documentId]);
        }
    }
};
export const documentStorageService = {
    async initialize() {
        await requireUploadEnabled();
    },
    async createUploadIntent(ownerAccountId, input) {
        await requireUploadEnabled();
        const uploadId = createPublicId();
        const storageKey = storageDriver.buildStorageKey(ownerAccountId, uploadId, input.originalName);
        const repository = await requireRepository();
        const record = buildRecord(uploadId, {
            ...input,
            ownerAccountId,
            storageDriver: 'local',
            storageKey,
        });
        validateIntentInput(record);
        await repository.save(record);
        return {
            maxSizeBytes: env.DOCUMENT_UPLOAD_MAX_BYTES,
            upload: record,
            uploadId: record.id,
            uploadUrl: `/api/v1/uploads/${record.id}/content`,
        };
    },
    async storeUploadContent(ownerAccountId, uploadId, content) {
        await requireUploadEnabled();
        const repository = await requireRepository();
        const record = await repository.getById(uploadId);
        if (!record) {
            throw notFound('upload_not_found', 'Upload record not found.');
        }
        if (record.ownerAccountId !== ownerAccountId) {
            throw forbidden('upload_forbidden', 'You do not have access to this upload.');
        }
        if (record.status !== 'pending') {
            throw conflict('upload_already_completed', 'This upload has already been completed.');
        }
        if (content.length !== record.sizeBytes) {
            throw badRequest('upload_size_mismatch', 'Uploaded file size does not match the declared size.');
        }
        const checksum = computeSha256(content);
        if (checksum !== record.checksumSha256) {
            throw badRequest('upload_checksum_mismatch', 'Uploaded file checksum does not match the declared checksum.');
        }
        await storageDriver.writeBuffer(record.storageKey, content);
        const finalizedAt = nowUtc();
        await withTransaction(getMysqlPool(), async (connection) => {
            const ownerContext = (await resolveOwnerContext(connection, ownerAccountId)) ||
                (await resolveAdminOwnerContext(connection, ownerAccountId, record.relatedEntityType, record.relatedEntityId));
            if (!ownerContext?.user_id || !ownerContext?.client_account_id) {
                throw notFound('upload_owner_not_found', 'Upload owner could not be resolved.');
            }
            const documentNumber = await allocateBusinessNumber(connection, 'document', 'DOC');
            const [documentInsert] = await connection.execute(`INSERT INTO documents (
          public_id, document_number, owner_client_account_id, title, category_code,
          visibility_scope_code, current_version_no, created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                createPublicId(),
                documentNumber,
                Number(ownerContext.client_account_id),
                record.originalName,
                'attachment',
                'client',
                1,
                Number(ownerContext.user_id),
                toMysqlDateTime(record.createdAt),
                toMysqlDateTime(finalizedAt),
            ]);
            const documentId = Number(documentInsert.insertId);
            const [versionInsert] = await connection.execute(`INSERT INTO document_versions (
          public_id, document_id, version_no, storage_driver_code, storage_path, original_file_name,
          mime_type, file_extension, file_size_bytes, checksum_sha256, virus_scan_status_code,
          uploaded_by_user_id, uploaded_at, is_current, retention_hold_flag
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                createPublicId(),
                documentId,
                1,
                record.storageDriver,
                record.storageKey,
                record.originalName,
                record.mimeType,
                toFileExtension(record.originalName),
                record.sizeBytes,
                record.checksumSha256,
                'pending',
                Number(ownerContext.user_id),
                toMysqlDateTime(finalizedAt),
                1,
                0,
            ]);
            const documentVersionId = Number(versionInsert.insertId);
            await linkStoredDocument(connection, {
                documentId,
                relatedEntityId: record.relatedEntityId,
                relatedEntityType: record.relatedEntityType,
            });
            await connection.execute(`UPDATE document_upload_intents
         SET status_code = ?, document_id = ?, document_version_id = ?, stored_at = ?
         WHERE public_id = ?`, ['stored', documentId, documentVersionId, toMysqlDateTime(finalizedAt), record.id]);
        });
        const updatedRecord = {
            ...record,
            finalizedAt,
            status: 'stored',
        };
        await repository.save(updatedRecord);
        logEvent('info', 'document.upload_stored', {
            ownerAccountId,
            sizeBytes: updatedRecord.sizeBytes,
            storageKey: updatedRecord.storageKey,
            uploadId: updatedRecord.id,
        });
        return updatedRecord;
    },
    async getDownloadFile(ownerAccountId, uploadId) {
        await requireUploadEnabled();
        const repository = await requireRepository();
        const record = await repository.getById(uploadId);
        if (!record) {
            throw notFound('upload_not_found', 'Upload record not found.');
        }
        if (record.ownerAccountId !== ownerAccountId) {
            throw forbidden('upload_forbidden', 'You do not have access to this upload.');
        }
        if (record.status !== 'stored' && record.status !== 'attached') {
            throw conflict('upload_not_ready', 'The requested upload is not ready for download.');
        }
        return {
            absolutePath: storageDriver.getAbsolutePath(record.storageKey),
            upload: record,
        };
    },
    async getClientDocumentDownload(userPublicId, clientAccountId, documentPublicId, options = {}) {
        await requireUploadEnabled();
        return withTransaction(getMysqlPool(), async (connection) => {
            const userRow = await selectOne(connection, 'SELECT id FROM users WHERE public_id = ? LIMIT 1', [userPublicId]);
            if (!userRow?.id) {
                throw notFound('document_downloader_not_found', 'Current user could not be resolved.');
            }
            const documentRow = await selectOne(connection, `SELECT
           d.id AS document_id,
           dv.id AS document_version_id,
           dv.storage_path,
           dv.mime_type,
           dv.original_file_name
         FROM documents d
         INNER JOIN document_versions dv
           ON dv.document_id = d.id
           AND dv.is_current = 1
         WHERE d.public_id = ?
           AND d.owner_client_account_id = ?
           AND d.archived_at IS NULL
           AND d.visibility_scope_code IN ('client', 'shared')
         LIMIT 1`, [documentPublicId, clientAccountId]);
            if (!documentRow?.document_id) {
                throw notFound('document_not_found', 'Document could not be found.');
            }
            await connection.execute(`INSERT INTO document_download_logs (
          document_id, document_version_id, downloaded_by_user_id, ip_address, user_agent, downloaded_at
        ) VALUES (?, ?, ?, ?, ?, ?)`, [
                Number(documentRow.document_id),
                Number(documentRow.document_version_id),
                Number(userRow.id),
                options.ipAddress || null,
                options.userAgent || null,
                toMysqlDateTime(nowUtc()),
            ]);
            return {
                absolutePath: storageDriver.getAbsolutePath(documentRow.storage_path),
                mimeType: documentRow.mime_type,
                originalName: documentRow.original_file_name,
            };
        });
    },
    async getAdminDocumentDownload(adminUserPublicId, documentPublicId, options = {}) {
        await requireUploadEnabled();
        return withTransaction(getMysqlPool(), async (connection) => {
            const userRow = await selectOne(connection, 'SELECT id FROM users WHERE public_id = ? LIMIT 1', [adminUserPublicId]);
            if (!userRow?.id) {
                throw notFound('document_downloader_not_found', 'Current user could not be resolved.');
            }
            const documentRow = await selectOne(connection, `SELECT
           d.id AS document_id,
           dv.id AS document_version_id,
           dv.storage_path,
           dv.mime_type,
           dv.original_file_name
         FROM documents d
         INNER JOIN document_versions dv
           ON dv.document_id = d.id
           AND dv.is_current = 1
         WHERE d.public_id = ?
           AND d.archived_at IS NULL
         LIMIT 1`, [documentPublicId]);
            if (!documentRow?.document_id) {
                throw notFound('document_not_found', 'Document could not be found.');
            }
            await connection.execute(`INSERT INTO document_download_logs (
          document_id, document_version_id, downloaded_by_user_id, ip_address, user_agent, downloaded_at
        ) VALUES (?, ?, ?, ?, ?, ?)`, [
                Number(documentRow.document_id),
                Number(documentRow.document_version_id),
                Number(userRow.id),
                options.ipAddress || null,
                options.userAgent || null,
                toMysqlDateTime(nowUtc()),
            ]);
            return {
                absolutePath: storageDriver.getAbsolutePath(documentRow.storage_path),
                mimeType: documentRow.mime_type,
                originalName: documentRow.original_file_name,
            };
        });
    },
    async onStartup() {
        if (env.DOCUMENT_STORAGE_DRIVER === 'disabled') {
            return;
        }
        try {
            await ensureStorageReady();
        }
        catch (error) {
            logEvent('error', 'document.storage_initialization_failed', {
                error: serializeError(error),
                rootDirectory: resolveDocumentRoot(),
            });
            throw error;
        }
    },
};
