# Monitoring Live Verification

Last run: 2026-05-07

Scope: Sentry and UptimeRobot readiness for Global LMG production/staging. Local
ignored env files and `credentials` were inspected only for the presence of
monitoring variables. No secrets were printed and no real env files were changed.

## Result

| Area | Status | Notes |
| --- | --- | --- |
| Sentry client API | App wiring added, live event blocked | `SENTRY_DSN` was not present locally, so no live Sentry event could be sent. |
| Sentry admin API | App wiring added, live event blocked | `SENTRY_DSN` was not present locally, so no live Sentry event could be sent. |
| Sentry public frontend | App wiring added, live event blocked | `VITE_SENTRY_DSN` was not present locally. Frontend events require rebuild with the DSN. |
| Sentry admin frontend | App wiring added, live event blocked | `VITE_SENTRY_DSN` was not present locally. Frontend events require rebuild with the DSN. |
| UptimeRobot monitors | Blocked | `UPTIMEROBOT_API_KEY` and alert contact IDs were not present locally. Monitors were not created by API. |
| Alert delivery | Blocked | Alert contacts must be verified in UptimeRobot and Sentry dashboards. |

## App-Side Changes Verified

- Backend Sentry SDKs are disabled unless `SENTRY_DSN` is configured.
- Frontend Sentry SDKs are disabled unless `VITE_SENTRY_DSN` is configured.
- Sentry events scrub cookies, authorization headers, CSRF/session tokens,
  provider keys, request bodies, uploaded/document fields, attachments, and
  payload/content fields.
- Backend smoke scripts are available:
  - `npm --prefix backend run smoke:sentry`
  - `npm --prefix admin_backend run smoke:sentry`
  - `npm run smoke:sentry`

## Required External Setup

Sentry:

1. Create projects:
   - `global-lmg-client-api`
   - `global-lmg-admin-api`
   - `global-lmg-frontend`
   - `global-lmg-admin-frontend`
2. Add the matching DSN to production env:
   - APIs: `SENTRY_DSN`
   - Frontends: `VITE_SENTRY_DSN`
3. Set release variables to the deployed git SHA or release tag.
4. Deploy/restart APIs and rebuild/redeploy frontends.
5. Run `npm run smoke:sentry` and confirm both backend events in Sentry.
6. Open public/admin frontends and confirm frontend project activity.
7. Inspect one event and confirm sensitive fields are filtered.

UptimeRobot:

1. Create monitors for:
   - `https://www.globallmg.org/`
   - `https://api.globallmg.org/api/v1/health/live`
   - `https://api.globallmg.org/api/v1/health/ready`
   - `https://admin.globallmg.org/login`
   - `https://admin-api.globallmg.org/api/v1/admin/health/live`
   - `https://admin-api.globallmg.org/api/v1/admin/health/ready`
2. Attach operations, engineering, and business escalation contacts.
3. Send test alerts to every contact.
4. Confirm all monitors remain green for at least 10 minutes.

## Commands Run

```bash
node -e "<secret-safe monitoring env presence check>"
npm install @sentry/node
npm install @sentry/react
npm run smoke:sentry
cd backend && npm run build
cd admin_backend && npm run build
cd frontend && npm run build
cd admin_frontend && npm run build
```

`npm run smoke:sentry` result:

- `global-lmg-api`: skipped because `SENTRY_DSN` is not configured.
- `global-lmg-admin-api`: skipped because `SENTRY_DSN` is not configured.

Build result:

- `backend`: passed.
- `admin_backend`: passed.
- `frontend`: passed.
- `admin_frontend`: passed.

## Current Blockers

1. Sentry projects/DSNs are not available locally.
2. UptimeRobot API key and alert contact IDs are not available locally.
3. Live alert delivery cannot be confirmed until dashboard contacts are configured.
