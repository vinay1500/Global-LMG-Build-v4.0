import crypto from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { closeMysqlPool, executeStatement, queryRows } from '../lib/mysql.js';
import { runIdempotentOperation } from '../lib/idempotency.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
};

type SmokeRow = RowDataPacket & {
  status_code: string;
  response_status_code: number | null;
};

const scope = 'smoke:idempotency';
const actorKey = 'smoke-transactional-safety';
const idempotencyKey = `smoke-${Date.now()}-${crypto.randomUUID()}`;

let sideEffectCount = 0;

try {
  await executeStatement('DELETE FROM idempotency_keys WHERE scope_code = ?', [scope]);

  const operation = async () => {
    await delay(350);
    sideEffectCount += 1;
    return {
      marker: idempotencyKey,
      paymentReference: `PAY-${sideEffectCount}`,
      sideEffectCount,
    };
  };

  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      runIdempotentOperation({
        actorKey,
        body: {
          amount: 5000,
          invoiceId: 'smoke-invoice',
          paymentDate: '2026-05-07',
        },
        idempotencyKey,
        method: 'POST',
        operation,
        path: '/api/v1/admin/billing/payments',
        scope,
        statusCode: 201,
      })
    )
  );

  assert(sideEffectCount === 1, `Expected exactly one side effect, saw ${sideEffectCount}.`);
  assert(results.every((result) => result.statusCode === 201), 'Expected all responses to replay 201.');
  assert(
    new Set(results.map((result) => stableStringify(result.body))).size === 1,
    'Expected all responses to have the same body.'
  );
  assert(
    results.filter((result) => result.replayed).length === 4,
    'Expected four replayed duplicate responses.'
  );

  let conflictSeen = false;
  try {
    await runIdempotentOperation({
      actorKey,
      body: {
        amount: 6000,
        invoiceId: 'smoke-invoice',
        paymentDate: '2026-05-07',
      },
      idempotencyKey,
      method: 'POST',
      operation,
      path: '/api/v1/admin/billing/payments',
      scope,
      statusCode: 201,
    });
  } catch (error) {
    conflictSeen =
      error instanceof Error &&
      'code' in error &&
      (error as { code?: unknown }).code === 'idempotency_key_conflict';
  }

  assert(conflictSeen, 'Expected same key with different payload to be rejected.');

  const rows = await queryRows<SmokeRow>(
    `SELECT status_code, response_status_code
     FROM idempotency_keys
     WHERE scope_code = ?`,
    [scope]
  );

  assert(rows.length === 1, `Expected one stored idempotency row, saw ${rows.length}.`);
  assert(rows[0]?.status_code === 'completed', 'Expected stored idempotency row to be completed.');
  assert(rows[0]?.response_status_code === 201, 'Expected stored idempotency response status 201.');

  console.log('Idempotency smoke passed: concurrent duplicate requests replayed one stored response.');
} finally {
  await executeStatement('DELETE FROM idempotency_keys WHERE scope_code = ?', [scope]);
  await closeMysqlPool();
}
