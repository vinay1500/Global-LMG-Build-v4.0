# Provider Message Catalog

Last audited: 2026-05-08

Scope: automatic client/admin email and SMS delivery paths in `backend` and `admin_backend`. Secrets, API keys, webhook secrets, and real recipient addresses are intentionally omitted.

## Provider Behavior Summary

| Area | Provider code path | Modes | External send behavior |
| --- | --- | --- | --- |
| Client auth email | `backend/src/modules/auth/providers/email.ts` | `EMAIL_PROVIDER_MODE=disabled|preview|resend` | `resend` sends through Resend. `preview` returns a delivery hint only. `disabled` throws service unavailable. |
| Client auth SMS | `backend/src/modules/auth/providers/sms.ts` | `SMS_PROVIDER_MODE=disabled|preview|twilio|twilio-verify` | `twilio-verify` uses Twilio Verify. `twilio` sends a custom SMS body. `preview` returns a delivery hint only. `disabled` throws service unavailable. |
| Admin email | `admin_backend/src/modules/providers/email.ts` | `EMAIL_PROVIDER_MODE=disabled|preview|resend` | `resend` sends through Resend. `preview` returns `status=preview`. `disabled` returns `status=disabled`. |
| Admin SMS | `admin_backend/src/modules/providers/sms.ts` | `SMS_PROVIDER_MODE=disabled|preview|twilio|twilio-verify` | Admin reminder SMS uses Twilio Messages when outbound sender config exists. `preview` returns `status=preview`. `disabled` returns `status=disabled`. |

## Generic Client Notification Pipeline

`admin_backend/src/modules/writeSupport.ts#createClientNotifications` creates portal notifications and can optionally dispatch email/SMS.

Default behavior:

- Portal notification is enabled by default for active notification types.
- Email and SMS are disabled by default unless enabled in `notification_delivery_settings`.
- User preferences are respected:
  - `email_updates`
  - `sms_alerts`
  - `in_app_alerts`
  - `invoice_reminders`
  - `case_activity_alerts`
- If an active notification template is attached, subject/body are rendered from `admin_templates`.
- If no template is attached, the caller-provided title/body below are used.

Template variables available to generic notification templates:

- `actionUrl`
- `clientName`
- `documentType`
- `dueDate`
- `invoiceNumber`
- `matterTitle`
- `platformName`
- `totalAmount`

Generic email subject:

```text
{notification title}
```

Generic email body:

```text
{notification body}
```

Generic SMS body:

```text
{notification title}
{notification body}
```

Generic SMS body is truncated before dispatch.

Generic delivery audit:

- Email: `notification.email_sent`, `notification.email_previewed`, `notification.email_suppressed`, or `notification.email_failed`
- SMS: `notification.sms_sent`, `notification.sms_previewed`, `notification.sms_suppressed`, or `notification.sms_failed`
- If the generic email is for `invoice_generated` and has a related invoice id, audit action is `invoice.email_{status}`.

## Direct Email Paths

| Path | Trigger | Provider | Recipient | Subject | Body text/template | Variables | Attachment | Mode behavior | Audit/security event |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Client email verification | Client signup, unverified login, resend email verification, client account email change | Client auth email provider | Client account email or new email being verified | `Global LMG verification code` | `Use this code to verify your Global LMG account.\n\nCode: {code}\n\nThis code will expire shortly. If you did not request this, please ignore this email.` | `code` | No | `resend` sends. `preview` exposes delivery hint to UI. `disabled` blocks flow with service unavailable. | Account email change writes audit `client.email_change_requested`. Signup/sign-in/resend store auth flow/token state; no `audit_events` row found for those auth-only verification sends. |
| Client password reset | `POST /api/v1/auth/password-reset/request` and resend reset | Client auth email provider | Client account email, when account exists and can authenticate | `Global LMG password reset code` | `Use this code to reset your Global LMG password.\n\nCode: {code}\n\nThis code will expire shortly. If you did not request this, please ignore this email.` | `code` | No | Unknown email receives the same generic response. `resend` sends only for a valid account. `preview` exposes delivery hint only. `disabled` results in no usable email send. | Security events: `client.password_reset_requested`, `client.password_reset_completed`. |
| Admin password reset | Admin forgot-password request | Admin email provider | Admin user email, when account exists and has password auth | `Global LMG admin password reset` | `Hello {displayName},\n\nUse this code to reset your Global LMG admin password:\n{code}\n\nReset link: {resetUrl}\n\nThis code expires in {ttlMinutes} minutes.\nIf you did not request this reset, ignore this email and contact an ops admin.` | `displayName`, `code`, `resetUrl`, `ttlMinutes` | No | `resend` sends asynchronously. `preview`/`disabled` do not send externally and are audited as preview/disabled. Unknown identifier gets generic response. | Audit: `admin.password_reset_requested`, `admin.password_reset_completed`. Security events with same event types are also written. |
| Invoice email | Admin Billing & Ledger “send invoice” / “send reminder” | Admin email provider | Invoice billing email snapshot | `{invoice template snapshot subject}` | `{invoice template snapshot body}\n\n{invoice template snapshot terms}\n\n{invoice template snapshot footer}` | Depends on invoice template rendering snapshot. | No PDF attachment in current code path. | If `EMAIL_PROVIDER_MODE !== resend`, email is skipped as manual mode and audited. If billing email missing, delivery fails and is audited. Portal invoice notification is still created separately with external delivery suppressed. | Delivery audit: `invoice.email_sent`, `invoice.email_failed`, or `invoice.email_skipped_manual_mode`. Invoice action audit: `invoice.issued` or `invoice.reminder_sent`. |
| Reminder email | Reminder processor or manual retry for due `event_reminders` with `channel_code=email` | Admin email provider | Reminder recipient user email | Default: `Reminder: {eventTitle}`. If a notification template is attached for `event_reminder`, rendered template subject is used. | Default: `{eventTitle} is scheduled for {scheduledStartAt}.` If a notification template is attached for `event_reminder`, rendered template body is used. | Default variables: `eventTitle`, `scheduledStartAt`. Template variables: `actionUrl`, `clientName`, `matterTitle`, `platformName`. | No | `resend` sends. `preview` records preview. `disabled` records disabled/failed state depending dispatch path. Missing recipient email fails. | Audit: `reminder.processed` on success, failure state recorded on `event_reminders`; provider code/reference stored in audit changes. |

## Generic Notification Triggers

These triggers call `createClientNotifications`. They always create a portal notification if the notification type and user preference allow it. They send email/SMS only if the admin has enabled that channel for the notification type and the user preference allows the channel.

| Trigger | Notification type | Default title | Default body |
| --- | --- | --- | --- |
| Request approved | `matter_update` | `Request approved` | Admin note, or `Your request has been reviewed by the Global LMG operations team. We will confirm the next step shortly.` |
| Request converted | `matter_update` | `Matter created` or `Request converted` | Admin note, or `Your request is now linked to matter {matterNumber} in your Global LMG dashboard.` |
| Request declined | `matter_update` | `Request declined` | Admin note, or `We are unable to proceed with this request through the Global LMG platform at this time.` |
| More request information needed | `matter_update` | `More information requested` | Admin note entered for the request. |
| New admin message thread | `message_received` | `New message from Global LMG` | First 240 characters of admin message content. |
| Admin message reply visible to client | `message_received` | `New message from Global LMG` | First 240 characters of admin message content. |
| Event created and client-visible | `event_reminder` | `{event title}` | `A new event has been scheduled for {date} at {time}.` |
| Event updated and client-visible | `event_reminder` | `{event title}` | `Event updated for {date} at {time}.` |
| Event cancelled and client-visible | `event_reminder` | `{event title} cancelled` | `The scheduled event was cancelled.` or `The scheduled event was cancelled. Reason: {reason}` |
| Payment recorded | `payment_reminder` | `Payment recorded` | `Payment of {amount} has been recorded against invoice {invoiceNumber}.` |
| Invoice fully paid after payment | `payment_reminder` | `Invoice paid` | `Invoice {invoiceNumber} is now marked paid.` |
| Refund issued | `payment_reminder` | `Refund issued` | `A refund of {amount} has been initiated against your payment.` |
| Admin document uploaded as client-visible | `document_uploaded` | `Document shared to your portal` | `A document has been shared for {matterTitle}.` |
| Admin uploads new version of shared document | `document_uploaded` | `Document updated` | `A new version of a shared document is available in your portal.` |
| Admin changes document visibility to client-visible | `document_uploaded` | `Document shared to your portal` | `A document has been reviewed and shared to your portal.` |
| Admin creates client-visible matter | `matter_update` | `Matter workspace created` | `A new Global LMG matter workspace is available in your client portal.` |
| Matter stage update visible to client | `matter_update` | `Matter stage updated` | Admin change note, or `Your matter has moved to the next lifecycle stage.`, or `Your matter status has been updated.` |
| Matter update note visible to client | `matter_update` | Admin-provided title | Admin-provided body text. |
| Matter status update visible to client | `matter_update` | `Matter status updated` | `Your matter status has been updated in your Global LMG dashboard.` |
| Package proposal published | `proposal` | `Service proposal ready` | Admin note, or `A service proposal is ready for review in your dashboard.` |
| Package selection updated with replacement invoice | `invoice_generated` | `Updated package invoice issued` | `A replacement invoice {invoiceNumber} has been issued for your updated service package.` |
| Package selection updated | `proposal` | `Package selection updated` | `Your selected service package has been updated by the Global LMG operations team.` |

## Direct SMS Paths

| Path | Trigger | Provider | Recipient | SMS body/template | Variables | Mode behavior | Audit/security event |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Client phone verification | Client signup/sign-in phone challenge, resend phone code, client account phone change | Client auth SMS provider | Client phone or new phone being verified | In `SMS_PROVIDER_MODE=twilio`: `Global LMG verification code: {code}. This code expires shortly. If you did not request this, please ignore it.` In `twilio-verify`, body is controlled by the Twilio Verify service template. | `code` for `twilio`; Twilio Verify manages the code in `twilio-verify`. | `twilio-verify` creates a Verify challenge; `twilio` sends custom message; `preview` returns delivery hint only; `disabled` blocks flow. | Account phone change writes `client.phone_change_requested`. Auth verification flows store token/flow state; no separate `audit_events` row found for auth-only phone verification sends. |
| Reminder SMS | Reminder processor or manual retry for due `event_reminders` with `channel_code=sms` | Admin SMS provider | Reminder recipient user phone | Default: `Reminder: {eventTitle}\n{eventTitle} is scheduled for {scheduledStartAt}.` If a notification template is attached for `event_reminder`, rendered subject/body are used. | `eventTitle`, `scheduledStartAt`; template variables listed above. | `twilio` sends through Messages API; `preview` records preview; `disabled` records disabled/failed state; missing phone fails. | Audit: `reminder.processed` on success, failure state recorded on `event_reminders`; provider code/reference stored in audit changes. |
| Generic notification SMS | Any generic notification trigger above when SMS channel is enabled | Admin SMS provider | Client portal users attached to the client account | `{notification title}\n{notification body}` | Depends on trigger/template. | `twilio` sends; `preview` records preview; `disabled` suppresses; missing phone fails. | Audit: `notification.sms_sent`, `notification.sms_previewed`, `notification.sms_suppressed`, or `notification.sms_failed`. |

## Event And Meeting Email Behavior

Meeting/event creation has two possible client-facing delivery paths:

1. Portal notification through `createClientNotifications`.
   - Event create/update/cancel calls use notification type `event_reminder`.
   - Email/SMS is sent only if that notification type has email/SMS enabled and the client preference allows it.

2. Google Calendar attendee invite.
   - If `CALENDAR_SYNC_MODE=google`, Google Calendar is configured, `CALENDAR_CLIENT_INVITE_MODE=google_attendee`, and the client has an email, the Google Calendar event body includes the client as an attendee.
   - Google sends attendee invite/update/cancel email according to `GOOGLE_CALENDAR_SEND_UPDATES`.
   - The app does not send a separate custom meeting email through Resend for Google meetings.

Google calendar event description:

```text
{event.notes}

Matter: {matterTitle}

Client: {clientName}

Global LMG coordination/support event. Global LMG is not a law firm and does not provide direct legal advice.
```

For video events, Google Meet conference data is requested and the resulting join URL is saved to the event.

Calendar audit events:

- `event.calendar_sync_requested`
- `event.calendar_sync_retried`
- `event.calendar_sync_failed`
- `event.google_attendee_invited`
- `event.google_attendee_invite_failed`

## Invoice Behavior Clarification

When Billing & Ledger sends an invoice:

- The invoice email is sent directly by `sendInvoiceEmailIfConfigured`.
- Subject/body/terms/footer come from the frozen invoice template snapshot.
- The PDF is not attached in the current code path.
- A portal invoice notification is also created:
  - Initial send title: `Invoice ready for payment`
  - Initial send body: `Invoice {invoiceNumber} has been issued for {amount}.`
  - Reminder title: `Payment reminder`
  - Reminder body: `Reminder: invoice {invoiceNumber} for {amount} is still outstanding.`
- That portal notification explicitly uses `suppressExternalDelivery: true`, so it does not send another email/SMS.

## Webhook Delivery Tracking

Webhook handlers store provider delivery events, not message content:

- Resend: `POST /api/v1/webhooks/resend` verifies the Resend signature and stores delivery status in `email_events`.
- Twilio: `POST /api/v1/webhooks/twilio/status` verifies `X-Twilio-Signature` and stores delivery status in `sms_events`.

Invalid webhook signatures are rejected.

## Known Gaps / Manual Checks

- Invoice PDFs are generated/downloadable, but invoice email does not attach the PDF in the current sender path.
- Client auth verification sends do not currently write per-send `audit_events`; they persist auth/token state, and password reset writes `security_events`.
- Generic notification email/SMS text can be changed by active admin notification templates. Review active `admin_templates` and `notification_delivery_settings` in production before launch.
- Google attendee email text is controlled by Google Calendar, not by the app.
