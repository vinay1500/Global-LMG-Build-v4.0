export type StoredUploadStatus = 'pending' | 'stored' | 'attached' | 'failed';
export type StorageDriver = 'local';

export interface StoredUploadRecord {
  checksumSha256: string;
  createdAt: string;
  finalizedAt?: string;
  id: string;
  mimeType: string;
  originalName: string;
  ownerAccountId: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  sizeBytes: number;
  sourceModule: string;
  status: StoredUploadStatus;
  storageDriver: StorageDriver;
  storageKey: string;
}

export interface CreateStoredUploadInput {
  checksumSha256: string;
  mimeType: string;
  originalName: string;
  ownerAccountId: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  sizeBytes: number;
  sourceModule: string;
  storageDriver: StorageDriver;
  storageKey: string;
}

export interface StoredUploadRepository {
  getById: (id: string) => Promise<StoredUploadRecord | undefined>;
  initialize: () => Promise<void>;
  save: (record: StoredUploadRecord) => Promise<void>;
}
