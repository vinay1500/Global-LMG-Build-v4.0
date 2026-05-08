# Provider Live Test Results

Last run: 2026-05-07T15:15:54Z

Scope: secret-safe staging/provider readiness check for Resend, Twilio, Google Calendar/Meet, and ClamAV. Credentials were read only from local env files and were not printed. No provider credentials, CA files, backups, uploads, or env files were changed.

## Summary

| Provider | Result | Notes |
| --- | --- | --- |
| Resend | Live workflow send passed with DNS follow-up | Resend API was reachable and the configured sender domain exists in Resend. Live admin invoice email, event reminder email, and admin password reset email were accepted by Resend using disposable records. Domain status is `partially_failed` because one MX record is failing; finish DNS verification before production. |
| Twilio | Live workflow send passed | Twilio account API and Verify service were reachable from both env contexts. `TWILIO_FROM_NUMBER` and `PROVIDER_TEST_PHONE` are E.164-formatted. Verify OTP passed, and an admin reminder SMS was sent through the reminder processor using a disposable event reminder. |
| Google Calendar/Meet | Blocked | Google Workspace setup docs were verified/expanded. Live Google testing remains blocked until Workspace domain-wide delegation env is configured in `admin_backend/.env`. No event was created, updated, or cancelled in Google. |
| ClamAV | Blocked by missing local scanner | ClamAV env was prepared for `127.0.0.1:3310` and a portable Docker Compose service plus TCP smoke script were added. Docker is not installed on this machine, and the scanner port currently returns connection refused, so clean/EICAR upload verification remains blocked. |
| Provider webhooks | Passed smoke | Local signed-payload smoke test passed for Resend and Twilio webhook signature verification/storage logic. |

## Environment Readiness

`backend/.env`:

- `EMAIL_PROVIDER_MODE=resend`: configured
- Resend API key/from address: configured
- Resend webhook secret: not configured
- `SMS_PROVIDER_MODE=twilio-verify`: configured
- Twilio account/auth/Verify service: configured
- Twilio from number: configured
- Provider test email: configured
- Provider test phone: configured and E.164-formatted
- Google Calendar mode/service account: not configured
- ClamAV mode/host/port: configured for local TCP scanner, but scanner service is not reachable

`admin_backend/.env`:

- Admin bootstrap email: configured
- `EMAIL_PROVIDER_MODE=resend`: configured
- Resend API key/from address: configured
- Resend webhook secret: not configured
- `SMS_PROVIDER_MODE=twilio`: configured
- Twilio account/auth/Verify service: configured
- Twilio outbound from number: configured
- Provider test email: configured
- Provider test phone: configured and E.164-formatted
- Google Calendar mode/service account: not configured
- ClamAV mode/host/port: configured for local TCP scanner, but scanner service is not reachable

## Test Matrix

| Test | Result | Evidence / Blocker |
| --- | --- | --- |
| Resend domain verification | Needs DNS follow-up | Sender domain `mail.globallmg.org` exists in Resend and API lookup passed. Current domain status is `partially_failed`: DKIM TXT verified, sending MX/TXT verified, but the `mail` MX record is failing. Update DNS in Resend dashboard/provider DNS and re-run verification. |
| Backend simple Resend test email | Passed | Resend accepted the backend test email to `PROVIDER_TEST_EMAIL`. Delivery attempt id: `69fbc410...b4dd`. |
| Admin backend simple Resend test email | Passed | Resend accepted the admin backend test email to `PROVIDER_TEST_EMAIL`. Delivery attempt id: `5cda48e1...d03a`. |
| Send test invoice email | Passed | Disposable invoice was created and sent through the admin billing `sendInvoice` workflow. `emailDeliveryStatus=sent`; one invoice email audit event was recorded; delivery attempt id: `37c89a0e...a5e4`. |
| Send reminder email | Passed | Disposable due event reminder was processed through `processDueReminders`. Email reminder status became `sent`; delivery attempt id: `85a70eee...a5e1`. |
| Send admin password reset email | Passed | A disposable admin alias was created from the disposable recipient, reset email was accepted by Resend, audit status was `sent`, reset confirmation flow was verified with a controlled disposable token, and the disposable admin was archived. Delivery attempt id: `6caa1a37...5585`. Inbox receipt still needs manual confirmation by checking the disposable recipient mailbox. |
| Send Twilio OTP | Passed | Twilio Verify accepted the OTP request to `PROVIDER_TEST_PHONE`. Verification status: `pending`. Delivery attempt id: `VEd82685...60ba`. |
| Send Twilio SMS reminder | Passed | Twilio accepted the admin SMS reminder test to `PROVIDER_TEST_PHONE`. Message status: `queued`. Delivery attempt id: `SMce0d4a...a9a7`. |
| Reminder SMS workflow | Passed | Disposable due event reminder was processed through `processDueReminders`. SMS reminder status became `sent`; delivery attempt id: `SMda542f...5158`. |
| Google setup readiness | Prepared | `docs/google-calendar-workspace-setup.md` now lists final intended domain, admin-email requirement, Workspace domain-wide delegation steps, env checklist, and live test checklist. |
| Google create event | Blocked | `CALENDAR_SYNC_MODE=google` and Google Workspace delegation env vars are not configured. |
| Google attendee invite | Blocked | Same Google configuration blocker. No client attendee invite was sent. |
| Google update event | Blocked | Same Google configuration blocker. |
| Google cancel event | Blocked | Same Google configuration blocker. |
| ClamAV TCP scanner reachability | Blocked | `npm run smoke:clamav` attempted clean/EICAR INSTREAM scans against `127.0.0.1:3310`; both failed with `ECONNREFUSED` because no ClamAV daemon is running. |
| ClamAV clean file scan | Blocked | Scanner service is not reachable. Clean upload was not attempted. |
| ClamAV EICAR infected block | Blocked | Scanner service is not reachable. No EICAR upload was attempted. |
| Resend webhook signature smoke | Passed local smoke | `npm run smoke:webhook-signatures` passed in `admin_backend`. Live webhook receipt was not tested because no public local webhook URL is configured and `RESEND_WEBHOOK_SECRET` is missing from local env. |
| Twilio webhook signature smoke | Passed | `npm run smoke:webhook-signatures` passed in `admin_backend`. |

## Commands Run

```bash
node -e "<secret-safe provider env readiness check>"
npm run smoke:webhook-signatures
node -e "<secret-safe Resend domain API check>"
node -e "<secret-safe Resend domain DNS-record status check>"
node -e "<secret-safe Resend backend/admin_backend readiness check>"
node -e "<secret-safe Resend simple email send check>"
node -e "<secret-safe Twilio account and Verify API check>"
node -e "<secret-safe Twilio OTP and SMS reminder live send check>"
npx tsx src/scripts/providerWorkflowLiveTest.ts
npx tsx -e "<secret-safe disposable admin password reset live test>"
command -v clamscan
npm run smoke:clamav
cd backend && npm run build
cd admin_backend && npm run build
cd admin_frontend && npm run build
cd frontend && npm run build
```

The Resend checks used live provider APIs and sent simple test emails plus workflow invoice/reminder/admin password reset emails to disposable recipients. The Twilio checks used live provider APIs and sent one Verify OTP plus reminder SMS tests to `PROVIDER_TEST_PHONE`.

## Required Fixes Before Full Live Provider Pass

1. Finish Resend DNS verification for `mail.globallmg.org`:
   - In Resend, open Domains → `mail.globallmg.org`.
   - Copy the currently failing `mail` MX record exactly as shown.
   - Add or correct that MX record in the DNS host.
   - Keep the verified DKIM TXT, `send.mail` MX, and `send.mail` TXT records unchanged.
   - Add or confirm a DMARC TXT policy for the parent domain if the DNS host does not already have one.
   - Wait for DNS propagation and click Verify again in Resend.

2. Configure Resend webhook delivery tracking before full production webhook validation:
   - Set `RESEND_WEBHOOK_SECRET` in `admin_backend`.
   - Configure a public HTTPS webhook URL in Resend, for example `/api/v1/webhooks/resend`.
   - Send a disposable email and confirm an `email_events` row from the real Resend webhook.

3. Configure Google Workspace delegation for `admin_backend` before Google live tests:
   - `CALENDAR_SYNC_MODE=google`
   - `CALENDAR_ADMIN_AUTH_MODE=workspace_delegation`
   - `GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY`
   - `GOOGLE_CALENDAR_SEND_UPDATES=all`
   - optional domain/default calendar vars from `docs/google-calendar-workspace-setup.md`

4. Start ClamAV before scan live tests:
   - Docker is currently unavailable on this machine.
   - When Docker is available, run `docker compose -f docker-compose.clamav.yml up -d`.
   - Then run `npm run smoke:clamav`.
   - See `docs/clamav-deployment.md`.

## Next Live Test Run

After the blockers are resolved, rerun this checklist:

1. Re-run Resend domain verification after correcting the failing MX record.
2. Create a disposable invoice for a disposable client and trigger admin invoice email.
3. Create a disposable event/reminder and trigger reminder email/SMS.
4. Request admin password reset for a disposable admin or controlled admin test account.
5. Trigger client OTP to `PROVIDER_TEST_PHONE`.
6. Create/update/cancel a disposable Google meeting and confirm the admin calendar event plus client attendee invite.
7. Upload a clean text/PDF file and confirm scan status is clean.
8. Upload EICAR in a controlled test environment and confirm infected preview/download block.
