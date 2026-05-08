import { closeMysqlPool } from '../lib/mysql.js';
import {
  clearPersistentRateLimit,
  consumePersistentRateLimit,
} from '../modules/auth/persistentRateLimiter.js';

const expect = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const runBucketSmoke = async (scope: string) => {
  const key = `rate-limit-smoke:${process.pid}:${Date.now()}:${Math.random()}`;
  const input = {
    key,
    maxAttempts: 2,
    scope,
    windowMs: 60_000,
  };

  await clearPersistentRateLimit({ key, scope });

  const first = await consumePersistentRateLimit(input);
  const second = await consumePersistentRateLimit(input);
  const third = await consumePersistentRateLimit(input);

  expect(first.allowed, `${scope}: first attempt should be allowed`);
  expect(second.allowed, `${scope}: second attempt should be allowed`);
  expect(!third.allowed, `${scope}: third attempt should be rate limited`);

  await closeMysqlPool();

  const afterRestart = await consumePersistentRateLimit(input);
  expect(!afterRestart.allowed, `${scope}: bucket should survive pool restart`);

  await clearPersistentRateLimit({ key, scope });
};

await runBucketSmoke('client_auth');
await runBucketSmoke('admin_auth');
await closeMysqlPool();

console.log('Persistent rate-limit smoke passed.');
