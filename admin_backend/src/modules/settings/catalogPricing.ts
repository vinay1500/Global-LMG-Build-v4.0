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
  baseFee: number;
  code: string;
  dbId: number;
  description: string | null;
  domainCode: string;
  domainName: string;
  icon: string | null;
  id: string;
  isActive: number;
  name: string;
  sortOrder: number;
};

type ConsultationModeRow = RowDataPacket & {
  code: string;
  description: string | null;
  isActive: number;
  label: string;
  sortOrder: number;
  surchargeValue: number | null;
  transportDisclaimer: string | null;
};

type CountryPricingRow = RowDataPacket & {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  id: string;
  isActive: number;
  isDefault: number;
  multiplier: number;
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
  responseWindowHours: number | null;
  sortOrder: number;
  surchargeType: string;
  surchargeValue: number;
};

export type CreateServiceInput = {
  baseFee?: number;
  code?: string;
  description?: string | null;
  domainCode: string;
  icon?: string | null;
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
  responseWindowHours?: number | null;
  sortOrder?: number;
  surchargeType: 'flat' | 'percent';
  surchargeValue: number;
};

export type UpdateUrgencyRuleInput = Partial<Omit<UrgencyRuleInput, 'code'>>;

export type ConsultationModeInput = {
  code?: string;
  description?: string | null;
  isActive?: boolean;
  label: string;
  sortOrder?: number;
  surchargeValue?: number;
  transportDisclaimer?: string | null;
};

export type UpdateConsultationModeInput = Partial<Omit<ConsultationModeInput, 'code'>>;

export type CountryPricingInput = {
  countryCode?: string;
  countryName: string;
  currencyCode: string;
  isActive?: boolean;
  isDefault?: boolean;
  multiplier: number;
};

export type UpdateCountryPricingInput = Partial<Omit<CountryPricingInput, 'countryCode'>>;

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
  assertNonNegativeAmount(payload.baseFee ?? 1000, 'baseFee');

  return {
    code,
    baseFee: payload.baseFee ?? 1000,
    description: payload.description?.trim() || null,
    domainCode,
    icon: payload.icon?.trim() || null,
    isActive: payload.isActive ?? true,
    name,
    sortOrder: payload.sortOrder ?? 0,
  };
};

const normalizeCurrency = (value: string) => value.trim().toUpperCase();
const normalizeCountryCode = (value: string) => value.trim().toUpperCase().slice(0, 8);

const mapService = (row: ServiceRow) => ({
  baseFee: Number(row.baseFee || 0),
  code: row.code,
  description: row.description || '',
  domainCode: row.domainCode,
  domainName: row.domainName,
  icon: row.icon || 'Briefcase',
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
  responseWindowHours: row.responseWindowHours === null ? null : Number(row.responseWindowHours),
  sortOrder: Number(row.sortOrder || 0),
  surchargeType: row.surchargeType,
  surchargeValue: Number(row.surchargeValue || 0),
});

const mapConsultationMode = (row: ConsultationModeRow) => ({
  code: row.code,
  description: row.description || '',
  isActive: Boolean(row.isActive),
  label: row.label,
  sortOrder: Number(row.sortOrder || 0),
  surchargeValue: Number(row.surchargeValue || 0),
  transportDisclaimer: row.transportDisclaimer || '',
});

const mapCountryPricing = (row: CountryPricingRow) => ({
  countryCode: row.countryCode,
  countryName: row.countryName,
  currencyCode: row.currencyCode,
  id: row.id,
  isActive: Boolean(row.isActive),
  isDefault: Boolean(row.isDefault),
  multiplier: Number(row.multiplier || 0),
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
         s.base_fee_amount AS baseFee,
         s.service_icon_code AS icon,
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
         response_window_hours AS responseWindowHours,
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
         s.base_fee_amount AS baseFee,
         s.service_icon_code AS icon,
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
  const [slabRows, urgencyRows, consultationRows, countryRows] = await Promise.all([
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
         response_window_hours AS responseWindowHours,
         surcharge_type_code AS surchargeType,
         surcharge_value AS surchargeValue,
         sort_order AS sortOrder,
         is_active AS isActive
       FROM pricing_urgency_rules
       ORDER BY sort_order ASC, label ASC`
    ),
    queryRows<ConsultationModeRow>(
      `SELECT
         cm.code,
         cm.label,
         cm.description_text AS description,
         cm.transport_disclaimer_text AS transportDisclaimer,
         cm.sort_order AS sortOrder,
         cm.is_active AS isActive,
         pcmr.surcharge_value AS surchargeValue
       FROM consultation_modes cm
       LEFT JOIN pricing_consultation_mode_rules pcmr
         ON pcmr.consultation_mode_code = cm.code
        AND pcmr.is_active = 1
       ORDER BY cm.sort_order ASC, cm.label ASC`
    ),
    queryRows<CountryPricingRow>(
      `SELECT
         public_id AS id,
         country_code AS countryCode,
         country_name AS countryName,
         currency_code AS currencyCode,
         price_multiplier AS multiplier,
         is_default AS isDefault,
         is_active AS isActive
       FROM country_pricing_overrides
       WHERE archived_at IS NULL
       ORDER BY is_default DESC, country_name ASC`
    ),
  ]);

  return {
    consultationModes: consultationRows.map(mapConsultationMode),
    countryPricing: countryRows.map(mapCountryPricing),
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
         base_fee_amount,
         service_icon_code,
         sort_order,
         is_active,
         is_subscription_eligible,
         created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))`,
      [
        createPublicId(),
        next.code,
        domain.id,
        next.name,
        next.description,
        next.baseFee,
        next.icon,
        next.sortOrder,
        next.isActive ? 1 : 0,
      ],
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
          { fieldName: 'base_fee_amount', newValue: next.baseFee },
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
    baseFee: payload.baseFee ?? Number(existing.baseFee || 0),
    icon: payload.icon === undefined ? existing.icon : payload.icon?.trim() || null,
    isActive: payload.isActive ?? Boolean(existing.isActive),
    name: payload.name?.trim() || existing.name,
    sortOrder: payload.sortOrder ?? Number(existing.sortOrder || 0),
  };

  if (next.name.length < 2 || next.name.length > 180) {
    throw badRequest('invalid_service_name', 'Service name must be between 2 and 180 characters.');
  }
  assertNonNegativeAmount(next.baseFee, 'baseFee');

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
           base_fee_amount = ?,
           service_icon_code = ?,
           sort_order = ?,
           is_active = ?,
           updated_at = UTC_TIMESTAMP(6)
       WHERE id = ?`,
      [
        domain.id,
        next.name,
        next.description,
        next.baseFee,
        next.icon,
        next.sortOrder,
        next.isActive ? 1 : 0,
        existing.dbId,
      ],
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
          { fieldName: 'base_fee_amount', oldValue: Number(existing.baseFee || 0), newValue: next.baseFee },
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
  if (
    payload.responseWindowHours !== null &&
    payload.responseWindowHours !== undefined &&
    (!Number.isInteger(payload.responseWindowHours) || payload.responseWindowHours <= 0)
  ) {
    throw badRequest('invalid_response_window', 'Response window hours must be a positive whole number.');
  }

  return {
    code,
    isActive: payload.isActive ?? true,
    label,
    responseWindowHours: payload.responseWindowHours ?? null,
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
       response_window_hours,
       surcharge_type_code,
       surcharge_value,
       sort_order,
       is_active,
       created_at,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))`,
    [
      next.code,
      next.label,
      next.responseWindowHours,
      next.surchargeType,
      next.surchargeValue,
      next.sortOrder,
      next.isActive ? 1 : 0,
    ]
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
    responseWindowHours:
      payload.responseWindowHours === undefined ? existing.responseWindowHours : payload.responseWindowHours,
    sortOrder: payload.sortOrder ?? Number(existing.sortOrder || 0),
    surchargeType: payload.surchargeType || (existing.surchargeType as 'flat' | 'percent'),
    surchargeValue: payload.surchargeValue ?? Number(existing.surchargeValue || 0),
  });

  await executeStatement(
    `UPDATE pricing_urgency_rules
     SET label = ?,
         response_window_hours = ?,
         surcharge_type_code = ?,
         surcharge_value = ?,
         sort_order = ?,
         is_active = ?,
         updated_at = UTC_TIMESTAMP(6)
     WHERE id = ?`,
    [
      next.label,
      next.responseWindowHours,
      next.surchargeType,
      next.surchargeValue,
      next.sortOrder,
      next.isActive ? 1 : 0,
      existing.id,
    ]
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

const getConsultationModeByCode = async (modeCode: string, executor?: QueryExecutor) => {
  const row = firstRow(
    await queryRows<ConsultationModeRow>(
      `SELECT
         cm.code,
         cm.label,
         cm.description_text AS description,
         cm.transport_disclaimer_text AS transportDisclaimer,
         cm.sort_order AS sortOrder,
         cm.is_active AS isActive,
         pcmr.surcharge_value AS surchargeValue
       FROM consultation_modes cm
       LEFT JOIN pricing_consultation_mode_rules pcmr
         ON pcmr.consultation_mode_code = cm.code
        AND pcmr.is_active = 1
       WHERE cm.code = ?
       LIMIT 1`,
      [modeCode],
      executor
    )
  );

  if (!row) {
    throw notFound('consultation_mode_not_found', 'Consultation mode not found.');
  }

  return row;
};

const normalizeConsultationModeInput = (payload: ConsultationModeInput) => {
  const label = payload.label.trim();
  const code = (payload.code?.trim() || toSlug(label)).toLowerCase();
  if (!label) {
    throw badRequest('invalid_consultation_label', 'Consultation mode label is required.');
  }
  if (!CODE_PATTERN.test(code)) {
    throw badRequest('invalid_consultation_code', 'Consultation mode code must be a lowercase slug.');
  }
  assertNonNegativeAmount(payload.surchargeValue ?? 0, 'surchargeValue');

  return {
    code,
    description: payload.description?.trim() || null,
    isActive: payload.isActive ?? true,
    label,
    sortOrder: payload.sortOrder ?? 0,
    surchargeValue: payload.surchargeValue ?? 0,
    transportDisclaimer: payload.transportDisclaimer?.trim() || null,
  };
};

export const createConsultationMode = async (actor: AdminActor, payload: ConsultationModeInput) => {
  const next = normalizeConsultationModeInput(payload);
  const duplicate = firstRow(
    await queryRows<RowDataPacket & { code: string }>(
      'SELECT code FROM consultation_modes WHERE code = ? LIMIT 1',
      [next.code]
    )
  );
  if (duplicate) {
    throw new AppError(409, 'consultation_mode_duplicate', 'A consultation mode with this code already exists.');
  }

  return withTransaction(async (connection) => {
    await executeStatement(
      `INSERT INTO consultation_modes (
         code, label, description_text, transport_disclaimer_text, sort_order, is_active
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        next.code,
        next.label,
        next.description,
        next.transportDisclaimer,
        next.sortOrder,
        next.isActive ? 1 : 0,
      ],
      connection
    );
    await executeStatement(
      `INSERT INTO pricing_consultation_mode_rules (
         consultation_mode_code, surcharge_type_code, surcharge_value, is_active, created_at, updated_at
       ) VALUES (?, 'flat', ?, 1, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))
       ON DUPLICATE KEY UPDATE
         surcharge_value = VALUES(surcharge_value),
         is_active = 1,
         updated_at = UTC_TIMESTAMP(6)`,
      [next.code, next.surchargeValue],
      connection
    );
    await createAuditEvent(
      {
        actionCode: 'consultation_mode.created',
        actionLabel: 'Consultation mode created',
        actorRoleCode: actor.roleCodes[0] || 'ops_admin',
        actorUserId: actor.userId,
        entityPk: null,
        entityTableName: 'consultation_modes',
        sourceModule: 'settings_workspace',
        summaryNewValue: next,
      },
      connection
    );

    return mapConsultationMode(await getConsultationModeByCode(next.code, connection));
  });
};

export const updateConsultationMode = async (
  actor: AdminActor,
  modeCode: string,
  payload: UpdateConsultationModeInput
) => {
  const existing = await getConsultationModeByCode(modeCode);
  const next = normalizeConsultationModeInput({
    code: existing.code,
    description: payload.description === undefined ? existing.description : payload.description,
    isActive: payload.isActive ?? Boolean(existing.isActive),
    label: payload.label || existing.label,
    sortOrder: payload.sortOrder ?? Number(existing.sortOrder || 0),
    surchargeValue: payload.surchargeValue ?? Number(existing.surchargeValue || 0),
    transportDisclaimer:
      payload.transportDisclaimer === undefined
        ? existing.transportDisclaimer
        : payload.transportDisclaimer,
  });

  return withTransaction(async (connection) => {
    await executeStatement(
      `UPDATE consultation_modes
       SET label = ?,
           description_text = ?,
           transport_disclaimer_text = ?,
           sort_order = ?,
           is_active = ?
       WHERE code = ?`,
      [
        next.label,
        next.description,
        next.transportDisclaimer,
        next.sortOrder,
        next.isActive ? 1 : 0,
        existing.code,
      ],
      connection
    );
    await executeStatement(
      `INSERT INTO pricing_consultation_mode_rules (
         consultation_mode_code, surcharge_type_code, surcharge_value, is_active, created_at, updated_at
       ) VALUES (?, 'flat', ?, ?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))
       ON DUPLICATE KEY UPDATE
         surcharge_value = VALUES(surcharge_value),
         is_active = VALUES(is_active),
         updated_at = UTC_TIMESTAMP(6)`,
      [existing.code, next.surchargeValue, next.isActive ? 1 : 0],
      connection
    );
    await createAuditEvent(
      {
        actionCode: 'consultation_mode.updated',
        actionLabel: 'Consultation mode updated',
        actorRoleCode: actor.roleCodes[0] || 'ops_admin',
        actorUserId: actor.userId,
        entityPk: null,
        entityTableName: 'consultation_modes',
        sourceModule: 'settings_workspace',
        summaryOldValue: mapConsultationMode(existing),
        summaryNewValue: next,
      },
      connection
    );

    return mapConsultationMode(await getConsultationModeByCode(existing.code, connection));
  });
};

export const archiveConsultationMode = async (actor: AdminActor, modeCode: string) => {
  const existing = await getConsultationModeByCode(modeCode);
  await executeStatement('UPDATE consultation_modes SET is_active = 0 WHERE code = ?', [existing.code]);
  await executeStatement(
    `UPDATE pricing_consultation_mode_rules
     SET is_active = 0, updated_at = UTC_TIMESTAMP(6)
     WHERE consultation_mode_code = ?`,
    [existing.code]
  );
  await createAuditEvent({
    actionCode: 'consultation_mode.archived',
    actionLabel: 'Consultation mode archived',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    entityPk: null,
    entityTableName: 'consultation_modes',
    sourceModule: 'settings_workspace',
    summaryOldValue: mapConsultationMode(existing),
  });

  return mapConsultationMode(await getConsultationModeByCode(existing.code));
};

const getCountryPricingByPublicId = async (countryPricingId: string, executor?: QueryExecutor) => {
  const row = firstRow(
    await queryRows<CountryPricingRow>(
      `SELECT
         public_id AS id,
         country_code AS countryCode,
         country_name AS countryName,
         currency_code AS currencyCode,
         price_multiplier AS multiplier,
         is_default AS isDefault,
         is_active AS isActive
       FROM country_pricing_overrides
       WHERE public_id = ?
         AND archived_at IS NULL
       LIMIT 1`,
      [countryPricingId],
      executor
    )
  );

  if (!row) {
    throw notFound('country_pricing_not_found', 'Country pricing rule not found.');
  }

  return row;
};

const normalizeCountryPricingInput = (payload: CountryPricingInput) => {
  const countryName = payload.countryName.trim();
  const countryCode = normalizeCountryCode(payload.countryCode || countryName);
  const currencyCode = normalizeCurrency(payload.currencyCode);
  if (!countryName) {
    throw badRequest('invalid_country_name', 'Country name is required.');
  }
  if (!countryCode) {
    throw badRequest('invalid_country_code', 'Country code is required.');
  }
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw badRequest('invalid_currency', 'Currency code must be a three-letter ISO code.');
  }
  assertNonNegativeAmount(payload.multiplier, 'multiplier');

  return {
    countryCode,
    countryName,
    currencyCode,
    isActive: payload.isActive ?? true,
    isDefault: payload.isDefault ?? false,
    multiplier: payload.multiplier,
  };
};

export const createCountryPricing = async (actor: AdminActor, payload: CountryPricingInput) => {
  const next = normalizeCountryPricingInput(payload);
  const duplicate = firstRow(
    await queryRows<RowDataPacket & { id: number }>(
      'SELECT id FROM country_pricing_overrides WHERE country_code = ? LIMIT 1',
      [next.countryCode]
    )
  );
  if (duplicate) {
    throw new AppError(409, 'country_pricing_duplicate', 'A pricing rule for this country already exists.');
  }

  return withTransaction(async (connection) => {
    if (next.isDefault) {
      await executeStatement('UPDATE country_pricing_overrides SET is_default = 0', [], connection);
    }
    const result = await executeStatement<ResultSetHeader>(
      `INSERT INTO country_pricing_overrides (
         public_id, country_code, country_name, currency_code, price_multiplier,
         is_default, is_active, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))`,
      [
        createPublicId(),
        next.countryCode,
        next.countryName,
        next.currencyCode,
        next.multiplier,
        next.isDefault ? 1 : 0,
        next.isActive ? 1 : 0,
      ],
      connection
    );
    await createAuditEvent(
      {
        actionCode: 'country_pricing.created',
        actionLabel: 'Country pricing created',
        actorRoleCode: actor.roleCodes[0] || 'ops_admin',
        actorUserId: actor.userId,
        entityPk: result.insertId,
        entityTableName: 'country_pricing_overrides',
        sourceModule: 'settings_workspace',
        summaryNewValue: next,
      },
      connection
    );

    const created = firstRow(
      await queryRows<RowDataPacket & { id: string }>(
        'SELECT public_id AS id FROM country_pricing_overrides WHERE id = ? LIMIT 1',
        [result.insertId],
        connection
      )
    );
    return mapCountryPricing(await getCountryPricingByPublicId(created!.id, connection));
  });
};

export const updateCountryPricing = async (
  actor: AdminActor,
  countryPricingId: string,
  payload: UpdateCountryPricingInput
) => {
  const existing = await getCountryPricingByPublicId(countryPricingId);
  const next = normalizeCountryPricingInput({
    countryCode: existing.countryCode,
    countryName: payload.countryName || existing.countryName,
    currencyCode: payload.currencyCode || existing.currencyCode,
    isActive: payload.isActive ?? Boolean(existing.isActive),
    isDefault: payload.isDefault ?? Boolean(existing.isDefault),
    multiplier: payload.multiplier ?? Number(existing.multiplier || 1),
  });

  return withTransaction(async (connection) => {
    if (next.isDefault) {
      await executeStatement('UPDATE country_pricing_overrides SET is_default = 0', [], connection);
    }
    await executeStatement(
      `UPDATE country_pricing_overrides
       SET country_name = ?,
           currency_code = ?,
           price_multiplier = ?,
           is_default = ?,
           is_active = ?,
           updated_at = UTC_TIMESTAMP(6)
       WHERE public_id = ?`,
      [
        next.countryName,
        next.currencyCode,
        next.multiplier,
        next.isDefault ? 1 : 0,
        next.isActive ? 1 : 0,
        countryPricingId,
      ],
      connection
    );
    await createAuditEvent(
      {
        actionCode: 'country_pricing.updated',
        actionLabel: 'Country pricing updated',
        actorRoleCode: actor.roleCodes[0] || 'ops_admin',
        actorUserId: actor.userId,
        entityPk: null,
        entityTableName: 'country_pricing_overrides',
        sourceModule: 'settings_workspace',
        summaryOldValue: mapCountryPricing(existing),
        summaryNewValue: next,
      },
      connection
    );

    return mapCountryPricing(await getCountryPricingByPublicId(countryPricingId, connection));
  });
};

export const archiveCountryPricing = async (actor: AdminActor, countryPricingId: string) => {
  const existing = await getCountryPricingByPublicId(countryPricingId);
  if (existing.isDefault) {
    throw badRequest('default_country_pricing_protected', 'The default country pricing rule cannot be archived.');
  }
  await executeStatement(
    `UPDATE country_pricing_overrides
     SET is_active = 0,
         archived_at = UTC_TIMESTAMP(6),
         updated_at = UTC_TIMESTAMP(6)
     WHERE public_id = ?`,
    [countryPricingId]
  );
  await createAuditEvent({
    actionCode: 'country_pricing.archived',
    actionLabel: 'Country pricing archived',
    actorRoleCode: actor.roleCodes[0] || 'ops_admin',
    actorUserId: actor.userId,
    entityPk: null,
    entityTableName: 'country_pricing_overrides',
    sourceModule: 'settings_workspace',
    summaryOldValue: mapCountryPricing(existing),
  });

  return { id: countryPricingId, status: 'archived' as const };
};
