import { env } from '../config/env.js';
import { ensureDatabaseMigrations } from '../lib/migrations.js';
import { closeMysqlPool } from '../lib/mysql.js';
import { logEvent } from '../lib/observability.js';

const isMysqlConfigured = Boolean(
  env.MYSQL_HOST && env.MYSQL_DATABASE && env.MYSQL_USER && env.MYSQL_PASSWORD
);

const run = async () => {
  if (!isMysqlConfigured) {
    throw new Error(
      'MySQL environment variables are incomplete. Set MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, and MYSQL_PASSWORD before running migrations.'
    );
  }

  await ensureDatabaseMigrations();
  logEvent('info', 'database.migrations_completed', {
    database: env.MYSQL_DATABASE,
    host: env.MYSQL_HOST,
  });
};

run()
  .catch((error) => {
    logEvent('error', 'database.migrations_failed', {
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack,
            }
          : error,
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMysqlPool();
  });
