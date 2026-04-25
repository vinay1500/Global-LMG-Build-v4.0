import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { badRequest } from '../../lib/httpErrors.js';
import { env } from '../../config/env.js';

const SAFE_PREVIEW_MIME_TYPES = new Set([
  'application/pdf',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'text/plain',
]);

const UPLOAD_ALLOWED_MIME_TYPES = new Set([
  ...SAFE_PREVIEW_MIME_TYPES,
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
]);

const UPLOAD_ALLOWED_EXTENSIONS = new Set([
  'csv',
  'doc',
  'docx',
  'gif',
  'jpg',
  'jpeg',
  'pdf',
  'png',
  'txt',
  'webp',
  'xls',
  'xlsx',
  'zip',
]);

const sanitizeFilename = (value: string) => {
  const basename = path.basename(value).trim();
  const sanitized = basename
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');

  return sanitized || 'upload.bin';
};

const normalizeMimeType = (mimeType: string) => mimeType.trim().toLowerCase();

export const getFileExtension = (fileName: string) =>
  path.extname(fileName).replace('.', '').trim().toLowerCase() || 'bin';

export const computeSha256 = (content: Buffer) => createHash('sha256').update(content).digest('hex');

export const isSafePreviewMimeType = (mimeType: string) =>
  SAFE_PREVIEW_MIME_TYPES.has(normalizeMimeType(mimeType));

export const assertSupportedDocumentUpload = (input: {
  contentLength: number;
  fileName: string;
  mimeType: string;
  sha256: string;
}) => {
  const mimeType = normalizeMimeType(input.mimeType);
  const extension = getFileExtension(input.fileName);

  if (input.contentLength <= 0 || input.contentLength > env.DOCUMENT_UPLOAD_MAX_BYTES) {
    throw badRequest(
      'upload_size_invalid',
      `Uploads must be between 1 byte and ${env.DOCUMENT_UPLOAD_MAX_BYTES} bytes.`
    );
  }

  if (!UPLOAD_ALLOWED_MIME_TYPES.has(mimeType) || !UPLOAD_ALLOWED_EXTENSIONS.has(extension)) {
    throw badRequest(
      'upload_type_not_allowed',
      'This file type is not supported for secure document upload.'
    );
  }

  if (!/^[a-f0-9]{64}$/i.test(input.sha256)) {
    throw badRequest('upload_checksum_invalid', 'checksumSha256 must be a valid SHA-256 digest.');
  }
};

export class LocalDocumentStorage {
  public constructor(private readonly rootDirectory: string) {}

  private assertEnabled() {
    if (env.DOCUMENT_STORAGE_DRIVER === 'disabled') {
      throw badRequest('document_storage_disabled', 'Document storage is disabled.');
    }
  }

  private resolvePath(storageKey: string) {
    this.assertEnabled();
    const resolved = path.resolve(this.rootDirectory, storageKey);
    const normalizedRoot = path.resolve(this.rootDirectory) + path.sep;

    if (!resolved.startsWith(normalizedRoot)) {
      throw new Error('Storage key resolved outside of the configured document root.');
    }

    return resolved;
  }

  public buildStorageKey(ownerAccountPublicId: string, documentPublicId: string, fileName: string) {
    const safeOwner = ownerAccountPublicId.replace(/[^A-Za-z0-9_-]+/g, '-');
    const safeDate = new Date().toISOString().slice(0, 10);
    return path.posix.join(safeOwner, safeDate, `${documentPublicId}-${sanitizeFilename(fileName)}`);
  }

  public async ensureReady() {
    this.assertEnabled();
    await fs.mkdir(this.rootDirectory, { recursive: true });
  }

  public getAbsolutePath(storageKey: string) {
    return this.resolvePath(storageKey);
  }

  public async writeBuffer(storageKey: string, content: Buffer) {
    const absolutePath = this.resolvePath(storageKey);
    const directory = path.dirname(absolutePath);
    const tempPath = `${absolutePath}.tmp`;

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(tempPath, content, { mode: 0o600 });
    await fs.rename(tempPath, absolutePath);

    return absolutePath;
  }
}

export const getDocumentStorage = () => {
  const rootDirectory = path.isAbsolute(env.DOCUMENT_STORAGE_ROOT)
    ? env.DOCUMENT_STORAGE_ROOT
    : path.resolve(process.cwd(), env.DOCUMENT_STORAGE_ROOT);

  return new LocalDocumentStorage(rootDirectory);
};
