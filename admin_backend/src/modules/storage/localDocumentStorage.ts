import { promises as fs } from 'node:fs';
import path from 'node:path';

const sanitizeFilename = (value: string) => {
  const basename = path.basename(value).trim();
  const sanitized = basename
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');

  return sanitized || 'upload.bin';
};

export class LocalDocumentStorage {
  public constructor(private readonly rootDirectory: string) {}

  private resolvePath(storageKey: string) {
    const resolved = path.resolve(this.rootDirectory, storageKey);
    const normalizedRoot = path.resolve(this.rootDirectory) + path.sep;

    if (!resolved.startsWith(normalizedRoot)) {
      throw new Error('Storage key resolved outside of the configured document root.');
    }

    return resolved;
  }

  public buildStorageKey(ownerAccountId: string, uploadId: string, originalName: string) {
    const safeOwner = ownerAccountId.replace(/[^A-Za-z0-9_-]+/g, '-');
    const safeDate = new Date().toISOString().slice(0, 10);
    const safeFilename = sanitizeFilename(originalName);
    return path.posix.join(safeOwner, safeDate, `${uploadId}-${safeFilename}`);
  }

  public async ensureReady() {
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
