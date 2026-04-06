import { ADMIN_API_BASE_URL } from '../../config/runtime';

let csrfToken: string | null = null;

export interface ApiErrorPayload {
  error: string;
  issues?: unknown;
  message: string;
  requestId?: string;
}

export class ApiClientError extends Error {
  public readonly payload: ApiErrorPayload;
  public readonly status: number;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message || 'Request failed.');
    this.payload = payload;
    this.status = status;
  }
}

const isMutationMethod = (method: string) => !['GET', 'HEAD'].includes(method.toUpperCase());

export const setCsrfToken = (value: string | null) => {
  csrfToken = value;
};

export const getCsrfToken = () => csrfToken;

export const apiRequest = async <T>(
  path: string,
  options: {
    body?: unknown;
    headers?: HeadersInit;
    method?: string;
  } = {}
) => {
  const method = options.method || 'GET';
  const headers = new Headers(options.headers || {});
  const hasBody = options.body !== undefined;

  if (hasBody) {
    headers.set('Content-Type', 'application/json');
  }

  if (isMutationMethod(method) && csrfToken) {
    headers.set('x-csrf-token', csrfToken);
  }

  const response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
    body: hasBody ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
    headers,
    method,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? ((await response.json()) as unknown) : null;

  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      (payload as ApiErrorPayload | null) || {
        error: 'request_failed',
        message: `Request failed with status ${response.status}`,
      }
    );
  }

  return payload as T;
};

export const apiRawRequest = async <T>(
  path: string,
  options: {
    body?: BodyInit;
    headers?: HeadersInit;
    method?: string;
  } = {}
) => {
  const method = options.method || 'POST';
  const headers = new Headers(options.headers || {});

  if (isMutationMethod(method) && csrfToken) {
    headers.set('x-csrf-token', csrfToken);
  }

  const response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
    body: options.body,
    credentials: 'include',
    headers,
    method,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? ((await response.json()) as unknown) : null;

  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      (payload as ApiErrorPayload | null) || {
        error: 'request_failed',
        message: `Request failed with status ${response.status}`,
      }
    );
  }

  return payload as T;
};

export const apiDownload = async (path: string) => {
  const response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition') || '';
  const fileNameMatch = /filename="([^"]+)"/.exec(contentDisposition);

  return {
    blob,
    fileName: fileNameMatch?.[1] || 'download.bin',
    mimeType: response.headers.get('content-type') || blob.type || 'application/octet-stream',
  };
};

export const apiBinary = async (path: string) => {
  const response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Binary request failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition') || '';
  const fileNameMatch = /filename="([^"]+)"/.exec(contentDisposition);

  return {
    blob,
    fileName: fileNameMatch?.[1] || 'preview.bin',
    mimeType: response.headers.get('content-type') || blob.type || 'application/octet-stream',
  };
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');

const computeSha256 = async (file: File) => {
  const content = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', content);

  return {
    checksumSha256: toHex(digest),
    content,
  };
};

export const uploadAdminFiles = async (
  files: File[],
  options: {
    relatedEntityId?: string;
    relatedEntityType?: 'client-account' | 'invoice' | 'matter' | 'request' | 'thread';
    sourceModule: string;
  }
) => {
  const uploaded: Array<{
    fileName: string;
    uploadId: string;
  }> = [];

  for (const file of files) {
    const { checksumSha256, content } = await computeSha256(file);
    const intent = await apiRequest<{ uploadId: string }>(`/v1/admin/uploads/intents`, {
      body: {
        checksumSha256,
        mimeType: file.type || 'application/octet-stream',
        originalName: file.name,
        relatedEntityId: options.relatedEntityId,
        relatedEntityType: options.relatedEntityType,
        sizeBytes: file.size,
        sourceModule: options.sourceModule,
      },
      method: 'POST',
    });

    await apiRawRequest(`/v1/admin/uploads/${intent.uploadId}/content`, {
      body: content,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      method: 'PUT',
    });

    uploaded.push({
      fileName: file.name,
      uploadId: intent.uploadId,
    });
  }

  return uploaded;
};
