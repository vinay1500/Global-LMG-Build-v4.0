# S3-Compatible Object Storage

Global LMG supports local document storage for development and S3-compatible object storage for staging/production.

## Environment

Use local storage for development:

```env
OBJECT_STORAGE_DRIVER=local
DOCUMENT_STORAGE_DRIVER=local
DOCUMENT_STORAGE_ROOT=../storage/glmg-uploads
```

Use S3-compatible storage for scalable deployments:

```env
OBJECT_STORAGE_DRIVER=s3
DOCUMENT_STORAGE_DRIVER=s3
S3_ENDPOINT=https://example-object-storage-endpoint
S3_REGION=auto
S3_BUCKET=global-lmg-documents
S3_ACCESS_KEY_ID=replace-with-access-key
S3_SECRET_ACCESS_KEY=replace-with-secret-key
S3_SESSION_TOKEN=
S3_VERIFY_UPLOAD_SHA256=true
```

Set these values in both `backend/.env` and `admin_backend/.env` when both apps need to upload, preview, or download documents.

Do not commit real access keys. Keep `.env` files ignored.

## Provider Notes

Hostinger Object Storage:

- Create a private bucket for documents.
- Use the endpoint, region, bucket, access key, and secret key from Hostinger.
- Keep the bucket private. The app serves files only after authentication and authorization.

Backblaze B2:

- Create an S3-compatible application key scoped to the document bucket.
- Use the S3 endpoint for the bucket region, for example `https://s3.us-west-004.backblazeb2.com`.
- Use the B2 region in `S3_REGION` if provided by B2.

Cloudflare R2:

- Create an R2 bucket and an API token with object read/write access to that bucket.
- Use the account endpoint, for example `https://<account-id>.r2.cloudflarestorage.com`.
- `S3_REGION=auto` is valid for R2.

## Behavior

- Upload content is still SHA-256 checked against the client-declared checksum before storage.
- With `S3_VERIFY_UPLOAD_SHA256=true`, the app reads the object back after upload and verifies the stored bytes.
- Preview/download stays authenticated through backend routes; no public object URLs are exposed.
- Audit events and document download logs continue to be written before file bytes are returned.
- Local storage remains the default, so development does not require object storage.

## Manual Test

1. Configure S3 variables in both backend env files.
2. Restart `backend` and `admin_backend`.
3. Upload a small disposable PDF as an admin document.
4. Preview the document in admin.
5. Download the document in admin.
6. If the document is client-visible, preview/download it from the client dashboard.
7. Confirm `document_versions.storage_driver_code = 's3'`.
8. Confirm recent `audit_events` and `document_download_logs` were written.

Return to local development by setting:

```env
OBJECT_STORAGE_DRIVER=local
DOCUMENT_STORAGE_DRIVER=local
```
