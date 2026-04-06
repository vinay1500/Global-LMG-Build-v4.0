import { createApp } from './app.js';
import { env } from './config/env.js';
import { ensureDatabaseMigrations } from './lib/migrations.js';
import { closeMysqlPool } from './lib/mysql.js';
import { logEvent } from './lib/observability.js';
import { documentStorageService } from './modules/storage/service.js';

const isMysqlConfigured = Boolean(
  env.MYSQL_HOST && env.MYSQL_DATABASE && env.MYSQL_USER && env.MYSQL_PASSWORD
);

const requiresMysqlOnStartup = true;

const serializeError = (error: unknown) =>
  error instanceof Error
    ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
      }
    : error;

const warmDatabase = async () => {
  if (!isMysqlConfigured) {
    if (requiresMysqlOnStartup) {
      throw new Error(
        'MySQL is required on startup, but MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, or MYSQL_PASSWORD is missing.'
      );
    }

    return;
  }

  try {
    await ensureDatabaseMigrations();
  } catch (error) {
    if (requiresMysqlOnStartup) {
      throw error;
    }

    logEvent('warn', 'server.database_warmup_skipped', {
      error: serializeError(error),
      reason: 'mysql_unavailable',
    });
  }
};

const bootstrap = async () => {
  await warmDatabase();
  await documentStorageService.onStartup();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logEvent('info', 'server.started', {
      port: env.PORT,
      publicWebOrigin: env.PUBLIC_WEB_ORIGIN,
    });
  });

  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logEvent('warn', 'server.shutdown_requested', { signal });

    const shutdownTimer = setTimeout(() => {
      logEvent('error', 'server.shutdown_timeout', {
        timeoutMs: env.SHUTDOWN_TIMEOUT_MS,
      });
      process.exit(1);
    }, env.SHUTDOWN_TIMEOUT_MS);

    try {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      await closeMysqlPool();
      clearTimeout(shutdownTimer);
      logEvent('info', 'server.stopped', { signal });
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimer);
      logEvent('error', 'server.shutdown_failed', {
        error: serializeError(error),
        signal,
      });
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
};

void bootstrap().catch(async (error) => {
  logEvent('error', 'server.bootstrap_failed', {
    error: serializeError(error),
  });
  await closeMysqlPool();
  process.exit(1);
});
