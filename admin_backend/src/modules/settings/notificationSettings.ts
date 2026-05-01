import type { RowDataPacket } from 'mysql2/promise';
import { env } from '../../config/env.js';
import { createPublicId } from '../../lib/authCrypto.js';
import { AppError, badRequest, notFound } from '../../lib/httpErrors.js';
import { executeStatement, queryRows, type QueryExecutor } from '../../lib/mysql.js';
import type { AdminActor } from '../auth/service.js';
import { createAuditEvent } from '../writeSupport.js';

type ChannelCode = 'email' | 'in_app' | 'sms';

export type NotificationDeliverySettingsInput = {
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  isActive?: boolean;
  pushEnabled?: boolean;
  smsEnabled?: boolean;
  templateId?: string | null;
};

export type ReminderSettingInput = {
  channelCode: ChannelCode;
  eventTypeCode?: string | null;
  isActive?: boolean;
  offsetMinutes: number;
};

export type ReminderSettingUpdateInput = Partial<ReminderSettingInput>;

type DeliverySettingRow = RowDataPacket & {
  emailEnabled: number;
  inAppEnabled: number;
  isActive: number;
  label: string;
  pushEnabled: number;
  smsEnabled: number;
  sortOrder: number;
  templateId: string | null;
  templateName: string | null;
  templateType: string | null;
  typeCode: string;
};

type ReminderSettingRow = RowDataPacket & {
  archivedAt: string | null;
  channelCode: ChannelCode;
  displayOrder: number;
  eventTypeCode: string | null;
  eventTypeLabel: string | null;
  id: string;
  isActive: number;
  offsetMinutes: number;
  settingDbId: number;
};

type NotificationTemplateRow = RowDataPacket & {
  id: string;
  isActive: number;
  name: string;
};

export const providerMode = () => ({
  email: env.EMAIL_PROVIDER_MODE,
  inApp: 'local' as const,
  push: 'disabled' as const,
  sms: env.SMS_PROVIDER_MODE,
});

const firstRow = <TRow>(rows: TRow[]) => rows[0] || null;

const assertProviderAllows = (payload: NotificationDeliverySettingsInput | ReminderSettingInput | ReminderSettingUpdateInput) => {
  if ('emailEnabled' in payload && payload.emailEnabled && env.EMAIL_PROVIDER_MODE === 'disabled') {
    throw badRequest(
      'email_provider_disabled',
      'Email provider mode is disabled. Keep email delivery off or configure a real provider first.'
    );
  }

  if ('smsEnabled' in payload && payload.smsEnabled && env.SMS_PROVIDER_MODE === 'disabled') {
    throw badRequest(
      'sms_provider_disabled',
      'SMS provider mode is disabled. Keep SMS delivery off or configure a real provider first.'
    );
  }

  if ('pushEnabled' in payload && payload.pushEnabled) {
    throw badRequest('push_provider_disabled', 'Push delivery is not configured in this build.');
  }

  if ('channelCode' in payload && payload.channelCode === 'email' && env.EMAIL_PROVIDER_MODE === 'disabled') {
    throw badRequest(
      'email_provider_disabled',
      'Email reminder delivery cannot be enabled while EMAIL_PROVIDER_MODE is disabled.'
    );
  }

  if ('channelCode' in payload && payload.channelCode === 'sms' && env.SMS_PROVIDER_MODE === 'disabled') {
    throw badRequest(
      'sms_provider_disabled',
      'SMS reminder delivery cannot be enabled while SMS_PROVIDER_MODE is disabled.'
    );
  }
};

const assertNotificationTemplate = async (templateId?: string | null, executor?: QueryExecutor) => {
  if (!templateId) {
    return null;
  }

  const row = firstRow(
    await queryRows<NotificationTemplateRow>(
      `SELECT public_id AS id, template_name AS name, is_active AS isActive
       FROM admin_templates
       WHERE public_id = ?
         AND template_type_code = 'notification'
         AND archived_at IS NULL
       LIMIT 1`,
      [templateId],
      executor
    )
  );

  if (!row || !row.isActive) {
    throw badRequest('invalid_notification_template', 'Select an active notification template.');
  }

  return row;
};

const deliverySelectSql = `
  SELECT
    nt.code AS typeCode,
    nt.label,
    nt.sort_order AS sortOrder,
    COALESCE(nds.in_app_enabled, 1) AS inAppEnabled,
    COALESCE(nds.email_enabled, 0) AS emailEnabled,
    COALESCE(nds.sms_enabled, 0) AS smsEnabled,
    COALESCE(nds.push_enabled, 0) AS pushEnabled,
    COALESCE(nds.is_active, nt.is_active) AS isActive,
    at.public_id AS templateId,
    at.template_name AS templateName,
    at.template_type_code AS templateType
  FROM notification_types nt
  LEFT JOIN notification_delivery_settings nds ON nds.notification_type_code = nt.code
  LEFT JOIN admin_templates at ON at.public_id = nds.template_public_id
  WHERE nt.is_active = 1
`;

const reminderSelectSql = `
  SELECT
    rs.id AS settingDbId,
    rs.public_id AS id,
    rs.event_type_code AS eventTypeCode,
    et.label AS eventTypeLabel,
    rs.offset_minutes AS offsetMinutes,
    rs.channel_code AS channelCode,
    rs.is_active AS isActive,
    rs.display_order AS displayOrder,
    rs.archived_at AS archivedAt
  FROM reminder_settings rs
  LEFT JOIN (
    SELECT event_type_code AS code, MIN(REPLACE(event_type_code, '_', ' ')) AS label
    FROM events
    GROUP BY event_type_code
  ) et ON et.code = rs.event_type_code
`;

const mapDeliverySetting = (row: DeliverySettingRow) => ({
  emailEnabled: Boolean(row.emailEnabled),
  inAppEnabled: Boolean(row.inAppEnabled),
  isActive: Boolean(row.isActive),
  label: row.label,
  pushEnabled: Boolean(row.pushEnabled),
  smsEnabled: Boolean(row.smsEnabled),
  sortOrder: Number(row.sortOrder || 0),
  template: row.templateId
    ? {
        id: row.templateId,
        name: row.templateName || 'Notification template',
        type: row.templateType || 'notification',
      }
    : null,
  templateId: row.templateId,
  typeCode: row.typeCode,
});

const mapReminderSetting = (row: ReminderSettingRow) => ({
  archivedAt: row.archivedAt,
  channelCode: row.channelCode,
  displayOrder: Number(row.displayOrder || 0),
  eventTypeCode: row.eventTypeCode,
  eventTypeLabel: row.eventTypeLabel || 'All client-visible events',
  id: row.id,
  isActive: Boolean(row.isActive),
  offsetMinutes: Number(row.offsetMinutes || 0),
});

export const getActiveReminderSettings = async (
  eventTypeCode?: string | null,
  executor?: QueryExecutor
) => {
  const rows = await queryRows<ReminderSettingRow>(
    `${reminderSelectSql}
     WHERE rs.archived_at IS NULL
       AND rs.is_active = 1
       AND (rs.event_type_code IS NULL OR rs.event_type_code = ?)
     ORDER BY
       CASE WHEN rs.event_type_code = ? THEN 0 ELSE 1 END,
       rs.display_order ASC,
       rs.offset_minutes DESC`,
    [eventTypeCode || '', eventTypeCode || ''],
    executor
  );

  return rows.map(mapReminderSetting);
};

export const getNotificationSettings = async () => {
  const [deliveryRows, reminderRows, eventTypeRows, templateRows] = await Promise.all([
    queryRows<DeliverySettingRow>(`${deliverySelectSql} ORDER BY nt.sort_order ASC, nt.label ASC`),
    queryRows<ReminderSettingRow>(
      `${reminderSelectSql}
       WHERE rs.archived_at IS NULL
       ORDER BY rs.is_active DESC, rs.display_order ASC, rs.offset_minutes DESC`
    ),
    queryRows<RowDataPacket & { code: string; label: string }>(
      `SELECT event_type_code AS code, MIN(REPLACE(event_type_code, '_', ' ')) AS label
       FROM events
       GROUP BY event_type_code
       ORDER BY label ASC`
    ),
    queryRows<NotificationTemplateRow>(
      `SELECT public_id AS id, template_name AS name, is_active AS isActive
       FROM admin_templates
       WHERE template_type_code = 'notification'
         AND is_active = 1
         AND archived_at IS NULL
       ORDER BY is_default DESC, template_name ASC`
    ),
  ]);

  return {
    deliverySettings: deliveryRows.map(mapDeliverySetting),
    eventTypes: eventTypeRows.map((row) => ({ code: row.code, label: row.label })),
    providerMode: providerMode(),
    reminderSettings: reminderRows.map(mapReminderSetting),
    templates: templateRows.map((row) => ({ id: row.id, name: row.name })),
  };
};

export const updateNotificationDeliverySetting = async (
  actor: AdminActor,
  typeCode: string,
  payload: NotificationDeliverySettingsInput
) => {
  assertProviderAllows(payload);
  await assertNotificationTemplate(payload.templateId);

  const existing = firstRow(
    await queryRows<DeliverySettingRow>(
      `${deliverySelectSql}
       AND nt.code = ?
       LIMIT 1`,
      [typeCode]
    )
  );

  if (!existing) {
    throw notFound('notification_type_not_found', 'Notification type not found.');
  }

  await executeStatement(
    `INSERT INTO notification_delivery_settings (
       notification_type_code,
       in_app_enabled,
       email_enabled,
       sms_enabled,
       push_enabled,
       template_public_id,
       is_active,
       updated_by_user_id,
       created_at,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))
     ON DUPLICATE KEY UPDATE
       in_app_enabled = VALUES(in_app_enabled),
       email_enabled = VALUES(email_enabled),
       sms_enabled = VALUES(sms_enabled),
       push_enabled = VALUES(push_enabled),
       template_public_id = VALUES(template_public_id),
       is_active = VALUES(is_active),
       updated_by_user_id = VALUES(updated_by_user_id),
       updated_at = UTC_TIMESTAMP(6)`,
    [
      typeCode,
      payload.inAppEnabled ?? Boolean(existing.inAppEnabled) ? 1 : 0,
      payload.emailEnabled ?? Boolean(existing.emailEnabled) ? 1 : 0,
      payload.smsEnabled ?? Boolean(existing.smsEnabled) ? 1 : 0,
      payload.pushEnabled ?? Boolean(existing.pushEnabled) ? 1 : 0,
      payload.templateId === undefined ? existing.templateId : payload.templateId || null,
      payload.isActive ?? Boolean(existing.isActive) ? 1 : 0,
      actor.userId,
    ]
  );

  await createAuditEvent({
    actionCode: 'notification_settings.updated',
    actionLabel: 'Notification settings updated',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    changes: [
      { fieldName: 'in_app_enabled', oldValue: Boolean(existing.inAppEnabled), newValue: payload.inAppEnabled },
      { fieldName: 'email_enabled', oldValue: Boolean(existing.emailEnabled), newValue: payload.emailEnabled },
      { fieldName: 'sms_enabled', oldValue: Boolean(existing.smsEnabled), newValue: payload.smsEnabled },
      { fieldName: 'template_public_id', oldValue: existing.templateId, newValue: payload.templateId },
    ].filter((change) => change.newValue !== undefined),
    entityPk: null,
    entityTableName: 'notification_delivery_settings',
    sourceModule: 'settings_workspace',
    summaryNewValue: { typeCode },
  });

  const updated = firstRow(
    await queryRows<DeliverySettingRow>(
      `${deliverySelectSql}
       AND nt.code = ?
       LIMIT 1`,
      [typeCode]
    )
  );

  return mapDeliverySetting(updated!);
};

const normalizeReminderInput = (payload: ReminderSettingInput) => {
  assertProviderAllows(payload);

  if (!Number.isInteger(payload.offsetMinutes) || payload.offsetMinutes < 1 || payload.offsetMinutes > 10080) {
    throw badRequest('invalid_reminder_offset', 'Reminder offset must be 1 minute to 7 days.');
  }

  return {
    channelCode: payload.channelCode,
    eventTypeCode: payload.eventTypeCode?.trim() || null,
    isActive: payload.isActive ?? true,
    offsetMinutes: payload.offsetMinutes,
  };
};

export const createReminderSetting = async (actor: AdminActor, payload: ReminderSettingInput) => {
  const next = normalizeReminderInput(payload);
  const duplicate = firstRow(
    await queryRows<RowDataPacket & { id: number }>(
      `SELECT id
       FROM reminder_settings
       WHERE event_type_code <=> ?
         AND offset_minutes = ?
         AND channel_code = ?
         AND archived_at IS NULL
       LIMIT 1`,
      [next.eventTypeCode, next.offsetMinutes, next.channelCode]
    )
  );

  if (duplicate) {
    throw new AppError(409, 'reminder_setting_duplicate', 'A matching reminder offset already exists.');
  }

  const result = await executeStatement(
    `INSERT INTO reminder_settings (
       public_id,
       event_type_code,
       offset_minutes,
       channel_code,
       is_active,
       display_order,
       created_by_user_id,
       updated_by_user_id,
       created_at,
       updated_at,
       archived_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), NULL)`,
    [
      createPublicId(),
      next.eventTypeCode,
      next.offsetMinutes,
      next.channelCode,
      next.isActive ? 1 : 0,
      next.offsetMinutes,
      actor.userId,
      actor.userId,
    ]
  );

  await createAuditEvent({
    actionCode: 'reminder_setting.created',
    actionLabel: 'Reminder setting created',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    entityPk: result.insertId,
    entityTableName: 'reminder_settings',
    sourceModule: 'settings_workspace',
    summaryNewValue: next,
  });

  return mapReminderSetting(await getReminderSettingRowByPk(result.insertId));
};

const getReminderSettingRow = async (settingId: string) => {
  const row = firstRow(
    await queryRows<ReminderSettingRow>(
      `${reminderSelectSql}
       WHERE rs.public_id = ?
       LIMIT 1`,
      [settingId]
    )
  );

  if (!row) {
    throw notFound('reminder_setting_not_found', 'Reminder setting not found.');
  }

  return row;
};

const getReminderSettingRowByPk = async (settingDbId: number) => {
  const row = firstRow(
    await queryRows<ReminderSettingRow>(
      `${reminderSelectSql}
       WHERE rs.id = ?
       LIMIT 1`,
      [settingDbId]
    )
  );

  if (!row) {
    throw notFound('reminder_setting_not_found', 'Reminder setting not found.');
  }

  return row;
};

export const updateReminderSetting = async (
  actor: AdminActor,
  settingId: string,
  payload: ReminderSettingUpdateInput
) => {
  const existing = await getReminderSettingRow(settingId);
  const next = normalizeReminderInput({
    channelCode: payload.channelCode || existing.channelCode,
    eventTypeCode: payload.eventTypeCode === undefined ? existing.eventTypeCode : payload.eventTypeCode,
    isActive: payload.isActive ?? Boolean(existing.isActive),
    offsetMinutes: payload.offsetMinutes ?? Number(existing.offsetMinutes),
  });

  const duplicate = firstRow(
    await queryRows<RowDataPacket & { id: number }>(
      `SELECT id
       FROM reminder_settings
       WHERE id <> ?
         AND event_type_code <=> ?
         AND offset_minutes = ?
         AND channel_code = ?
         AND archived_at IS NULL
       LIMIT 1`,
      [existing.settingDbId, next.eventTypeCode, next.offsetMinutes, next.channelCode]
    )
  );

  if (duplicate) {
    throw new AppError(409, 'reminder_setting_duplicate', 'A matching reminder offset already exists.');
  }

  await executeStatement(
    `UPDATE reminder_settings
     SET event_type_code = ?,
         offset_minutes = ?,
         channel_code = ?,
         is_active = ?,
         display_order = ?,
         updated_by_user_id = ?,
         updated_at = UTC_TIMESTAMP(6)
     WHERE id = ?`,
    [
      next.eventTypeCode,
      next.offsetMinutes,
      next.channelCode,
      next.isActive ? 1 : 0,
      next.offsetMinutes,
      actor.userId,
      existing.settingDbId,
    ]
  );

  await createAuditEvent({
    actionCode: 'reminder_setting.updated',
    actionLabel: 'Reminder setting updated',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    entityPk: existing.settingDbId,
    entityTableName: 'reminder_settings',
    sourceModule: 'settings_workspace',
    summaryOldValue: mapReminderSetting(existing),
    summaryNewValue: next,
  });

  return mapReminderSetting(await getReminderSettingRow(settingId));
};

export const archiveReminderSetting = async (actor: AdminActor, settingId: string) => {
  const existing = await getReminderSettingRow(settingId);

  await executeStatement(
    `UPDATE reminder_settings
     SET is_active = 0,
         archived_at = COALESCE(archived_at, UTC_TIMESTAMP(6)),
         updated_by_user_id = ?,
         updated_at = UTC_TIMESTAMP(6)
     WHERE id = ?`,
    [actor.userId, existing.settingDbId]
  );

  await createAuditEvent({
    actionCode: 'reminder_setting.archived',
    actionLabel: 'Reminder setting archived',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    changes: [{ fieldName: 'archived_at', newValue: 'now' }],
    entityPk: existing.settingDbId,
    entityTableName: 'reminder_settings',
    sourceModule: 'settings_workspace',
  });

  return mapReminderSetting(await getReminderSettingRow(settingId));
};
