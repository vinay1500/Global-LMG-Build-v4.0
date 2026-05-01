import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { badRequest, forbidden, notFound } from '../../lib/httpErrors.js';
import { executeStatement, queryRows, withTransaction, type QueryExecutor } from '../../lib/mysql.js';
import type { AdminActor } from '../auth/service.js';
import { createAuditEvent } from '../writeSupport.js';

type RoleRow = RowDataPacket & {
  code: string;
  description: string | null;
  isActive: number;
  isSystem: number;
  name: string;
  permissionCode: string | null;
  userCount: number;
};

type PermissionRow = RowDataPacket & {
  actionName: string;
  code: string;
  description: string | null;
  moduleName: string;
};

type UserRoleRow = RowDataPacket & {
  displayName: string;
  email: string;
  permissionCode: string | null;
  publicId: string;
  roleCode: string | null;
};

type RoleDetailRow = RowDataPacket & {
  code: string;
  description: string | null;
  isActive: number;
  isSystem: number;
  name: string;
};

type UserDetailRow = RowDataPacket & {
  actorTypeCode: string;
  displayName: string;
  email: string;
  id: number;
  publicId: string;
};

type CountRow = RowDataPacket & {
  countValue: number;
};

type RolePayload = {
  code?: string;
  description?: string;
  name: string;
};

type RoleUpdatePayload = {
  description?: string;
  isActive?: boolean;
  name?: string;
};

const CRITICAL_PERMISSIONS = ['dashboard.view', 'settings.manage', 'rbac.manage'];
const SYSTEM_ROLE_CODES = new Set(['ops_admin', 'client']);

const normalizeRoleCode = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);

const actorRole = (actor: AdminActor) => actor.roleCodes[0] || 'ops_admin';

const roleEntitySummary = (role: Pick<RoleDetailRow, 'code' | 'name'>) => ({
  code: role.code,
  name: role.name,
});

const getRole = async (roleCode: string, executor?: QueryExecutor) => {
  const rows = await queryRows<RoleDetailRow>(
    `SELECT code, name, description, is_system AS isSystem, is_active AS isActive
     FROM roles
     WHERE code = ?
     LIMIT 1`,
    [roleCode],
    executor
  );

  return rows[0] || null;
};

const getUser = async (userPublicId: string, executor?: QueryExecutor) => {
  const rows = await queryRows<UserDetailRow>(
    `SELECT
       id,
       public_id AS publicId,
       display_name AS displayName,
       email,
       actor_type_code AS actorTypeCode
     FROM users
     WHERE public_id = ?
       AND archived_at IS NULL
       AND login_enabled = 1
     LIMIT 1`,
    [userPublicId],
    executor
  );

  return rows[0] || null;
};

const getPermissionCodes = async (executor?: QueryExecutor) => {
  const rows = await queryRows<RowDataPacket & { code: string }>(
    `SELECT code FROM permissions`,
    [],
    executor
  );

  return new Set(rows.map((row) => row.code));
};

const getCurrentRolePermissionCodes = async (roleCode: string, executor?: QueryExecutor) => {
  const rows = await queryRows<RowDataPacket & { permissionCode: string }>(
    `SELECT permission_code AS permissionCode
     FROM role_permissions
     WHERE role_code = ?
     ORDER BY permission_code ASC`,
    [roleCode],
    executor
  );

  return rows.map((row) => row.permissionCode);
};

const activeOpsAdminCount = async (executor?: QueryExecutor) => {
  const rows = await queryRows<CountRow>(
    `SELECT COUNT(DISTINCT u.id) AS countValue
     FROM users u
     JOIN user_roles ur
       ON ur.user_id = u.id
      AND ur.role_code = 'ops_admin'
      AND ur.is_active = 1
      AND (ur.starts_at IS NULL OR ur.starts_at <= UTC_TIMESTAMP(6))
      AND (ur.ends_at IS NULL OR ur.ends_at >= UTC_TIMESTAMP(6))
     JOIN roles r
       ON r.code = ur.role_code
      AND r.is_active = 1
     WHERE u.archived_at IS NULL
       AND u.login_enabled = 1`,
    [],
    executor
  );

  return Number(rows[0]?.countValue || 0);
};

const activeRbacManageRoleCount = async (executor?: QueryExecutor) => {
  const rows = await queryRows<CountRow>(
    `SELECT COUNT(DISTINCT r.code) AS countValue
     FROM roles r
     JOIN role_permissions rp ON rp.role_code = r.code
     WHERE r.is_active = 1
       AND rp.permission_code = 'rbac.manage'`,
    [],
    executor
  );

  return Number(rows[0]?.countValue || 0);
};

const getUserEffectivePermissions = async (
  userId: number,
  options: {
    excludeRoleCode?: string;
    overrideRolePermissions?: { permissionCodes: string[]; roleCode: string };
  } = {},
  executor?: QueryExecutor
) => {
  const rows = await queryRows<RowDataPacket & { permissionCode: string; roleCode: string }>(
    `SELECT ur.role_code AS roleCode, rp.permission_code AS permissionCode
     FROM user_roles ur
     JOIN roles r
       ON r.code = ur.role_code
      AND r.is_active = 1
     JOIN role_permissions rp ON rp.role_code = ur.role_code
     WHERE ur.user_id = ?
       AND ur.role_code <> 'client'
       AND ur.is_active = 1
       AND (ur.starts_at IS NULL OR ur.starts_at <= UTC_TIMESTAMP(6))
       AND (ur.ends_at IS NULL OR ur.ends_at >= UTC_TIMESTAMP(6))`,
    [userId],
    executor
  );

  const permissions = new Set<string>();
  for (const row of rows) {
    if (row.roleCode === options.excludeRoleCode) {
      continue;
    }

    if (row.roleCode === options.overrideRolePermissions?.roleCode) {
      options.overrideRolePermissions.permissionCodes.forEach((code) => permissions.add(code));
      continue;
    }

    permissions.add(row.permissionCode);
  }

  return permissions;
};

const assertActorKeepsCriticalAccess = async (
  actor: AdminActor,
  options: {
    excludeRoleCode?: string;
    overrideRolePermissions?: { permissionCodes: string[]; roleCode: string };
  },
  executor?: QueryExecutor
) => {
  const permissions = await getUserEffectivePermissions(actor.userId, options, executor);
  const missing = CRITICAL_PERMISSIONS.filter((permission) => !permissions.has(permission));

  if (missing.length > 0) {
    throw forbidden(
      'rbac_self_lockout_blocked',
      `This change would remove your critical admin access: ${missing.join(', ')}.`
    );
  }
};

const assertRoleCanBeEdited = (role: RoleDetailRow) => {
  if (role.isSystem || SYSTEM_ROLE_CODES.has(role.code)) {
    throw forbidden(
      'system_role_protected',
      'System roles are protected. Create a custom role for editable access policies.'
    );
  }
};

const validatePermissionCodes = async (permissionCodes: string[], executor?: QueryExecutor) => {
  const available = await getPermissionCodes(executor);
  const unique = Array.from(new Set(permissionCodes));
  const invalid = unique.filter((permissionCode) => !available.has(permissionCode));

  if (invalid.length > 0) {
    throw badRequest('invalid_permission_codes', 'One or more permissions are not registered.', invalid);
  }

  return unique.sort();
};

const auditRbacChange = (
  actor: AdminActor,
  input: {
    actionCode: string;
    actionLabel: string;
    changes?: Array<{ fieldName: string; newValue?: unknown; oldValue?: unknown }>;
    summaryNewValue?: unknown;
    summaryOldValue?: unknown;
  },
  executor?: QueryExecutor
) =>
  createAuditEvent(
    {
      actionCode: input.actionCode,
      actionLabel: input.actionLabel,
      actorRoleCode: actorRole(actor),
      actorUserId: actor.userId,
      changes: input.changes,
      entityPk: null,
      entityTableName: 'roles',
      sourceModule: 'settings_rbac',
      summaryNewValue: input.summaryNewValue,
      summaryOldValue: input.summaryOldValue,
    },
    executor
  );

export const getWorkspace = async () => {
  const [roleRows, permissionRows, userRows] = await Promise.all([
    queryRows<RoleRow>(
      `SELECT
         r.code,
         r.name,
         r.description,
         r.is_system AS isSystem,
         r.is_active AS isActive,
         rp.permission_code AS permissionCode,
         COALESCE(usage_counts.userCount, 0) AS userCount
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_code = r.code
       LEFT JOIN (
         SELECT role_code, COUNT(DISTINCT user_id) AS userCount
         FROM user_roles
         WHERE is_active = 1
           AND (starts_at IS NULL OR starts_at <= UTC_TIMESTAMP(6))
           AND (ends_at IS NULL OR ends_at >= UTC_TIMESTAMP(6))
         GROUP BY role_code
       ) AS usage_counts ON usage_counts.role_code = r.code
       ORDER BY r.name ASC, rp.permission_code ASC`
    ),
    queryRows<PermissionRow>(
      `SELECT code, module_name AS moduleName, action_name AS actionName, description
       FROM permissions
       ORDER BY module_name ASC, action_name ASC`
    ),
    queryRows<UserRoleRow>(
      `SELECT
         u.public_id AS publicId,
         u.display_name AS displayName,
         u.email,
         r.code AS roleCode,
         rp.permission_code AS permissionCode
       FROM users u
       LEFT JOIN user_roles ur
         ON ur.user_id = u.id
        AND ur.is_active = 1
        AND (ur.starts_at IS NULL OR ur.starts_at <= UTC_TIMESTAMP(6))
        AND (ur.ends_at IS NULL OR ur.ends_at >= UTC_TIMESTAMP(6))
       LEFT JOIN roles r
         ON r.code = ur.role_code
        AND r.is_active = 1
       LEFT JOIN role_permissions rp ON rp.role_code = r.code
       WHERE u.archived_at IS NULL
         AND u.login_enabled = 1
         AND (
           u.actor_type_code <> 'client'
           OR EXISTS (
             SELECT 1
             FROM user_roles staff_role
             WHERE staff_role.user_id = u.id
               AND staff_role.role_code <> 'client'
               AND staff_role.is_active = 1
               AND (staff_role.starts_at IS NULL OR staff_role.starts_at <= UTC_TIMESTAMP(6))
               AND (staff_role.ends_at IS NULL OR staff_role.ends_at >= UTC_TIMESTAMP(6))
           )
         )
       ORDER BY u.display_name ASC`
    ),
  ]);

  const rolesByCode = new Map<
    string,
    {
      code: string;
      description: string;
      isActive: boolean;
      isSystem: boolean;
      name: string;
      permissionCodes: string[];
      userCount: number;
    }
  >();

  for (const row of roleRows) {
    const current =
      rolesByCode.get(row.code) ||
      {
        code: row.code,
        description: row.description || '',
        isActive: Boolean(row.isActive),
        isSystem: Boolean(row.isSystem),
        name: row.name,
        permissionCodes: [],
        userCount: row.userCount,
      };

    if (row.permissionCode && !current.permissionCodes.includes(row.permissionCode)) {
      current.permissionCodes.push(row.permissionCode);
    }

    rolesByCode.set(row.code, current);
  }

  const usersById = new Map<
    string,
    {
      displayName: string;
      email: string;
      id: string;
      permissionCodes: string[];
      roleCodes: string[];
    }
  >();

  for (const row of userRows) {
    const current =
      usersById.get(row.publicId) ||
      {
        displayName: row.displayName,
        email: row.email,
        id: row.publicId,
        permissionCodes: [],
        roleCodes: [],
      };

    if (row.roleCode && !current.roleCodes.includes(row.roleCode)) {
      current.roleCodes.push(row.roleCode);
    }

    if (row.permissionCode && !current.permissionCodes.includes(row.permissionCode)) {
      current.permissionCodes.push(row.permissionCode);
    }

    usersById.set(row.publicId, current);
  }

  return {
    permissions: permissionRows.map((row) => ({
      actionName: row.actionName,
      code: row.code,
      description: row.description || '',
      moduleName: row.moduleName,
    })),
    roles: Array.from(rolesByCode.values()),
    users: Array.from(usersById.values()),
  };
};

export const createRole = async (actor: AdminActor, payload: RolePayload) => {
  const roleCode = normalizeRoleCode(payload.code || payload.name);
  if (!roleCode) {
    throw badRequest('invalid_role_code', 'Role code must contain letters or numbers.');
  }

  if (SYSTEM_ROLE_CODES.has(roleCode)) {
    throw forbidden('system_role_protected', 'That role code is reserved for a protected system role.');
  }

  return withTransaction(async (connection) => {
    const existing = await getRole(roleCode, connection);
    if (existing) {
      throw badRequest('role_already_exists', 'A role with this code already exists.');
    }

    await executeStatement<ResultSetHeader>(
      `INSERT INTO roles (
         code,
         name,
         description,
         is_system,
         is_active,
         created_at,
         updated_at
       ) VALUES (?, ?, ?, 0, 1, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))`,
      [roleCode, payload.name.trim(), payload.description?.trim() || null],
      connection
    );

    const role = await getRole(roleCode, connection);
    if (!role) {
      throw notFound('role_not_found', 'Role could not be loaded after creation.');
    }

    await auditRbacChange(
      actor,
      {
        actionCode: 'role.created',
        actionLabel: 'Role created',
        summaryNewValue: roleEntitySummary(role),
      },
      connection
    );

    return role;
  });
};

export const updateRole = async (
  actor: AdminActor,
  roleCode: string,
  payload: RoleUpdatePayload
) => {
  return withTransaction(async (connection) => {
    const role = await getRole(roleCode, connection);
    if (!role) {
      throw notFound('role_not_found', 'Role was not found.');
    }
    assertRoleCanBeEdited(role);

    if (payload.isActive === false && role.isActive && role.code === 'ops_admin') {
      throw forbidden('last_ops_admin_blocked', 'The ops_admin role cannot be disabled.');
    }

    if (payload.isActive === false && actor.roleCodes.includes(role.code)) {
      await assertActorKeepsCriticalAccess(actor, { excludeRoleCode: role.code }, connection);
    }

    const nextName = payload.name?.trim() || role.name;
    const nextDescription = payload.description !== undefined ? payload.description.trim() || null : role.description;
    const nextActive = payload.isActive === undefined ? Boolean(role.isActive) : payload.isActive;

    await executeStatement(
      `UPDATE roles
       SET name = ?,
           description = ?,
           is_active = ?,
           updated_at = UTC_TIMESTAMP(6)
       WHERE code = ?`,
      [nextName, nextDescription, nextActive ? 1 : 0, role.code],
      connection
    );

    if ((await activeRbacManageRoleCount(connection)) === 0) {
      throw forbidden('rbac_manage_required', 'At least one active role must retain rbac.manage.');
    }

    const updated = (await getRole(role.code, connection))!;
    await auditRbacChange(
      actor,
      {
        actionCode: 'role.updated',
        actionLabel: 'Role updated',
        changes: [
          { fieldName: 'name', newValue: updated.name, oldValue: role.name },
          { fieldName: 'description', newValue: updated.description, oldValue: role.description },
          { fieldName: 'is_active', newValue: Boolean(updated.isActive), oldValue: Boolean(role.isActive) },
        ],
        summaryNewValue: roleEntitySummary(updated),
        summaryOldValue: roleEntitySummary(role),
      },
      connection
    );

    return updated;
  });
};

export const archiveRole = async (actor: AdminActor, roleCode: string) => {
  return withTransaction(async (connection) => {
    const role = await getRole(roleCode, connection);
    if (!role) {
      throw notFound('role_not_found', 'Role was not found.');
    }
    assertRoleCanBeEdited(role);

    if (actor.roleCodes.includes(role.code)) {
      await assertActorKeepsCriticalAccess(actor, { excludeRoleCode: role.code }, connection);
    }

    await executeStatement(
      `UPDATE roles
       SET is_active = 0,
           updated_at = UTC_TIMESTAMP(6)
       WHERE code = ?`,
      [role.code],
      connection
    );

    if ((await activeRbacManageRoleCount(connection)) === 0) {
      throw forbidden('rbac_manage_required', 'At least one active role must retain rbac.manage.');
    }

    const updated = (await getRole(role.code, connection))!;
    await auditRbacChange(
      actor,
      {
        actionCode: 'role.archived',
        actionLabel: 'Role archived',
        changes: [{ fieldName: 'is_active', newValue: false, oldValue: Boolean(role.isActive) }],
        summaryNewValue: roleEntitySummary(updated),
        summaryOldValue: roleEntitySummary(role),
      },
      connection
    );

    return updated;
  });
};

export const updateRolePermissions = async (
  actor: AdminActor,
  roleCode: string,
  permissionCodes: string[]
) => {
  return withTransaction(async (connection) => {
    const role = await getRole(roleCode, connection);
    if (!role) {
      throw notFound('role_not_found', 'Role was not found.');
    }
    assertRoleCanBeEdited(role);

    const nextPermissionCodes = await validatePermissionCodes(permissionCodes, connection);
    if (actor.roleCodes.includes(role.code)) {
      await assertActorKeepsCriticalAccess(
        actor,
        { overrideRolePermissions: { permissionCodes: nextPermissionCodes, roleCode: role.code } },
        connection
      );
    }

    const previousPermissionCodes = await getCurrentRolePermissionCodes(role.code, connection);
    await executeStatement(`DELETE FROM role_permissions WHERE role_code = ?`, [role.code], connection);
    for (const permissionCode of nextPermissionCodes) {
      await executeStatement(
        `INSERT INTO role_permissions (role_code, permission_code, granted_at)
         VALUES (?, ?, UTC_TIMESTAMP(6))`,
        [role.code, permissionCode],
        connection
      );
    }

    if ((await activeRbacManageRoleCount(connection)) === 0) {
      throw forbidden('rbac_manage_required', 'At least one active role must retain rbac.manage.');
    }

    await auditRbacChange(
      actor,
      {
        actionCode: 'role.permissions_updated',
        actionLabel: 'Role permissions updated',
        changes: [
          {
            fieldName: 'permission_codes',
            newValue: nextPermissionCodes,
            oldValue: previousPermissionCodes,
          },
        ],
        summaryNewValue: { code: role.code, permissionCodes: nextPermissionCodes },
        summaryOldValue: { code: role.code, permissionCodes: previousPermissionCodes },
      },
      connection
    );

    return (await getRole(role.code, connection))!;
  });
};

export const assignUserRole = async (actor: AdminActor, userPublicId: string, roleCode: string) => {
  return withTransaction(async (connection) => {
    const user = await getUser(userPublicId, connection);
    const role = await getRole(roleCode, connection);
    if (!user) {
      throw notFound('user_not_found', 'User was not found.');
    }
    if (!role) {
      throw notFound('role_not_found', 'Role was not found.');
    }
    if (!role.isActive || role.code === 'client') {
      throw badRequest('role_not_assignable', 'Only active admin roles can be assigned here.');
    }
    if (user.actorTypeCode === 'client') {
      throw forbidden('client_role_assignment_blocked', 'Client portal users cannot receive admin roles here.');
    }

    const activeRows = await queryRows<RowDataPacket & { id: number }>(
      `SELECT id
       FROM user_roles
       WHERE user_id = ?
         AND role_code = ?
         AND is_active = 1
         AND (starts_at IS NULL OR starts_at <= UTC_TIMESTAMP(6))
         AND (ends_at IS NULL OR ends_at >= UTC_TIMESTAMP(6))
       LIMIT 1`,
      [user.id, role.code],
      connection
    );

    if (activeRows.length === 0) {
      const existingRows = await queryRows<RowDataPacket & { id: number }>(
        `SELECT id
         FROM user_roles
         WHERE user_id = ?
           AND role_code = ?
         ORDER BY id DESC
         LIMIT 1`,
        [user.id, role.code],
        connection
      );

      if (existingRows[0]) {
        await executeStatement(
          `UPDATE user_roles
           SET granted_by_user_id = ?,
               starts_at = NULL,
               ends_at = NULL,
               is_active = 1
           WHERE id = ?`,
          [actor.userId, existingRows[0].id],
          connection
        );
      } else {
        await executeStatement(
          `INSERT INTO user_roles (
             user_id,
             role_code,
             granted_by_user_id,
             starts_at,
             ends_at,
             is_active,
             granted_at
           ) VALUES (?, ?, ?, NULL, NULL, 1, UTC_TIMESTAMP(6))`,
          [user.id, role.code, actor.userId],
          connection
        );
      }
    }

    await auditRbacChange(
      actor,
      {
        actionCode: 'user_role.assigned',
        actionLabel: 'User role assigned',
        summaryNewValue: {
          roleCode: role.code,
          userEmail: user.email,
          userId: user.publicId,
        },
      },
      connection
    );

    return { status: 'assigned' as const };
  });
};

export const removeUserRole = async (actor: AdminActor, userPublicId: string, roleCode: string) => {
  return withTransaction(async (connection) => {
    const user = await getUser(userPublicId, connection);
    const role = await getRole(roleCode, connection);
    if (!user) {
      throw notFound('user_not_found', 'User was not found.');
    }
    if (!role) {
      throw notFound('role_not_found', 'Role was not found.');
    }
    if (role.code === 'client') {
      throw forbidden('client_role_protected', 'Client portal role removal is not managed here.');
    }

    if (role.code === 'ops_admin' && (await activeOpsAdminCount(connection)) <= 1) {
      throw forbidden('last_ops_admin_blocked', 'The last active ops_admin assignment cannot be removed.');
    }

    if (user.id === actor.userId) {
      await assertActorKeepsCriticalAccess(actor, { excludeRoleCode: role.code }, connection);
    }

    const result = await executeStatement<ResultSetHeader>(
      `UPDATE user_roles
       SET ends_at = UTC_TIMESTAMP(6)
       WHERE user_id = ?
         AND role_code = ?
         AND is_active = 1
         AND (starts_at IS NULL OR starts_at <= UTC_TIMESTAMP(6))
         AND (ends_at IS NULL OR ends_at >= UTC_TIMESTAMP(6))`,
      [user.id, role.code],
      connection
    );

    if (result.affectedRows > 0) {
      await auditRbacChange(
        actor,
        {
          actionCode: 'user_role.removed',
          actionLabel: 'User role removed',
          summaryOldValue: {
            roleCode: role.code,
            userEmail: user.email,
            userId: user.publicId,
          },
        },
        connection
      );
    }

    return { status: 'removed' as const };
  });
};
