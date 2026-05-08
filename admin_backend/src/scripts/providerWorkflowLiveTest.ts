import type { RowDataPacket } from 'mysql2/promise';
import { readFileSync } from 'node:fs';
import { closeMysqlPool, executeStatement, queryRows, withTransaction } from '../lib/mysql.js';
import { env } from '../config/env.js';
import type { AdminActor } from '../modules/auth/service.js';
import { createClient } from '../modules/clients/service.js';
import { createMatter } from '../modules/matters/service.js';
import { createInvoice, sendInvoice } from '../modules/billing/service.js';
import { createEvent } from '../modules/events/service.js';
import { processDueReminders } from '../modules/reminders/service.js';
import { requestPasswordReset } from '../modules/auth/service.js';

type ActorRow = RowDataPacket & {
  displayName: string;
  email: string;
  id: string;
  permissionCode: string | null;
  roleCode: string | null;
  userId: number;
};

type ClientRow = RowDataPacket & {
  clientAccountDbId: number;
  clientId: string;
  userId: number;
};

type MatterRow = RowDataPacket & {
  matterDbId: number;
  matterId: string;
};

type InvoiceAuditRow = RowDataPacket & {
  actionCode: string;
  createdAt: string;
  providerReference: string | null;
  status: string | null;
};

type ReminderRow = RowDataPacket & {
  channelCode: string;
  deliveryStatusCode: string;
  failureReason: string | null;
};

type ReminderAuditRow = RowDataPacket & {
  deliveryMode: string | null;
  providerCode: string | null;
  providerReference: string | null;
};

const isE164 = (value: string) => /^\+[1-9]\d{7,14}$/.test(value);

const maskProviderReference = (value: string | null | undefined) =>
  value ? `${value.slice(0, 8)}...${value.slice(-4)}` : null;

const readRawEnvValue = (key: string) => {
  const direct = process.env[key];
  if (direct?.trim()) {
    return direct.trim();
  }

  try {
    const text = readFileSync('.env', 'utf8');
    const line = text
      .split(/\r?\n/)
      .map((entry) => entry.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/))
      .find((match) => match?.[1] === key);
    const rawValue = line?.[2]?.trim();
    if (!rawValue) {
      return '';
    }

    const first = rawValue[0];
    const last = rawValue[rawValue.length - 1];
    return (first === '"' && last === '"') || (first === "'" && last === "'")
      ? rawValue.slice(1, -1)
      : rawValue;
  } catch {
    return '';
  }
};

const providerTestEmail = readRawEnvValue('PROVIDER_TEST_EMAIL');
const providerTestPhone = readRawEnvValue('PROVIDER_TEST_PHONE');

const collectActor = (rows: ActorRow[]): AdminActor => {
  const first = rows[0];
  if (!first) {
    throw new Error('No active admin actor is available for provider workflow smoke.');
  }

  return {
    displayName: first.displayName,
    email: first.email,
    id: first.id,
    mustRotatePassword: false,
    permissionCodes: Array.from(
      new Set(rows.map((row) => row.permissionCode).filter((code): code is string => Boolean(code)))
    ),
    roleCodes: Array.from(
      new Set(rows.map((row) => row.roleCode).filter((code): code is string => Boolean(code)))
    ),
    userId: Number(first.userId),
  };
};

const getAdminActor = async () => {
  const rows = await queryRows<ActorRow>(
    `SELECT
       u.id AS userId,
       u.public_id AS id,
       u.email,
       u.display_name AS displayName,
       ur.role_code AS roleCode,
       rp.permission_code AS permissionCode
     FROM users u
     JOIN user_roles ur
       ON ur.user_id = u.id
      AND ur.is_active = 1
      AND ur.role_code <> 'client'
      AND (ur.starts_at IS NULL OR ur.starts_at <= UTC_TIMESTAMP(6))
      AND (ur.ends_at IS NULL OR ur.ends_at >= UTC_TIMESTAMP(6))
     LEFT JOIN role_permissions rp ON rp.role_code = ur.role_code
     WHERE u.actor_type_code <> 'client'
       AND u.login_enabled = 1
       AND u.archived_at IS NULL
     ORDER BY CASE WHEN ur.role_code = 'ops_admin' THEN 0 ELSE 1 END, u.id ASC
     LIMIT 500`
  );

  return collectActor(rows);
};

const getClientByEmail = async (email: string) => {
  const rows = await queryRows<ClientRow>(
    `SELECT
       ca.id AS clientAccountDbId,
       ca.public_id AS clientId,
       cac.user_id AS userId
     FROM client_accounts ca
     JOIN client_account_contacts cac
       ON cac.client_account_id = ca.id
      AND cac.is_primary = 1
      AND cac.archived_at IS NULL
     WHERE LOWER(ca.primary_email) = LOWER(?)
       AND ca.archived_at IS NULL
     ORDER BY ca.id DESC
     LIMIT 1`,
    [email]
  );

  return rows[0] || null;
};

const ensureDisposableClient = async (actor: AdminActor) => {
  const email = providerTestEmail;
  const phone = providerTestPhone;

  if (!email || !phone) {
    throw new Error('PROVIDER_TEST_EMAIL and PROVIDER_TEST_PHONE are required.');
  }

  if (!isE164(phone)) {
    throw new Error('PROVIDER_TEST_PHONE must be E.164 before workflow SMS tests.');
  }

  const existing = await getClientByEmail(email);
  if (existing) {
    return { client: existing, created: false };
  }

  const result = await createClient(actor, {
    city: 'Provider QA City',
    clientType: 'individual',
    displayName: `Disposable Provider QA Client ${Date.now()}`,
    email,
    notes: 'Disposable provider workflow QA record.',
    phone,
    portalAccessEnabled: true,
    primaryContactName: 'Disposable Provider QA',
    state: 'Rajasthan',
  });

  const client = await getClientByEmail(email);
  if (!client) {
    throw new Error(`Created client ${result.client.id}, but could not reload it.`);
  }

  return { client, created: true };
};

const ensureDisposableMatter = async (actor: AdminActor, clientId: string) => {
  const existing = await queryRows<MatterRow>(
    `SELECT id AS matterDbId, public_id AS matterId
     FROM matters
     WHERE client_account_id = (SELECT id FROM client_accounts WHERE public_id = ? LIMIT 1)
       AND title LIKE 'Disposable Provider QA Matter%'
       AND archived_at IS NULL
     ORDER BY id DESC
     LIMIT 1`,
    [clientId]
  );

  if (existing[0]) {
    return { created: false, matter: existing[0] };
  }

  const result = await createMatter(actor, {
    clientAccountPublicId: clientId,
    clientVisible: true,
    summary: 'Disposable matter for provider workflow QA. No client-sensitive data.',
    title: `Disposable Provider QA Matter ${Date.now()}`,
  });

  const createdMatterId = result.matter?.id;
  const rows = createdMatterId
    ? await queryRows<MatterRow>(
        `SELECT id AS matterDbId, public_id AS matterId FROM matters WHERE public_id = ? LIMIT 1`,
        [createdMatterId]
      )
    : [];

  if (!rows[0]) {
    throw new Error(`Created matter ${createdMatterId || 'unknown'}, but could not reload it.`);
  }

  return { created: true, matter: rows[0] };
};

const createAndSendDisposableInvoice = async (actor: AdminActor, matterId: string) => {
  const created = await createInvoice(actor, {
    amount: 101,
    description: `Disposable provider QA invoice ${Date.now()}`,
    matterId,
  });
  const sent = await sendInvoice(actor, created.invoiceId);

  const audits = await queryRows<InvoiceAuditRow>(
    `SELECT
       ae.action_code AS actionCode,
       ae.occurred_at AS createdAt,
       aec.new_value_text AS providerReference,
       (
         SELECT status_change.new_value_text
         FROM audit_event_changes status_change
         WHERE status_change.audit_event_id = ae.id
           AND status_change.field_name = 'delivery_status'
         LIMIT 1
       ) AS status
     FROM invoices inv
     JOIN audit_events ae
       ON ae.entity_table_name = 'invoices'
      AND ae.entity_pk = inv.id
      AND ae.action_code LIKE 'invoice.email_%'
     LEFT JOIN audit_event_changes aec
       ON aec.audit_event_id = ae.id
      AND aec.field_name = 'provider_reference'
     WHERE inv.public_id = ?
     ORDER BY ae.occurred_at DESC`,
    [created.invoiceId]
  );

  return {
    auditCount: audits.length,
    emailDeliveryStatus: sent.emailDeliveryStatus,
    invoiceId: created.invoiceId,
    providerReferences: audits
      .map((audit) => maskProviderReference(audit.providerReference))
      .filter(Boolean),
    status: sent.status,
  };
};

const createDueReminderRows = async (
  input: {
    clientUserId: number;
    eventId: string;
  }
) =>
  withTransaction(async (connection) => {
    const rows = await queryRows<RowDataPacket & { eventDbId: number }>(
      `SELECT id AS eventDbId FROM events WHERE public_id = ? LIMIT 1 FOR UPDATE`,
      [input.eventId],
      connection
    );
    const eventDbId = Number(rows[0]?.eventDbId);
    if (!eventDbId) {
      throw new Error('Disposable event could not be reloaded.');
    }

    for (const channelCode of ['email', 'sms']) {
      await executeStatement(
        `INSERT INTO event_reminders (
           event_id,
           recipient_user_id,
           channel_code,
           scheduled_at,
           sent_at,
           delivery_status_code,
           failure_reason,
           retry_count,
           max_attempts,
           next_attempt_at,
           locked_at,
           locked_by,
           processed_at
         ) VALUES (
           ?, ?, ?, DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 1 MINUTE), NULL, 'pending',
           NULL, 0, 3, NULL, NULL, NULL, NULL
         )`,
        [eventDbId, input.clientUserId, channelCode],
        connection
      );
    }

    return eventDbId;
  });

const createAndProcessDisposableReminders = async (
  actor: AdminActor,
  input: {
    clientId: string;
    clientUserId: number;
    matterId: string;
  }
) => {
  const today = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const event = await createEvent(actor, {
    clientAccountId: input.clientId,
    date: today,
    durationMinutes: 30,
    matterId: input.matterId,
    mode: 'video',
    notes: 'Disposable provider workflow QA event.',
    time: '15:00',
    title: `Disposable Provider QA Reminder ${Date.now()}`,
    type: 'consultation',
    visibleToClient: true,
  });

  const eventDbId = await createDueReminderRows({
    clientUserId: input.clientUserId,
    eventId: event.eventId,
  });

  const processed = await processDueReminders({ limit: 10 });
  const reminders = await queryRows<ReminderRow>(
    `SELECT
       er.channel_code AS channelCode,
       er.delivery_status_code AS deliveryStatusCode,
       er.failure_reason AS failureReason
     FROM event_reminders er
     WHERE er.event_id = ?
       AND er.channel_code IN ('email', 'sms')
     ORDER BY er.id DESC
     LIMIT 4`,
    [eventDbId]
  );
  const auditDeliveries = await queryRows<ReminderAuditRow>(
    `SELECT
       MAX(CASE WHEN aec.field_name = 'delivery_mode' THEN aec.new_value_text END) AS deliveryMode,
       MAX(CASE WHEN aec.field_name = 'provider_code' THEN aec.new_value_text END) AS providerCode,
       MAX(CASE WHEN aec.field_name = 'provider_reference' THEN aec.new_value_text END) AS providerReference
     FROM audit_events ae
     LEFT JOIN audit_event_changes aec ON aec.audit_event_id = ae.id
     WHERE ae.entity_table_name = 'event_reminders'
       AND ae.entity_pk = ?
       AND ae.action_code = 'reminder.processed'
     GROUP BY ae.id
     ORDER BY ae.occurred_at DESC
     LIMIT 10`,
    [eventDbId]
  );

  return {
    auditDeliveries: auditDeliveries.map((delivery) => ({
      deliveryMode: delivery.deliveryMode,
      providerCode: delivery.providerCode,
      providerReference: maskProviderReference(delivery.providerReference),
    })),
    eventId: event.eventId,
    processed,
    reminders: reminders.map((reminder) => ({
      channelCode: reminder.channelCode,
      deliveryStatusCode: reminder.deliveryStatusCode,
      failureReason: reminder.failureReason,
    })),
  };
};

const testPasswordResetGenericResponse = async () => {
  const result = await requestPasswordReset(providerTestEmail || 'missing@example.local', {
    ipAddress: '127.0.0.1',
  });

  return {
    deliveryMode: result.deliveryMode,
    status: result.status,
    workflowEmailSend: 'blocked_provider_test_email_used_for_client_identity',
  };
};

const run = async () => {
  const actor = await getAdminActor();
  const clientResult = await ensureDisposableClient(actor);
  const matterResult = await ensureDisposableMatter(actor, clientResult.client.clientId);
  const invoice = await createAndSendDisposableInvoice(actor, matterResult.matter.matterId);
  const reminders = await createAndProcessDisposableReminders(actor, {
    clientId: clientResult.client.clientId,
    clientUserId: Number(clientResult.client.userId),
    matterId: matterResult.matter.matterId,
  });
  const passwordReset = await testPasswordResetGenericResponse();

  console.log(
    JSON.stringify(
      {
        client: { created: clientResult.created },
        invoice,
        matter: { created: matterResult.created },
        passwordReset,
        reminders,
        status: 'provider_workflow_live_test_completed',
      },
      null,
      2
    )
  );
};

run()
  .catch((error) => {
    console.log(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Provider workflow live test failed.',
        status: 'provider_workflow_live_test_failed',
      })
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMysqlPool();
  });
