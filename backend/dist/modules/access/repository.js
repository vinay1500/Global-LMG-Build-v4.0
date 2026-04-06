import { notFound } from '../../lib/httpErrors.js';
import { selectAll, selectOne, withConnection } from '../../lib/mysqlUtils.js';
import { ensurePlatformReady } from '../platform/bootstrap.js';
export class AccessRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async initialize() {
        await ensurePlatformReady();
    }
    async getActorByPublicId(userPublicId) {
        await this.initialize();
        return withConnection(this.pool, async (connection) => {
            const actor = await selectOne(connection, `SELECT
           u.id AS user_id,
           u.public_id,
           u.display_name,
           u.email,
           u.actor_type_code,
           cac.client_account_id
         FROM users u
         LEFT JOIN client_account_contacts cac
           ON cac.user_id = u.id
           AND cac.portal_access_enabled = 1
           AND cac.archived_at IS NULL
         WHERE u.public_id = ?
           AND u.archived_at IS NULL
         LIMIT 1`, [userPublicId]);
            if (!actor) {
                throw notFound('actor_not_found', 'Authenticated actor could not be resolved.');
            }
            const roles = await selectAll(connection, `SELECT ur.role_code
         FROM user_roles ur
         WHERE ur.user_id = ?
           AND ur.is_active = 1
           AND (ur.starts_at IS NULL OR ur.starts_at <= UTC_TIMESTAMP(6))
           AND (ur.ends_at IS NULL OR ur.ends_at > UTC_TIMESTAMP(6))`, [actor.user_id]);
            const permissions = await selectAll(connection, `SELECT DISTINCT rp.permission_code
         FROM user_roles ur
         INNER JOIN role_permissions rp
           ON rp.role_code = ur.role_code
         WHERE ur.user_id = ?
           AND ur.is_active = 1
           AND (ur.starts_at IS NULL OR ur.starts_at <= UTC_TIMESTAMP(6))
           AND (ur.ends_at IS NULL OR ur.ends_at > UTC_TIMESTAMP(6))`, [actor.user_id]);
            return {
                actorTypeCode: actor.actor_type_code,
                clientAccountId: actor.client_account_id,
                displayName: actor.display_name,
                email: actor.email,
                permissionCodes: permissions.map((entry) => entry.permission_code),
                publicId: actor.public_id,
                roleCodes: roles.map((entry) => entry.role_code),
                userId: actor.user_id,
            };
        });
    }
}
