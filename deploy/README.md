# Global LMG Deployment Assets

These files are production samples only. Keep real `.env` files, service-account
keys, CA certificates, backups, and uploaded documents outside git.

## Files

- `pm2/ecosystem.config.cjs` starts the client API and admin API from built
  `dist/` output.
- `env/*.env.production.example` contains placeholder-only production env
  examples for the backend, admin backend, public frontend, and admin frontend.
- `nginx/public-frontend.conf` serves the public/client frontend SPA.
- `nginx/client-api.conf` proxies the client API and Razorpay payment webhook to
  `127.0.0.1:3001`.
- `nginx/admin-frontend.conf` serves the admin frontend SPA.
- `nginx/admin-api.conf` proxies the admin API and provider webhooks to
  `127.0.0.1:3005`.

See `docs/deployment-env.md` for the required production variables and provider
mode rules. The example files contain placeholders only; never copy real server
env files back into git.

See `docs/monitoring-runbook.md` and `docs/monitoring-live-verification.md`
for Sentry/UptimeRobot setup and current live verification status.

## Suggested Preflight

```bash
npm run validate:production-env -- \
  --backend-env /etc/global-lmg/backend.env \
  --admin-env /etc/global-lmg/admin_backend.env \
  --frontend-env /srv/global-lmg/current/frontend/.env.production \
  --admin-frontend-env /srv/global-lmg/current/admin_frontend/.env.production
```

Then build, migrate, start PM2, and run:

```bash
npm run smoke:deployment
```
