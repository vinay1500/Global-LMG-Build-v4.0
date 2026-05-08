import { closeMysqlPool } from '../lib/mysql.js';
import {
  captureSentryMessage,
  flushSentry,
  initSentry,
  isSentryEnabled,
} from '../lib/sentry.js';

const maskEventId = (value: string | undefined) =>
  value ? `${value.slice(0, 8)}...${value.slice(-4)}` : null;

initSentry();

if (!isSentryEnabled()) {
  console.log(
    JSON.stringify({
      reason: 'SENTRY_DSN is not configured.',
      service: 'global-lmg-admin-api',
      status: 'skipped',
    })
  );
  await closeMysqlPool();
  process.exit(0);
}

const eventId = captureSentryMessage('Global LMG admin API Sentry smoke event', {
  safeSmokeTest: true,
  service: 'global-lmg-admin-api',
});

await flushSentry(5000);
await closeMysqlPool();

console.log(
  JSON.stringify({
    eventId: maskEventId(eventId),
    service: 'global-lmg-admin-api',
    status: eventId ? 'sent' : 'unknown',
  })
);
