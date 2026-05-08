import type { QueryExecutor } from './mysql.js';
import { createPublicId } from './authCrypto.js';
import { executeStatement } from './mysql.js';
import { getRequestContext } from './observability.js';

export const recordSecurityEvent = async (
  input: {
    eventTypeCode: string;
    identifierValue?: string | null;
    ipAddress?: string | null;
    success: boolean;
    userAgent?: string | null;
    userId?: number | null;
  },
  executor?: QueryExecutor
) => {
  const context = getRequestContext();

  await executeStatement(
    `INSERT INTO security_events (
       public_id,
       user_id,
       identifier_value,
       event_type_code,
       success_flag,
       ip_address,
       user_agent,
       occurred_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(6))`,
    [
      createPublicId(),
      input.userId ?? null,
      input.identifierValue ?? null,
      input.eventTypeCode,
      input.success ? 1 : 0,
      input.ipAddress ?? context?.ipAddress ?? null,
      input.userAgent ?? context?.userAgent ?? null,
    ],
    executor
  );
};

export const recordSecurityEventSafely = (
  input: Parameters<typeof recordSecurityEvent>[0],
  executor?: QueryExecutor
) => {
  void recordSecurityEvent(input, executor).catch(() => undefined);
};
