import type { RowDataPacket } from 'mysql2/promise';
import { queryRows } from '../../lib/mysql.js';

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
         ur.role_code AS roleCode,
         rp.permission_code AS permissionCode
       FROM users u
       LEFT JOIN user_roles ur
         ON ur.user_id = u.id
        AND ur.is_active = 1
        AND (ur.starts_at IS NULL OR ur.starts_at <= UTC_TIMESTAMP(6))
        AND (ur.ends_at IS NULL OR ur.ends_at >= UTC_TIMESTAMP(6))
       LEFT JOIN role_permissions rp ON rp.role_code = ur.role_code
       WHERE u.archived_at IS NULL
         AND u.login_enabled = 1
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
