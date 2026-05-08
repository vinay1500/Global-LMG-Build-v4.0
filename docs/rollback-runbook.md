# Rollback Runbook

Last updated: 2026-05-07

This runbook covers production rollback for the Global LMG public frontend, client API, admin frontend, and admin API. It assumes a Linux host using PM2 for Node services, Nginx for reverse proxy/static assets, and additive database migrations.

## Goals

- Restore the last known-good application release quickly.
- Preserve production data.
- Avoid improvising destructive database changes during an incident.
- Keep rollback commands repeatable and auditable.

## Release Directory Layout

Use immutable release directories and a `current` symlink:

```text
/srv/global-lmg/
  releases/
    20260507-101500-a1b2c3d/
      backend/
      admin_backend/
      frontend/
      admin_frontend/
      deploy/
      package.json
    20260507-121000-d4e5f6a/
      ...
  current -> /srv/global-lmg/releases/20260507-121000-d4e5f6a
  shared/
    logs/
    uploads/               # only if local storage is intentionally used
    backups/               # encrypted, access-restricted, never committed
```

Environment files should live outside release directories, for example:

```text
/etc/global-lmg/backend.env
/etc/global-lmg/admin_backend.env
/etc/global-lmg/frontend.env
/etc/global-lmg/admin_frontend.env
```

Do not store production secrets inside Git, release artifacts, deployment logs, or runbooks.

## PM2 Process Names

The sample deployment assets use these logical processes:

```text
global-lmg-client-api
global-lmg-admin-api
```

Frontend apps are usually served as static Vite builds through Nginx. If a deployment serves frontend apps through Node instead, include those process names in the PM2 ecosystem file and rollback commands.

## Normal Release Flow

1. Build a new immutable release directory.
2. Install production dependencies inside the release.
3. Run production environment validation.
4. Run database migrations.
5. Point `current` at the new release.
6. Reload PM2 services.
7. Reload Nginx if config changed.
8. Run deployment smoke checks.

Example:

```bash
cd /srv/global-lmg/releases/20260507-121000-d4e5f6a
node scripts/validate-production-env.mjs
cd backend && npm run migrate
cd /srv/global-lmg
ln -sfn /srv/global-lmg/releases/20260507-121000-d4e5f6a current
pm2 reload global-lmg-client-api --update-env
pm2 reload global-lmg-admin-api --update-env
nginx -t && systemctl reload nginx
cd current && node scripts/deployment-smoke.mjs
```

## Rollback Decision

Rollback is appropriate when a new release causes:

- Failed health checks after deployment.
- Login/session/auth regressions.
- Broken critical workflows such as request submission, document access, billing, or admin settings.
- Elevated 5xx rate caused by application code.
- Bad frontend bundle or route failure.

Rollback is usually not the first fix for:

- Aiven outage.
- Provider outage such as Resend, Twilio, Google Calendar, or object storage.
- Wrong environment variable value that can be corrected safely.
- Traffic spike that needs scaling or rate-limit tuning.

## Fast Code Rollback

1. Identify the current and previous release:

```bash
readlink -f /srv/global-lmg/current
ls -1dt /srv/global-lmg/releases/*
```

2. Point `current` to the previous known-good release:

```bash
ln -sfn /srv/global-lmg/releases/20260507-101500-a1b2c3d /srv/global-lmg/current
```

3. Reload PM2 processes:

```bash
pm2 reload global-lmg-client-api --update-env
pm2 reload global-lmg-admin-api --update-env
pm2 save
```

4. Reload Nginx if static paths or config changed:

```bash
nginx -t
systemctl reload nginx
```

5. Run smoke checks:

```bash
cd /srv/global-lmg/current
node scripts/deployment-smoke.mjs
curl -fsS https://api.globallmg.com/api/v1/health/ready
curl -fsS https://admin-api.globallmg.com/api/v1/admin/health/ready
```

6. Verify PM2 state:

```bash
pm2 status
pm2 logs global-lmg-client-api --lines 100
pm2 logs global-lmg-admin-api --lines 100
```

## Database Migration Policy

Production migrations must be additive and immutable:

- Never edit an already-applied migration.
- Add new migrations for new schema changes.
- Prefer adding nullable columns, new tables, new indexes, and compatibility views.
- Do not drop columns or tables in the same release that stops using them.
- Do not rename columns in place during a hot release.
- Keep old code able to run against the migrated schema whenever practical.

This policy makes code rollback safe: the previous release should continue running even after the new additive migration has applied.

## Database Rollback Rules

During an incident, do not run destructive database rollback commands without approval from the incident commander and a fresh backup.

Use this order:

1. Roll back application code first.
2. Stop or throttle writes if data corruption is suspected.
3. Take a fresh backup or Aiven snapshot.
4. Restore to a test service and inspect data.
5. Decide whether production restore/PITR is required.

If a migration introduced a bad additive column or index, leave it in place until a planned cleanup migration. If a migration corrupted data, follow `docs/aiven-backup-restore.md` for PITR/restore.

## Frontend Rollback

If frontend assets are served from release directories through Nginx, the symlink rollback restores the previous bundle automatically.

After rollback, verify:

- Public home page loads.
- Client login/signup page loads.
- Admin login page loads.
- Admin route refresh does not white-screen.
- Static assets return 200 and are not mixed between releases.

Recommended checks:

```bash
curl -I https://globallmg.com/
curl -I https://admin.globallmg.com/
```

## Post-Rollback Verification

Run this checklist before declaring the incident mitigated:

- Public frontend returns 200.
- Client API ready health returns 200.
- Admin frontend returns 200.
- Admin API ready health returns 200.
- Client login works for a disposable account.
- Admin login works for an authorized account.
- Client dashboard loads.
- Admin dashboard loads.
- Request submission page loads.
- Billing list loads.
- Documents list loads.
- PM2 logs show no repeating boot errors.
- Nginx error log is quiet.
- Sentry error rate returns to baseline.

## Communication Template

Use plain status updates:

```text
Status: Mitigating
Impact: Admin/client workflow instability after release <release-id>.
Action: Rolling back application code to previous known-good release <release-id>.
Data: No destructive database action is being taken.
Next update: 15 minutes.
```

After rollback:

```text
Status: Mitigated
Impact: Service restored after rollback to <release-id>.
Data: No production data loss observed.
Follow-up: Root cause analysis and corrected release before redeploy.
```

## Post-Incident Follow-Up

Record:

- Incident start/end time.
- Bad release ID.
- Restored release ID.
- Customer/admin impact.
- Whether database writes were paused.
- Whether any provider was involved.
- Exact commands run.
- Smoke check result.
- Root cause.
- Prevention item before next release.

Keep this record in the incident tracker or release notes, not in a file containing secrets.
