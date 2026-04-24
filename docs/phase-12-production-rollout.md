# Phase 12 Production Rollout

This is the operator playbook for the first production rollout of the four-app stack.

## Preconditions

Do not start rollout until all of these are true:

- [ ] `node scripts/validate-production-env.mjs` passes against the real `.env.production` files
- [ ] `node scripts/release-dry-run.mjs` passes from a deployment-capable environment
- [ ] production database backup location is confirmed
- [ ] last known good backend and frontend artifacts are identified for rollback
- [ ] a release owner is actively watching the rollout

## Rollout Order

1. Back up MySQL.
2. Run additive schema migrations from `backend`.
3. Deploy `backend`.
4. Verify client API live and ready health.
5. Deploy `admin_backend`.
6. Verify admin API live and ready health.
7. Deploy `frontend`.
8. Verify client web shell.
9. Deploy `admin_frontend`.
10. Verify admin login shell.
11. Run deployment smoke.
12. Run the package publish -> select -> invoice journey.

## Exact Command Sequence

### 1. Database backup

Use your platform-standard production backup command. Do not continue without a fresh snapshot.

### 2. Migrate the schema

```bash
cd backend
npm run build
npm run migrate:prod
```

### 3. Deploy the APIs

Deploy `backend` first, then `admin_backend`.

Immediately verify:

```bash
curl -i -sS https://app.globallmg.org/api/v1/health/live
curl -i -sS https://app.globallmg.org/api/v1/health/ready
curl -i -sS https://admin.globallmg.org/api/v1/admin/health/live
curl -i -sS https://admin.globallmg.org/api/v1/admin/health/ready
```

### 4. Deploy the web apps

Deploy `frontend`, then `admin_frontend`.

Immediately verify:

```bash
curl -I https://app.globallmg.org/
curl -I https://admin.globallmg.org/login
```

### 5. Run smoke checks

```bash
CLIENT_WEB_BASE=https://app.globallmg.org \
ADMIN_WEB_BASE=https://admin.globallmg.org \
CLIENT_API_BASE=https://app.globallmg.org/api/v1 \
ADMIN_API_BASE=https://admin.globallmg.org/api/v1/admin \
node scripts/deployment-smoke.mjs
```

### 6. Run the critical business flow

Validate this journey manually in production:

1. Admin signs in.
2. Admin opens a matter and publishes a proposal.
3. Client signs in and sees the published package.
4. Client selects the package.
5. Invoice appears in billing.
6. Matter operational status updates correctly.
7. Admin and client notifications appear.
8. Audit entries exist for the publish and selection actions.

## Monitoring Checklist

Watch closely for:

- API health readiness flipping away from `ok`
- slow MySQL queries or connection pool failures
- invoice creation failures
- package selection failures
- notification creation failures
- message/doc/event sync regressions
- upload/download errors from document storage
- auth session or CSRF failures

## Rollback Decision Points

Roll back immediately if any of these happen and cannot be corrected within the release window:

- client or admin login is broken
- package selection generates no invoice or corrupt billing state
- migrations fail partway through
- readiness endpoints stay degraded after deploy
- notifications or audit writes fail for core admin mutations

## Rollback Order

1. Roll back `admin_frontend` if the issue is admin UI only.
2. Roll back `frontend` if the issue is client UI only.
3. Roll back `admin_backend` if the issue is admin API only.
4. Roll back `backend` if the issue affects client API, auth, dashboard, package selection, or invoice generation.
5. Only consider database restore if data integrity is affected and the restore path has been approved for that incident.

## Completion Criteria

The rollout is complete when:

- deployment smoke passes on production
- the package publish -> select -> invoice loop passes
- readiness stays green for both APIs
- there are no unresolved blocker-severity issues
