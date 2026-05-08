import { createHash } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { getMysqlPool } from '../../lib/mysql.js';

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface RateLimitBucketRow extends RowDataPacket {
  attempt_count: number;
  blocked_until: string | null;
  window_resets_at: string;
}

interface RateLimitInput {
  key: string;
  lockMs?: number;
  maxAttempts: number;
  scope: string;
  windowMs: number;
}

const hashBucketKey = (scope: string, key: string) =>
  createHash('sha256').update(`${scope}:${key}`).digest('hex');

const toMysqlDateTime = (date: Date) => date.toISOString().slice(0, 23).replace('T', ' ');

const fromMysqlDateTime = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const normalized = value.replace(' ', 'T').replace(/(\.\d{3})\d+$/, '$1');
  return new Date(`${normalized}Z`);
};

const retryAfterSeconds = (until: Date, now = Date.now()) =>
  Math.max(1, Math.ceil((until.getTime() - now) / 1000));

const allowed = { allowed: true, retryAfterSeconds: 0 } satisfies RateLimitResult;

export const getPersistentRateLimitStatus = async (
  input: Omit<RateLimitInput, 'lockMs'>
): Promise<RateLimitResult> => {
  const [rows] = await getMysqlPool().execute<RateLimitBucketRow[]>(
    `SELECT attempt_count, window_resets_at, blocked_until
       FROM rate_limit_buckets
      WHERE scope_code = ? AND bucket_key_hash = ?
      LIMIT 1`,
    [input.scope, hashBucketKey(input.scope, input.key)]
  );

  const row = rows[0];
  if (!row) {
    return allowed;
  }

  const now = Date.now();
  const resetsAt = fromMysqlDateTime(row.window_resets_at);
  const blockedUntil = fromMysqlDateTime(row.blocked_until);

  if (blockedUntil && blockedUntil.getTime() > now) {
    return {
      allowed: false,
      retryAfterSeconds: retryAfterSeconds(blockedUntil, now),
    };
  }

  if (blockedUntil) {
    return allowed;
  }

  if (!resetsAt || resetsAt.getTime() <= now) {
    return allowed;
  }

  if (row.attempt_count >= input.maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: retryAfterSeconds(resetsAt, now),
    };
  }

  return allowed;
};

export const consumePersistentRateLimit = async (
  input: RateLimitInput
): Promise<RateLimitResult> => {
  const connection = await getMysqlPool().getConnection();
  const now = new Date();
  const nowMs = now.getTime();
  const windowResetsAt = new Date(nowMs + input.windowMs);
  const bucketKeyHash = hashBucketKey(input.scope, input.key);

  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO rate_limit_buckets (
         scope_code, bucket_key_hash, attempt_count, window_started_at, window_resets_at,
         blocked_until, created_at, updated_at
       ) VALUES (?, ?, 0, ?, ?, NULL, ?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [
        input.scope,
        bucketKeyHash,
        toMysqlDateTime(now),
        toMysqlDateTime(windowResetsAt),
        toMysqlDateTime(now),
        toMysqlDateTime(now),
      ]
    );

    const [rows] = await connection.execute<RateLimitBucketRow[]>(
      `SELECT attempt_count, window_resets_at, blocked_until
         FROM rate_limit_buckets
        WHERE scope_code = ? AND bucket_key_hash = ?
        LIMIT 1
        FOR UPDATE`,
      [input.scope, bucketKeyHash]
    );

    const row = rows[0];
    const currentCount = row?.attempt_count ?? 0;
    const currentResetsAt = fromMysqlDateTime(row?.window_resets_at);
    const blockedUntil = fromMysqlDateTime(row?.blocked_until);

    if (blockedUntil && blockedUntil.getTime() > nowMs) {
      await connection.commit();
      return {
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(blockedUntil, nowMs),
      };
    }

    if (!currentResetsAt || currentResetsAt.getTime() <= nowMs) {
      await connection.execute(
        `UPDATE rate_limit_buckets
            SET attempt_count = 1,
                window_started_at = ?,
                window_resets_at = ?,
                blocked_until = NULL,
                updated_at = ?
          WHERE scope_code = ? AND bucket_key_hash = ?`,
        [
          toMysqlDateTime(now),
          toMysqlDateTime(windowResetsAt),
          toMysqlDateTime(now),
          input.scope,
          bucketKeyHash,
        ]
      );
      await connection.commit();
      return allowed;
    }

    if (currentCount >= input.maxAttempts) {
      const retryUntil = input.lockMs ? new Date(nowMs + input.lockMs) : currentResetsAt;
      await connection.execute(
        `UPDATE rate_limit_buckets
            SET blocked_until = ?,
                updated_at = ?
          WHERE scope_code = ? AND bucket_key_hash = ?`,
        [toMysqlDateTime(retryUntil), toMysqlDateTime(now), input.scope, bucketKeyHash]
      );
      await connection.commit();
      return {
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(retryUntil, nowMs),
      };
    }

    const nextCount = currentCount + 1;
    const shouldBlock = nextCount >= input.maxAttempts;
    const nextBlockedUntil = shouldBlock
      ? new Date(nowMs + (input.lockMs ?? Math.max(1, currentResetsAt.getTime() - nowMs)))
      : null;

    await connection.execute(
      `UPDATE rate_limit_buckets
          SET attempt_count = ?,
              blocked_until = ?,
              updated_at = ?
        WHERE scope_code = ? AND bucket_key_hash = ?`,
      [
        nextCount,
        nextBlockedUntil ? toMysqlDateTime(nextBlockedUntil) : null,
        toMysqlDateTime(now),
        input.scope,
        bucketKeyHash,
      ]
    );
    await connection.commit();

    return allowed;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const clearPersistentRateLimit = async (
  input: Pick<RateLimitInput, 'scope' | 'key'>
) => {
  await getMysqlPool().execute(
    `DELETE FROM rate_limit_buckets
      WHERE scope_code = ? AND bucket_key_hash = ?`,
    [input.scope, hashBucketKey(input.scope, input.key)]
  );
};
