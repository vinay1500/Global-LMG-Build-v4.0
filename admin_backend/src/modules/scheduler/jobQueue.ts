import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { createPublicId } from '../../lib/ids.js';
import { getMysqlPool } from '../../lib/mysql.js';
import { executeResult, selectAll, withTransaction } from '../../lib/mysqlUtils.js';

export type AdminAsyncJobTypeCode = 'event_lifecycle';

export interface AdminAsyncJobRecord<TPayload = unknown> {
  attemptCount: number;
  availableAt: string;
  id: number;
  leaseToken: string;
  maxAttempts: number;
  payload: TPayload;
  publicId: string;
  statusCode: string;
  typeCode: AdminAsyncJobTypeCode;
}

interface AdminAsyncJobRow extends RowDataPacket {
  attempt_count: number;
  available_at: string;
  id: number;
  max_attempts: number;
  payload_json: string;
  public_id: string;
  status_code: string;
  type_code: AdminAsyncJobTypeCode;
}

const leaseDurationMs = 5 * 60 * 1000;

const buildRetryAt = (attemptCount: number) => {
  const next = new Date(Date.now() + Math.min(30 * 60_000, 30_000 * Math.max(attemptCount, 1)));
  return toMysqlDateTime(next.toISOString());
};

export const adminJobQueue = {
  async enqueueInTransaction<TPayload>(
    connection: PoolConnection,
    input: {
      dedupeKey?: string | null;
      maxAttempts?: number;
      payload: TPayload;
      typeCode: AdminAsyncJobTypeCode;
    }
  ) {
    const timestamp = toMysqlDateTime(nowUtc());
    const publicId = createPublicId();

    await executeResult(
      connection,
      `INSERT INTO admin_async_jobs (
        public_id,
        type_code,
        dedupe_key,
        status_code,
        payload_json,
        available_at,
        lease_token,
        lease_expires_at,
        claimed_at,
        attempt_count,
        max_attempts,
        last_error,
        completed_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        payload_json = VALUES(payload_json),
        available_at = VALUES(available_at),
        status_code = 'pending',
        lease_token = NULL,
        lease_expires_at = NULL,
        claimed_at = NULL,
        last_error = NULL,
        completed_at = NULL,
        updated_at = VALUES(updated_at)`,
      [
        publicId,
        input.typeCode,
        input.dedupeKey || null,
        'pending',
        JSON.stringify(input.payload),
        timestamp,
        null,
        null,
        null,
        0,
        input.maxAttempts || 8,
        null,
        null,
        timestamp,
        timestamp,
      ]
    );
  },

  async enqueue<TPayload>(input: {
    dedupeKey?: string | null;
    maxAttempts?: number;
    payload: TPayload;
    typeCode: AdminAsyncJobTypeCode;
  }) {
    return withTransaction(getMysqlPool(), async (connection) => {
      await adminJobQueue.enqueueInTransaction(connection, input);
    });
  },

  async claimDueJobs(limit = 20) {
    return withTransaction(getMysqlPool(), async (connection) => {
      const leaseToken = createPublicId();
      const claimedAt = toMysqlDateTime(nowUtc());
      const leaseExpiresAt = toMysqlDateTime(new Date(Date.now() + leaseDurationMs).toISOString());
      const rows = await selectAll<AdminAsyncJobRow>(
        connection,
        `SELECT
           id,
           public_id,
           type_code,
           status_code,
           payload_json,
           available_at,
           attempt_count,
           max_attempts
         FROM admin_async_jobs
         WHERE status_code IN ('pending', 'retry')
           AND available_at <= UTC_TIMESTAMP(6)
           AND (lease_expires_at IS NULL OR lease_expires_at < UTC_TIMESTAMP(6))
           AND completed_at IS NULL
         ORDER BY available_at ASC, id ASC
         LIMIT ?
         FOR UPDATE SKIP LOCKED`,
        [limit]
      );

      if (rows.length === 0) {
        return [] as AdminAsyncJobRecord[];
      }

      await connection.execute(
        `UPDATE admin_async_jobs
         SET status_code = 'processing',
             lease_token = ?,
             lease_expires_at = ?,
             claimed_at = ?,
             attempt_count = attempt_count + 1,
             updated_at = ?
         WHERE id IN (${rows.map(() => '?').join(', ')})`,
        [leaseToken, leaseExpiresAt, claimedAt, claimedAt, ...rows.map((row) => row.id)]
      );

      return rows.map((row) => ({
        attemptCount: Number(row.attempt_count) + 1,
        availableAt: row.available_at,
        id: Number(row.id),
        leaseToken,
        maxAttempts: Number(row.max_attempts),
        payload:
          typeof row.payload_json === 'string'
            ? JSON.parse(row.payload_json || '{}')
            : row.payload_json,
        publicId: row.public_id,
        statusCode: 'processing',
        typeCode: row.type_code,
      })) satisfies AdminAsyncJobRecord[];
    });
  },

  async completeJob(jobId: number, leaseToken: string) {
    return withTransaction(getMysqlPool(), async (connection) => {
      const timestamp = toMysqlDateTime(nowUtc());
      await executeResult(
        connection,
        `UPDATE admin_async_jobs
         SET status_code = 'completed',
             completed_at = ?,
             lease_token = NULL,
             lease_expires_at = NULL,
             claimed_at = NULL,
             last_error = NULL,
             updated_at = ?
         WHERE id = ?
           AND lease_token = ?`,
        [timestamp, timestamp, jobId, leaseToken]
      );
    });
  },

  async failJob(job: Pick<AdminAsyncJobRecord, 'attemptCount' | 'id' | 'leaseToken' | 'maxAttempts'>, error: unknown) {
    return withTransaction(getMysqlPool(), async (connection) => {
      const timestamp = toMysqlDateTime(nowUtc());
      const finalFailure = job.attemptCount >= job.maxAttempts;
      const message = error instanceof Error ? error.message : String(error);

      await executeResult(
        connection,
        `UPDATE admin_async_jobs
         SET status_code = ?,
             available_at = ?,
             lease_token = NULL,
             lease_expires_at = NULL,
             claimed_at = NULL,
             last_error = ?,
             updated_at = ?
         WHERE id = ?
           AND lease_token = ?`,
        [
          finalFailure ? 'failed' : 'retry',
          finalFailure ? timestamp : buildRetryAt(job.attemptCount),
          message.slice(0, 2000),
          timestamp,
          job.id,
          job.leaseToken,
        ]
      );
    });
  },
};
