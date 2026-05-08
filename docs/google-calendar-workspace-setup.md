# Google Calendar and Meet Workspace Setup

Global LMG uses Google Workspace service-account domain-wide delegation for admin-owned meeting calendars. Clients do not connect Google; they receive Google Calendar invitations as attendees when the provider is enabled.

## Readiness Decision

- Final intended Workspace domain: `globallmg.org`.
- Admin organizer emails must use that domain, for example `name@globallmg.org`.
- If the purchased Workspace domain is different, update `GOOGLE_CALENDAR_IMPERSONATE_DOMAIN` before any live test.
- Live Google testing remains blocked until the Workspace tenant, service account, private key, and domain-wide delegation authorization are configured.

## Required Environment

Set these only in ignored deployment environment files or your hosting provider secret store:

```env
CALENDAR_SYNC_MODE=google
CALENDAR_ADMIN_AUTH_MODE=workspace_delegation
CALENDAR_CLIENT_INVITE_MODE=google_attendee
APP_SEND_EVENT_EMAIL=false
GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL=
GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_CALENDAR_SEND_UPDATES=all
GOOGLE_CALENDAR_DEFAULT_CALENDAR_ID=primary
GOOGLE_CALENDAR_IMPERSONATE_DOMAIN=globallmg.org
```

Keep `CALENDAR_SYNC_MODE=disabled` for local/manual mode.

Do not commit service-account JSON. If the private key is copied into an env value, preserve the newline escapes as supplied by Google, for example `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`.

## Google Workspace Setup

1. Buy or activate Google Workspace for the final Global LMG domain.
2. Create admin user accounts under the same domain that will own meetings in Google Calendar.
3. Create or choose a Google Cloud project owned by the Workspace organization.
4. Enable the Google Calendar API in that project.
5. Create a service account for Global LMG calendar sync.
6. Enable domain-wide delegation for that service account.
7. Copy the numeric service account client ID from Google Cloud.
8. In Google Workspace Admin Console, sign in as a super admin and open Security > Access and data control > API controls > Manage Domain Wide Delegation.
9. Add a new API client using the service account client ID and authorize this narrow Calendar scope:

```text
https://www.googleapis.com/auth/calendar.events
```

10. Verify the new client ID and scope appear in the Workspace Admin Console. Propagation can take time.
11. Set the service account email and private key in `admin_backend` env or hosting secrets.
12. Set `CALENDAR_SYNC_MODE=google` only after all required env values are present.
13. Restart `admin_backend`.
14. Create a disposable test event from the admin Meetings workspace.

## Runtime Behavior

- The database event is created, updated, or cancelled first.
- The admin backend impersonates the organizer admin email via Workspace delegation.
- The event is created on that admin's `primary` calendar unless `GOOGLE_CALENDAR_DEFAULT_CALENDAR_ID` is changed.
- For video meetings, Google Meet conference data is requested.
- The client primary email is added as a Google Calendar attendee when `CALENDAR_CLIENT_INVITE_MODE=google_attendee`.
- Google sends attendee update emails according to `GOOGLE_CALENDAR_SEND_UPDATES`.
- The app does not send a separate Resend event email unless `APP_SEND_EVENT_EMAIL=true` is intentionally configured later.
- If Google sync fails, the event remains in Global LMG with sync status `failed` and can be retried.

## Live Test Checklist

Use a disposable client and event.

1. Confirm `admin_backend` starts with `CALENDAR_SYNC_MODE=google`.
2. Create a video event from the admin Meetings workspace.
3. Confirm the event is saved in Global LMG.
4. Confirm the same event appears in the organizer admin's own Google Calendar.
5. Confirm Google returned a real Meet link and the app displays that link.
6. Confirm the disposable client's email is listed as a Google attendee.
7. Confirm the disposable client receives the Google Calendar invite email.
8. Update title/time/details in Global LMG and confirm the same Google event updates.
9. Cancel the event in Global LMG and confirm the same Google event is cancelled/deleted according to configured behavior.
10. Retry a failed sync from the admin UI and confirm it updates the same Google event rather than creating a duplicate.

## Official References

- Google Workspace Admin Help: domain-wide delegation setup and super admin requirements: https://support.google.com/a/answer/162106
- Google Calendar API docs: domain-wide access can impersonate a user account with service account domain-wide delegation: https://developers.google.com/workspace/calendar/api/concepts/domain
- Google Calendar Events insert docs: use `conferenceDataVersion=1` when requesting Google Meet conference data: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
