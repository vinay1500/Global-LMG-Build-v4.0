# Production Environment Variables

Last updated: 2026-05-07

This guide lists the production environment contract for Global LMG. Use it with:

```bash
npm run validate:production-env -- \
  --backend-env /etc/global-lmg/backend.env \
  --admin-env /etc/global-lmg/admin_backend.env \
  --frontend-env /srv/global-lmg/current/frontend/.env.production \
  --admin-frontend-env /srv/global-lmg/current/admin_frontend/.env.production
```

The validator does not print secret values. Keep real env files outside Git.

## Safe Examples

Placeholder-only production examples live in:

- `deploy/env/backend.env.production.example`
- `deploy/env/admin_backend.env.production.example`
- `deploy/env/frontend.env.production.example`
- `deploy/env/admin_frontend.env.production.example`

Copy these to your server-only env location and replace placeholders there. Do not copy real values back into the repository.

## Secret Generation

Generate separate secrets for `backend` and `admin_backend`:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Do not reuse the same `AUTH_SESSION_SECRET` between the client API and admin API.

## Backend Required Values

`backend` is the client/public API.

Required core values:

- `APP_ENV=production`
- `PORT=3001`
- `PUBLIC_WEB_ORIGIN=https://app.globallmg.org` or the actual deployed client/public web origin
- `AUTH_SESSION_SECRET=<strong unique secret>`
- `SESSION_COOKIE_NAME=global_lmg_session`
- `CSRF_COOKIE_NAME=global_lmg_csrf`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_SSL_MODE=REQUIRED`
- `MYSQL_SSL_CA_PATH=/etc/global-lmg/aiven-ca.pem` or `MYSQL_SSL_CA=<pem content>`

Provider values:

- `EMAIL_PROVIDER_MODE=disabled|resend`
- If `resend`: `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`
- `SMS_PROVIDER_MODE=disabled|twilio|twilio-verify`
- If `twilio-verify`: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`
- If `twilio`: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`

Observability:

- `SENTRY_DSN=<client-api-project-dsn>`
- `SENTRY_ENVIRONMENT=production`
- `SENTRY_RELEASE=<git-sha-or-release-version>`
- `SENTRY_TRACES_SAMPLE_RATE=0.05`

Google client auth:

- Use `GOOGLE_AUTH_MODE=disabled` unless Google sign-in is fully configured.
- Use `GOOGLE_AUTH_MODE=google-jwt` only with `GOOGLE_CLIENT_ID` on the backend and matching `VITE_GOOGLE_CLIENT_ID` on the frontend.
- Do not use preview or tokeninfo-style modes in production.

Address and pricing country:

- `VITE_ADDRESS_AUTOCOMPLETE_MODE=disabled|google`
- `VITE_GOOGLE_MAPS_API_KEY=<browser-restricted-google-maps-key>` when frontend address autocomplete is enabled.
- `ADDRESS_VALIDATION_MODE=disabled|google`
- `GOOGLE_MAPS_API_KEY` or `GOOGLE_ADDRESS_VALIDATION_API_KEY` when server-side Google Address Validation is enabled.
- `IP_GEOLOCATION_MODE=disabled|cloudflare|provider|maxmind|manual`
- `IP_GEOLOCATION_PROVIDER_API_KEY` is reserved for a configured geolocation provider.
- `DEFAULT_PRICING_COUNTRY=US`
- `DEFAULT_PRICING_CURRENCY=USD`
- `FX_PROVIDER_MODE=api`
- `FX_BASE_CURRENCY=USD`
- `FX_DEFAULT_FALLBACK_POLICY=fail_closed|use_base_currency`
- `FX_PROVIDER_URL_TEMPLATE=<optional custom URL template>`

Exchange rates are automatic only. By default the APIs use the fawazahmed0
exchange-api package endpoints through jsDelivr with the Cloudflare Pages
mirror as fallback; set `FX_PROVIDER_URL_TEMPLATE` only when routing through an
approved internal mirror.

Online payments:

- `PAYMENT_PROVIDER_MODE=disabled|razorpay`
- If `razorpay`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_CAPTURE_MODE=auto|manual`
- The frontend receives only the Razorpay key id and order id returned by the client API. Keep key secret and webhook secret in the backend env only.
- Razorpay webhooks should point to the client API route: `/api/v1/webhooks/razorpay`.

Pricing country priority is explicit request country, saved primary billing address,
IP country fallback, phone country, then platform default. Store only country/source
for IP geolocation; do not store raw geolocation payloads.

Active pricing and billing are USD-only. Exact country overrides are still
available, but they must also be USD amounts. Historical FX metadata remains in
the schema for already-created snapshots and future audit flexibility, but
client quotes, invoices, invoice PDFs, email totals, and Razorpay orders use the
frozen USD amount. Razorpay remains authoritative for payment capture.

Storage/scanning:

- Production multi-host deployments should use `OBJECT_STORAGE_DRIVER=s3` and `DOCUMENT_STORAGE_DRIVER=s3`.
- S3 mode requires `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
- Malware scanning should use `FILE_SCAN_MODE=clamav`, `CLAMAV_HOST`, and `CLAMAV_PORT`.

## Admin Backend Required Values

`admin_backend` is the admin API.

Required core values:

- `APP_ENV=production`
- `PORT=3005`
- `PUBLIC_ADMIN_WEB_ORIGIN=https://admin.globallmg.org`
- `AUTH_SESSION_SECRET=<strong unique admin secret>`
- `SESSION_COOKIE_NAME=global_lmg_admin_session`
- `CSRF_COOKIE_NAME=global_lmg_admin_csrf`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_SSL_MODE=REQUIRED`
- `MYSQL_SSL_CA_PATH=/etc/global-lmg/aiven-ca.pem` or `MYSQL_SSL_CA=<pem content>`

Provider values:

- `EMAIL_PROVIDER_MODE=disabled|resend`
- If `resend`: `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`
- `SMS_PROVIDER_MODE=disabled|twilio|twilio-verify`
- If `twilio`: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`
- `WEBHOOK_PUBLIC_BASE_URL=https://admin-api.globallmg.org` when provider webhooks are enabled
- `RESEND_WEBHOOK_SECRET` when Resend webhooks are configured
- `TWILIO_WEBHOOK_AUTH_TOKEN` when Twilio status webhooks are configured

Observability:

- `SENTRY_DSN=<admin-api-project-dsn>`
- `SENTRY_ENVIRONMENT=production`
- `SENTRY_RELEASE=<git-sha-or-release-version>`
- `SENTRY_TRACES_SAMPLE_RATE=0.05`

Calendar:

- `CALENDAR_SYNC_MODE=disabled|google`
- If `google`, set:
  - `CALENDAR_ADMIN_AUTH_MODE=workspace_delegation`
  - `CALENDAR_CLIENT_INVITE_MODE=google_attendee`
  - `GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL`
  - `GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY`
  - `GOOGLE_CALENDAR_SEND_UPDATES=all`
  - `GOOGLE_CALENDAR_IMPERSONATE_DOMAIN=globallmg.org`

Bootstrap:

- `ADMIN_BOOTSTRAP_ENABLED=false` after the first production admin is created.
- Keep bootstrap passwords only in ignored server env files when temporarily needed.

## Frontend Required Values

Public/client frontend:

- `VITE_PUBLIC_SITE_URL=https://app.globallmg.org` or the actual public/client web origin
- `VITE_API_BASE_URL=/api` when Nginx proxies `/api` to the backend
- `VITE_GOOGLE_CLIENT_ID` only when backend `GOOGLE_AUTH_MODE=google-jwt`
- `VITE_SENTRY_DSN=<public-frontend-project-dsn>`
- `VITE_SENTRY_ENVIRONMENT=production`
- `VITE_SENTRY_RELEASE=<git-sha-or-release-version>`
- `VITE_SENTRY_TRACES_SAMPLE_RATE=0.05`

Admin frontend:

- `VITE_API_BASE_URL=/api` when Nginx proxies `/api` to the admin backend
- `VITE_SENTRY_DSN=<admin-frontend-project-dsn>`
- `VITE_SENTRY_ENVIRONMENT=production`
- `VITE_SENTRY_RELEASE=<git-sha-or-release-version>`
- `VITE_SENTRY_TRACES_SAMPLE_RATE=0.05`

## Current Validator Behavior

The validator fails for:

- non-production `APP_ENV`
- weak or placeholder-like `AUTH_SESSION_SECRET`
- non-HTTPS web origins
- missing DB SSL
- malformed Sentry DSNs
- preview email/SMS modes
- invalid `GOOGLE_AUTH_MODE`
- missing required provider variables when a provider/payment mode is enabled

The validator warns, but does not fail by default, for:

- disabled email/SMS/Google Calendar/Razorpay providers
- local document storage
- disabled file scanning
- disabled Google client auth
- missing Sentry DSNs

Use `--strict-providers` for a stricter pre-launch gate.
