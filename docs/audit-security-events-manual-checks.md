# Audit and Security Event Manual Checks

Use this checklist after deploying the backend and admin backend. Do not paste secrets into logs or tickets.

## Audit Metadata

1. Sign in as an admin and perform a safe disposable mutation, such as updating a test setting.
2. Sign in as a client and perform a safe disposable mutation, such as updating notification preferences.
3. Confirm recent audit rows include request metadata:

```sql
SELECT action_code, request_correlation_id, ip_address, user_agent, occurred_at
FROM audit_events
ORDER BY occurred_at DESC
LIMIT 20;
```

Expected: new request-driven rows have non-null `request_correlation_id`, `ip_address`, and `user_agent`.

## Security Events

Trigger these with disposable accounts only:

1. Failed admin login.
2. Failed client login.
3. Password reset request for a known and unknown identifier.
4. Admin or client password change.
5. CSRF mismatch by omitting or corrupting `x-csrf-token` on a protected mutation.
6. Rate-limit block by exceeding the configured auth threshold in a controlled environment.

Then verify:

```sql
SELECT event_type_code, success_flag, identifier_value, ip_address, user_agent, occurred_at
FROM security_events
ORDER BY occurred_at DESC
LIMIT 30;
```

Expected event types include:

- `admin.login_failed`
- `client.login_failed`
- `admin.csrf_mismatch`
- `client.csrf_mismatch`
- `admin.password_reset_requested`
- `client.password_reset_requested`
- `admin.password_changed`
- `client.password_changed`
- `admin.rate_limit_blocked`
- `client.rate_limit_blocked`

Expected: request-driven rows include non-null `ip_address` and `user_agent`.
