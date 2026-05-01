import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { createPublicId } from '../../lib/authCrypto.js';
import { AppError, badRequest, notFound } from '../../lib/httpErrors.js';
import { executeStatement, queryRows, withTransaction, type QueryExecutor } from '../../lib/mysql.js';
import type { AdminActor } from '../auth/service.js';
import { createAuditEvent } from '../writeSupport.js';

type DomainRow = RowDataPacket & {
  code: string;
  isActive: number;
  name: string;
  sortOrder: number;
};

type ServiceRow = RowDataPacket & {
  code: string;
  dbId: number;
  description: string | null;
  domainCode: string;
  domainName: string;
  id: string;
  isActive: number;
  name: string;
  sortOrder: number;
};

type PricingSlabRow = RowDataPacket & {
  baseAmount: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  id: number;
  isActive: number;
  maxServiceCount: number | null;
  minServiceCount: number;
  perExtraServiceAmount: number | null;
};

type UrgencyRuleRow = RowDataPacket & {
  code: string;
  id: number;
  isActive: number;
  label: string;
  sortOrder: number;
  surchargeType: string;
  surchargeValue: number;
};

export type CreateServiceInput = {
  code?: string;
  description?: string | null;
  domainCode: string;
  isActive?: boolean;
  name: string;
  sortOrder?: number;
};

export type UpdateServiceInput = Partial<Omit<CreateServiceInput, 'code'>>;

export type PricingSlabInput = {
  baseAmount: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive?: boolean;
  maxServiceCount?: number | null;
  minServiceCount: number;
  perExtraServiceAmount?: number | null;
};

export type UrgencyRuleInput = {
  code?: string;
  isActive?: boolean;
  label: string;
  sortOrder?: number;
  surchargeType: 'flat' | 'percent';
  surchargeValue: number;
};

export type UpdateUrgencyRuleInput = Partial<Omit<UrgencyRuleInput, 'code'>>;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const firstRow = <TRow>(rows: TRow[]) => rows[0] || null;

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

const assertDateOnly = (value: string, fieldName: string) => {
  if (!DATE_ONLY_PATTERN.test(value)) {
    throw badRequest('invalid_date', `${fieldName} must use YYYY-MM-DD format.`);
  }
};

const assertNonNegativeAmount = (value: number | null | undefined, fieldName: string) => {
  if (value === null || value === undefined) {
    return;
  }

  if (!Number.isFinite(value) || value < 0) {
    throw badRequest('invalid_amount', `${fieldName} must be a non-negative amount.`);
  }
};

const assertPositiveInteger = (value: number, fieldName: string) => {
  if (!Number.isInteger(value) || value <= 0) {
    throw badRequest('invalid_count', `${fieldName} must be a positive whole number.`);
  }
};

const normalizeServicePayload = (payload: CreateServiceInput) => {
  const name = payload.name.trim();
  const code = (payload.code?.trim() || toSlug(name)).toLowerCase();
  const domainCode = payload.domainCode.trim();

  if (name.length < 2 || name.length > 180) {
    throw badRequest('invalid_service_name', 'Service name must be between 2 and 180 characters.');
  }

  if (!CODE_PATTERN.test(code)) {
    throw badRequest('invalid_service_code', 'Service code must be a lowercase slug.');
  }

  return {
    code,
    description: payload.description?.trim() || null,
    domainCode,
    isActive: payload.isActive ?? true,
    name,
    sortOrder: payload.sortOrder ?? 0,
  };
};

const mapService = (row: ServiceRow) => ({
  code: row.code,
  description: row.description || '',
  domainCode: row.domainCode,
  domainName: row.domainName,
  id: row.id,
  isActive: Boolean(row.isActive),
  name: row.name,
  sortOrder: Number(row.sortOrder || 0),
});

const mapSlab = (row: PricingSlabRow) => ({
  baseAmount: Number(row.baseAmount || 0),
  effectiveFrom: row.effectiveFrom.slice(0, 10),
  effectiveTo: row.effectiveTo ? row.effectiveTo.slice(0, 10) : null,
  id: String(row.id),
  isActive: Boolean(row.isActive),
  maxServiceCount: row.maxServiceCount === null ? null : Number(row.maxServiceCount),
  minServiceCount: Number(row.minServiceCount || 0),
  perExtraServiceAmount: row.perExtraServiceAmount === null ? null : Number(row.perExtraServiceAmount),
});

const mapUrgency = (row: UrgencyRuleRow) => ({
  code: row.code,
  id: String(row.id),
  isActive: Boolean(row.isActive),
  label: row.label,
  sortOrder: Number(row.sortOrder || 0),
  surchargeType: row.surchargeType,
  surchargeValue: Number(row.surchargeValue || 0),
});

const getServiceByPublicId = async (serviceId: string, executor?: QueryExecutor) => {
  const row = firstRow(
    await queryRows<ServiceRow>(
      `SELECT
         s.id AS dbId,
         s.public_id AS id,
         s.service_code AS code,
         s.service_name AS name,
         s.service_description AS description,
         s.sort_order AS sortOrder,
         s.is_active AS isActive,
         ld.domain_code AS domainCode,
         ld.domain_name AS domainName
       FROM services s
       INNER JOIN legal_domains ld ON ld.id = s.legal_domain_id
       WHERE s.public_id = ?
       LIMIT 1`,
      [serviceId],
      executor
    )
  );

  if (!row) {
    throw notFound('service_not_found', 'Service not found.');
  }

  return row;
};

const getSlabById = async (slabId: string) => {
  const numericId = Number(slabId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw notFound('pricing_rule_not_found', 'Pricing rule not found.');
  }

  const row = firstRow(
    await queryRows<PricingSlabRow>(
      `SELECT
         id,
         effective_from AS effectiveFrom,
         effective_to AS effectiveTo,
         min_service_count AS minServiceCount,
         max_service_count AS maxServiceCount,
         base_amount AS baseAmount,
         per_extra_service_amount AS perExtraServiceAmount,
         is_active AS isActive
       FROM pricing_service_slabs
       WHERE id = ?
       LIMIT 1`,
      [numericId]
    )
  );

  if (!row) {
    throw notFound('pricing_rule_not_found', 'Pricing rule not found.');
  }

  return row;
};

const getUrgencyById = async (ruleId: string) => {
  const numericId = Number(ruleId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw notFound('urgency_rule_not_found', 'Urgency rule not found.');
  }

  const row = firstRow(
    await queryRows<UrgencyRuleRow>(
      `SELECT
         id,
         urgency_code AS code,
         label,
         surcharge_type_code AS surchargeType,
         surcharge_value AS surchargeValue,
         sort_order AS sortOrder,
         is_active AS isActive
       FROM pricing_urgency_rules
       WHERE id = ?
       LIMIT 1`,
      [numericId]
    )
  );

  if (!row) {
    throw notFound('urgency_rule_not_found', 'Urgency rule not found.');
  }

  return row;
};

export const getServiceCatalog = async () => {
  const [domainRows, serviceRows] = await Promise.all([
    queryRows<DomainRow>(
      `SELECT domain_code AS code, domain_name AS name, sort_order AS sortOrder, is_active AS isActive
       FROM legal_domains
       ORDER BY sort_order ASC, domain_name ASC`
    ),
    queryRows<ServiceRow>(
      `SELECT
         s.id AS dbId,
         s.public_id AS id,
         s.service_code AS code,
         s.service_name AS name,
         s.service_description AS description,
         s.sort_order AS sortOrder,
         s.is_active AS isActive,
         ld.domain_code AS domainCode,
         ld.domain_name AS domainName
       FROM services s
       INNER JOIN legal_domains ld ON ld.id = s.legal_domain_id
       ORDER BY ld.sort_order ASC, s.sort_order ASC, s.service_name ASC`
    ),
  ]);

  return {
    domains: domainRows.map((row) => ({
      code: row.code,
      isActive: Boolean(row.isActive),
      name: row.name,
      sortOrder: Number(row.sortOrder || 0),
    })),
    services: serviceRows.map(mapService),
  };
};

export const getPricingRules = async () => {
  const [slabRows, urgencyRows] = await Promise.all([
    queryRows<PricingSlabRow>(
      `SELECT
         id,
         effective_from AS effectiveFrom,
         effective_to AS effectiveTo,
         min_service_count AS minServiceCount,
         max_service_count AS maxServiceCount,
         base_amount AS baseAmount,
         per_extra_service_amount AS perExtraServiceAmount,
         is_active AS isActive
       FROM pricing_service_slabs
       ORDER BY effective_from DESC, min_service_count ASC, id DESC`
    ),
    queryRows<UrgencyRuleRow>(
      `SELECT
         id,
         urgency_code AS code,
         label,
         surcharge_type_code AS surchargeType,
         surcharge_value AS surchargeValue,
         sort_order AS sortOrder,
         is_active AS isActive
       FROM pricing_urgency_rules
       ORDER BY sort_order ASC, label ASC`
    ),
  ]);

  return {
    serviceSlabs: slabRows.map(mapSlab),
    urgencyRules: urgencyRows.map(mapUrgency),
  };
};

export const createService = async (actor: AdminActor, payload: CreateServiceInput) => {
  const next = normalizeServicePayload(payload);

  return withTransaction(async (connection) => {
    const domain = firstRow(
      await queryRows<RowDataPacket & { id: number }>(
        `SELECT id
         FROM legal_domains
         WHERE domain_code = ?
           AND is_active = 1
         LIMIT 1`,
        [next.domainCode],
        connection
      )
    );

    if (!domain) {
      throw badRequest('invalid_domain', 'Select an active service domain.');
    }

    const duplicate = firstRow(
      await queryRows<RowDataPacket & { id: number }>(
        `SELECT id
         FROM services
         WHERE service_code = ?
            OR (legal_domain_id = ? AND LOWER(service_name) = LOWER(?))
         LIMIT 1`,
        [next.code, domain.id, next.name],
        connection
      )
    );

    if (duplicate) {
      throw new AppError(409, 'service_duplicate', 'A service with this code or name already exists.');
    }

    const result = await executeStatement<ResultSetHeader>(
      `INSERT INTO services (
         public_id,
         service_code,
         legal_domain_id,
         service_name,
         service_description,
         sort_order,
         is_active,
         is_subscription_eligible,
         created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))`,
      [createPublicId(), next.code, domain.id, next.name, next.description, next.sortOrder, next.isActive ? 1 : 0],
      connection
    );

    await createAuditEvent(
      {
        actionCode: 'service.created',
        actionLabel: 'Service catalog item created',
        actorRoleCode: actor.roleCodes[0] || 'ops_admin',
        actorUserId: actor.userId,
        changes: [
          { fieldName: 'service_code', newValue: next.code },
          { fieldName: 'service_name', newValue: next.name },
          { fieldName: 'domain_code', newValue: next.domainCode },
        ],
        entityPk: result.insertId,
        entityTableName: 'services',
        sourceModule: 'settings_workspace',
      },
      connection
    );

    const created = firstRow(
      await queryRows<RowDataPacket & { id: string }>(
        `SELECT public_id AS id FROM services WHERE id = ? LIMIT 1`,
        [result.insertId],
        connection
      )
    );

    if (!created) {
      throw notFound('service_not_found', 'Service not found after creation.');
    }

    return mapService(await getServiceByPublicId(created.id, connection));
  });
};

export const updateService = async (
  actor: AdminActor,
  serviceId: string,
  payload: UpdateServiceInput
) => {
  const existing = await getServiceByPublicId(serviceId);
  const next = {
    description:
      payload.description === undefined ? existing.description : payload.description?.trim() || null,
    domainCode: payload.domainCode?.trim() || existing.domainCode,
    isActive: payload.isActive ?? Boolean(existing.isActive),
    name: payload.name?.trim() || existing.name,
    sortOrder: payload.sortOrder ?? Number(existing.sortOrder || 0),
  };

  if (next.name.length < 2 || next.name.length > 180) {
    throw badRequest('invalid_service_name', 'Service name must be between 2 and 180 characters.');
  }

  return withTransaction(async (connection) => {
    const domain = firstRow(
      await queryRows<RowDataPacket & { id: number }>(
        `SELECT id FROM legal_domains WHERE domain_code = ? AND is_active = 1 LIMIT 1`,
        [next.domainCode],
        connection
      )
    );

    if (!domain) {
      throw badRequest('invalid_domain', 'Select an active service domain.');
    }

    const duplicate = firstRow(
      await queryRows<RowDataPacket & { id: number }>(
        `SELECT id
         FROM services
         WHERE id <> ?
           AND legal_domain_id = ?
           AND LOWER(service_name) = LOWER(?)
         LIMIT 1`,
        [existing.dbId, domain.id, next.name],
        connection
      )
    );

    if (duplicate) {
      throw new AppError(409, 'service_duplicate', 'A service with this name already exists in the selected domain.');
    }

    await executeStatement(
      `UPDATE services
       SET legal_domain_id = ?,
           service_name = ?,
           service_description = ?,
           sort_order = ?,
           is_active = ?,
           updated_at = UTC_TIMESTAMP(6)
       WHERE id = ?`,
      [domain.id, next.name, next.description, next.sortOrder, next.isActive ? 1 : 0, existing.dbId],
      connection
    );

    await createAuditEvent(
      {
        actionCode: 'service.updated',
        actionLabel: 'Service catalog item updated',
        actorRoleCode: actor.roleCodes[0] || 'ops_admin',
        actorUserId: actor.userId,
        changes: [
          { fieldName: 'service_name', oldValue: existing.name, newValue: next.name },
          { fieldName: 'domain_code', oldValue: existing.domainCode, newValue: next.domainCode },
          { fieldName: 'is_active', oldValue: Boolean(existing.isActive), newValue: next.isActive },
        ],
        entityPk: existing.dbId,
        entityTableName: 'services',
        sourceModule: 'settings_workspace',
      },
      connection
    );

    return mapService(await getServiceByPublicId(serviceId, connection));
  });
};

export const archiveService = async (actor: AdminActor, serviceId: string) => {
  const existing = await getServiceByPublicId(serviceId);

  if (!existing.isActive) {
    return mapService(existing);
  }

  await executeStatement(
    `UPDATE services
     SET is_active = 0,
         updated_at = UTC_TIMESTAMP(6)
     WHERE id = ?`,
    [existing.dbId]
  );

  await createAuditEvent({
    actionCode: 'service.archived',
    actionLabel: 'Service catalog item archived',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    changes: [{ fieldName: 'is_active', oldValue: true, newValue: false }],
    entityPk: existing.dbId,
    entityTableName: 'services',
    sourceModule: 'settings_workspace',
  });

  return mapService(await getServiceByPublicId(serviceId));
};

const normalizeSlabInput = (payload: PricingSlabInput) => {
  assertDateOnly(payload.effectiveFrom, 'effectiveFrom');
  if (payload.effectiveTo) {
    assertDateOnly(payload.effectiveTo, 'effectiveTo');
    if (payload.effectiveTo < payload.effectiveFrom) {
      throw badRequest('invalid_effective_dates', 'Effective end date must be on or after start date.');
    }
  }
  assertPositiveInteger(payload.minServiceCount, 'minServiceCount');
  if (payload.maxServiceCount !== null && payload.maxServiceCount !== undefined) {
    assertPositiveInteger(payload.maxServiceCount, 'maxServiceCount');
    if (payload.maxServiceCount < payload.minServiceCount) {
      throw badRequest('invalid_service_count_range', 'Max service count must be at least the min service count.');
    }
  }
  assertNonNegativeAmount(payload.baseAmount, 'baseAmount');
  assertNonNegativeAmount(payload.perExtraServiceAmount, 'perExtraServiceAmount');

  return {
    baseAmount: payload.baseAmount,
    effectiveFrom: payload.effectiveFrom,
    effectiveTo: payload.effectiveTo || null,
    isActive: payload.isActive ?? true,
    maxServiceCount: payload.maxServiceCount ?? null,
    minServiceCount: payload.minServiceCount,
    perExtraServiceAmount: payload.perExtraServiceAmount ?? null,
  };
};

export const createPricingSlab = async (actor: AdminActor, payload: PricingSlabInput) => {
  const next = normalizeSlabInput(payload);
  const result = await executeStatement<ResultSetHeader>(
    `INSERT INTO pricing_service_slabs (
       effective_from,
       effective_to,
       min_service_count,
       max_service_count,
       base_amount,
       per_extra_service_amount,
       is_active,
       created_at,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))`,
    [
      next.effectiveFrom,
      next.effectiveTo,
      next.minServiceCount,
      next.maxServiceCount,
      next.baseAmount,
      next.perExtraServiceAmount,
      next.isActive ? 1 : 0,
    ]
  );

  await createAuditEvent({
    actionCode: 'pricing_rule.created',
    actionLabel: 'Pricing service slab created',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    entityPk: result.insertId,
    entityTableName: 'pricing_service_slabs',
    sourceModule: 'settings_workspace',
    summaryNewValue: next,
  });

  return mapSlab(await getSlabById(String(result.insertId)));
};

export const updatePricingSlab = async (
  actor: AdminActor,
  slabId: string,
  payload: Partial<PricingSlabInput>
) => {
  const existing = await getSlabById(slabId);
  const next = normalizeSlabInput({
    baseAmount: payload.baseAmount ?? Number(existing.baseAmount || 0),
    effectiveFrom: payload.effectiveFrom || existing.effectiveFrom.slice(0, 10),
    effectiveTo: payload.effectiveTo === undefined ? existing.effectiveTo?.slice(0, 10) || null : payload.effectiveTo,
    isActive: payload.isActive ?? Boolean(existing.isActive),
    maxServiceCount: payload.maxServiceCount === undefined ? existing.maxServiceCount : payload.maxServiceCount,
    minServiceCount: payload.minServiceCount ?? Number(existing.minServiceCount || 1),
    perExtraServiceAmount:
      payload.perExtraServiceAmount === undefined
        ? existing.perExtraServiceAmount
        : payload.perExtraServiceAmount,
  });

  await executeStatement(
    `UPDATE pricing_service_slabs
     SET effective_from = ?,
         effective_to = ?,
         min_service_count = ?,
         max_service_count = ?,
         base_amount = ?,
         per_extra_service_amount = ?,
         is_active = ?,
         updated_at = UTC_TIMESTAMP(6)
     WHERE id = ?`,
    [
      next.effectiveFrom,
      next.effectiveTo,
      next.minServiceCount,
      next.maxServiceCount,
      next.baseAmount,
      next.perExtraServiceAmount,
      next.isActive ? 1 : 0,
      existing.id,
    ]
  );

  await createAuditEvent({
    actionCode: 'pricing_rule.updated',
    actionLabel: 'Pricing service slab updated',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    entityPk: existing.id,
    entityTableName: 'pricing_service_slabs',
    sourceModule: 'settings_workspace',
    summaryOldValue: mapSlab(existing),
    summaryNewValue: next,
  });

  return mapSlab(await getSlabById(slabId));
};

export const archivePricingSlab = async (actor: AdminActor, slabId: string) => {
  const existing = await getSlabById(slabId);
  await executeStatement(
    `UPDATE pricing_service_slabs SET is_active = 0, updated_at = UTC_TIMESTAMP(6) WHERE id = ?`,
    [existing.id]
  );

  await createAuditEvent({
    actionCode: 'pricing_rule.archived',
    actionLabel: 'Pricing service slab archived',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    changes: [{ fieldName: 'is_active', oldValue: Boolean(existing.isActive), newValue: false }],
    entityPk: existing.id,
    entityTableName: 'pricing_service_slabs',
    sourceModule: 'settings_workspace',
  });

  return mapSlab(await getSlabById(slabId));
};

const normalizeUrgencyInput = (payload: UrgencyRuleInput) => {
  const label = payload.label.trim();
  const code = (payload.code?.trim() || toSlug(label)).toLowerCase();
  if (!label) {
    throw badRequest('invalid_urgency_label', 'Urgency label is required.');
  }
  if (!CODE_PATTERN.test(code)) {
    throw badRequest('invalid_urgency_code', 'Urgency code must be a lowercase slug.');
  }
  if (!['flat', 'percent'].includes(payload.surchargeType)) {
    throw badRequest('invalid_surcharge_type', 'Surcharge type must be flat or percent.');
  }
  assertNonNegativeAmount(payload.surchargeValue, 'surchargeValue');

  return {
    code,
    isActive: payload.isActive ?? true,
    label,
    sortOrder: payload.sortOrder ?? 0,
    surchargeType: payload.surchargeType,
    surchargeValue: payload.surchargeValue,
  };
};

export const createUrgencyRule = async (actor: AdminActor, payload: UrgencyRuleInput) => {
  const next = normalizeUrgencyInput(payload);
  const duplicate = firstRow(
    await queryRows<RowDataPacket & { id: number }>(
      `SELECT id FROM pricing_urgency_rules WHERE urgency_code = ? LIMIT 1`,
      [next.code]
    )
  );
  if (duplicate) {
    throw new AppError(409, 'urgency_rule_duplicate', 'An urgency rule with this code already exists.');
  }

  const result = await executeStatement<ResultSetHeader>(
    `INSERT INTO pricing_urgency_rules (
       urgency_code,
       label,
       surcharge_type_code,
       surcharge_value,
       sort_order,
       is_active,
       created_at,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))`,
    [next.code, next.label, next.surchargeType, next.surchargeValue, next.sortOrder, next.isActive ? 1 : 0]
  );

  await createAuditEvent({
    actionCode: 'pricing_rule.created',
    actionLabel: 'Urgency pricing rule created',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    entityPk: result.insertId,
    entityTableName: 'pricing_urgency_rules',
    sourceModule: 'settings_workspace',
    summaryNewValue: next,
  });

  return mapUrgency(await getUrgencyById(String(result.insertId)));
};

export const updateUrgencyRule = async (
  actor: AdminActor,
  ruleId: string,
  payload: UpdateUrgencyRuleInput
) => {
  const existing = await getUrgencyById(ruleId);
  const next = normalizeUrgencyInput({
    code: existing.code,
    isActive: payload.isActive ?? Boolean(existing.isActive),
    label: payload.label || existing.label,
    sortOrder: payload.sortOrder ?? Number(existing.sortOrder || 0),
    surchargeType: payload.surchargeType || (existing.surchargeType as 'flat' | 'percent'),
    surchargeValue: payload.surchargeValue ?? Number(existing.surchargeValue || 0),
  });

  await executeStatement(
    `UPDATE pricing_urgency_rules
     SET label = ?,
         surcharge_type_code = ?,
         surcharge_value = ?,
         sort_order = ?,
         is_active = ?,
         updated_at = UTC_TIMESTAMP(6)
     WHERE id = ?`,
    [next.label, next.surchargeType, next.surchargeValue, next.sortOrder, next.isActive ? 1 : 0, existing.id]
  );

  await createAuditEvent({
    actionCode: 'pricing_rule.updated',
    actionLabel: 'Urgency pricing rule updated',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    entityPk: existing.id,
    entityTableName: 'pricing_urgency_rules',
    sourceModule: 'settings_workspace',
    summaryOldValue: mapUrgency(existing),
    summaryNewValue: next,
  });

  return mapUrgency(await getUrgencyById(ruleId));
};

export const archiveUrgencyRule = async (actor: AdminActor, ruleId: string) => {
  const existing = await getUrgencyById(ruleId);
  await executeStatement(
    `UPDATE pricing_urgency_rules SET is_active = 0, updated_at = UTC_TIMESTAMP(6) WHERE id = ?`,
    [existing.id]
  );

  await createAuditEvent({
    actionCode: 'pricing_rule.archived',
    actionLabel: 'Urgency pricing rule archived',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    changes: [{ fieldName: 'is_active', oldValue: Boolean(existing.isActive), newValue: false }],
    entityPk: existing.id,
    entityTableName: 'pricing_urgency_rules',
    sourceModule: 'settings_workspace',
  });

  return mapUrgency(await getUrgencyById(ruleId));
};
