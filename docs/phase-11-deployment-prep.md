# Phase 11 Deployment Preparation

This document turns Phase 11 into a concrete release-prep checklist for the current repo state.

## Release Candidate Scope

- Client web: `frontend`
- Client API: `backend`
- Admin web: `admin_frontend`
- Admin API: `admin_backend`
- Shared database schema owner: `backend/src/lib/schemaMigrations.ts`

Phase 7 to Phase 10 work is assumed to be present already:

- package proposal lifecycle
- admin package CRUD and publish flow
- client package selection
- invoice generation from selected packages
- admin/client document, event, message, billing, notification, and audit read paths

## Environment Matrix

Use these files as the checked-in source of truth:

- client API development: [backend/.env.example](/Users/vinay/Desktop/Global%20LMG%20Build%20v4.0/backend/.env.example:1)
- client API production: [backend/.env.production.example](/Users/vinay/Desktop/Global%20LMG%20Build%20v4.0/backend/.env.production.example:1)
- admin API development: [admin_backend/.env.example](/Users/vinay/Desktop/Global%20LMG%20Build%20v4.0/admin_backend/.env.example:1)
- admin API production: [admin_backend/.env.production.example](/Users/vinay/Desktop/Global%20LMG%20Build%20v4.0/admin_backend/.env.production.example:1)
- client web development: [frontend/.env.example](/Users/vinay/Desktop/Global%20LMG%20Build%20v4.0/frontend/.env.example:1)
- client web production: [frontend/.env.production.example](/Users/vinay/Desktop/Global%20LMG%20Build%20v4.0/frontend/.env.production.example:1)
- admin web development: [admin_frontend/.env.example](/Users/vinay/Desktop/Global%20LMG%20Build%20v4.0/admin_frontend/.env.example:1)
- admin web production: [admin_frontend/.env.production.example](/Users/vinay/Desktop/Global%20LMG%20Build%20v4.0/admin_frontend/.env.production.example:1)

Ignored local production scaffolds also exist for dry-run validation:

- [backend/.env.production](/Users/vinay/Desktop/Global%20LMG%20Build%20v4.0/backend/.env.production:1)
- [admin_backend/.env.production](/Users/vinay/Desktop/Global%20LMG%20Build%20v4.0/admin_backend/.env.production:1)
- [frontend/.env.production](/Users/vinay/Desktop/Global%20LMG%20Build%20v4.0/frontend/.env.production:1)
- [admin_frontend/.env.production](/Users/vinay/Desktop/Global%20LMG%20Build%20v4.0/admin_frontend/.env.production:1)

### Required secrets and infrastructure values

- `AUTH_SESSION_SECRET` for `backend`
- `AUTH_SESSION_SECRET` for `admin_backend`
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
- `DOCUMENT_STORAGE_ROOT` for `backend`
- provider credentials if production email, SMS, or Google auth are enabled

### Provider Delivery Modes

Provider credentials must live only in ignored local/deployment env files or hosting secret stores. Do not commit real keys.

Client API auth delivery:

- `EMAIL_PROVIDER_MODE=disabled|preview|resend`
- `EMAIL_FROM_ADDRESS`
- `RESEND_API_KEY`
- `SMS_PROVIDER_MODE=disabled|preview|twilio|twilio-verify`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID` when using `SMS_PROVIDER_MODE=twilio`
- `TWILIO_VERIFY_SERVICE_SID`

Admin API notification, reminder, and invoice delivery:

- `EMAIL_PROVIDER_MODE=disabled|preview|resend`
- `EMAIL_FROM_ADDRESS`
- `RESEND_API_KEY`
- `SMS_PROVIDER_MODE=disabled|preview|twilio`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`

When a provider mode is `disabled`, the platform must describe delivery as in-app, local, or manual. Resend/Twilio success is claimed only after the provider returns success; failures are stored as safe audit/reminder failure metadata without logging secrets.

## Recommended Domain and Routing Plan

Use separate web origins for client and admin, with each web app reverse-proxying its own API under `/api`.

- Client web origin: `https://app.globallmg.org`
- Client API path: `https://app.globallmg.org/api` -> `backend`
- Admin web origin: `https://admin.globallmg.org`
- Admin API path: `https://admin.globallmg.org/api` -> `admin_backend`

Why this is the safest release shape:

- client cookies stay first-party to the client app
- admin cookies stay first-party to the admin app
- the frontends can keep `VITE_API_BASE_URL=/api`
- CORS remains narrow and explicit through `PUBLIC_WEB_ORIGIN` and `PUBLIC_ADMIN_WEB_ORIGIN`

## Cookie and Session Strategy

Client auth is implemented in [backend/src/routes/auth.ts](/Users/vinay/Desktop/Global%20LMG%20Build%20v4.0/backend/src/routes/auth.ts:1).

- session cookie: `global_lmg_session`
- auth flow cookie: `global_lmg_auth_flow`
- csrf cookie: `global_lmg_csrf`
- cookies are `SameSite=Lax`
- session and flow cookies are `HttpOnly`
- `secure=true` outside development

Admin auth is implemented in [admin_backend/src/modules/auth/service.ts](/Users/vinay/Desktop/Global%20LMG%20Build%20v4.0/admin_backend/src/modules/auth/service.ts:1).

- session cookie: `global_lmg_admin_session`
- csrf cookie: `global_lmg_admin_csrf`
- cookies are `SameSite=Lax`
- admin session cookie is `HttpOnly`
- `secure=true` in production

Release rule:

- keep client and admin cookie names distinct
- do not serve admin and client UIs from the same origin
- prefer same-origin `/api` proxying per surface over cross-origin API calls

## MySQL and Migration Order

The normalized schema is owned by `backend`. `admin_backend` must never run its own divergent migrations.

Release order:

1. Back up the production MySQL database.
2. Build `backend` and `admin_backend`.
3. Run `backend` additive migrations once:
   - `cd backend`
   - `npm run migrate:prod`
4. Deploy `backend`.
5. Deploy `admin_backend`.
6. Deploy `frontend`.
7. Deploy `admin_frontend`.
8. Run deployment smoke checks before broader UAT.

Important note:

- `admin_backend` startup already enforces Phase 5 package schema readiness through [admin_backend/src/lib/schemaReadiness.ts](/Users/vinay/Desktop/Global%20LMG%20Build%20v4.0/admin_backend/src/lib/schemaReadiness.ts:1)

## Health Checks and Smoke Tests

Client API endpoints:

- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`

Admin API endpoints:

- `GET /api/v1/admin/health/live`
- `GET /api/v1/admin/health/ready`

Deployment smoke runner:

- `node scripts/deployment-smoke.mjs`

Production env validator:

- `node scripts/validate-production-env.mjs`

Full release dry run:

- `node scripts/release-dry-run.mjs`

Phase 10 read-path smoke runner remains useful after deployment too:

- `node scripts/phase10-smoke.mjs`

## Rollback Plan

This codebase is currently using additive schema changes for package lifecycle work. That means rollback should prefer rolling back code first, not trying to tear schema back out under pressure.

Rollback order:

1. Keep the pre-release database backup untouched.
2. If the issue is UI-only, roll back `frontend` and or `admin_frontend` first.
3. If the issue is API-only, roll back `backend` and or `admin_backend` to the last known good build.
4. Leave additive schema in place unless a migration caused data corruption and the rollback has been rehearsed.
5. Re-run deployment smoke after rollback.

Escalation rule:

- if a rollout bug affects invoice generation, package selection, refunds, or session stability, freeze further deploys until smoke checks pass again

## Release Checklist

- [ ] production env files populated for all four apps
- [ ] MySQL credentials verified from the deployment environment
- [ ] `backend` migrations applied successfully
- [ ] `backend` readiness returns `200`
- [ ] `admin_backend` readiness returns `200`
- [ ] client web root renders
- [ ] admin login renders
- [ ] deployment smoke script passes
- [ ] Phase 10 critical journey blockers reviewed
- [ ] rollback owner and DB backup location confirmed
- [ ] release candidate tag or commit recorded

## Open Deferred Scope

These routes remain intentionally deferred and should stay out of the production critical path until made real:

- admin `/requests`
- admin `/tasks`
- admin `/reports`
- admin `/settings`
