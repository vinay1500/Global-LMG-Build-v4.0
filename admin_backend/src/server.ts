import { createApp } from './app.js';
import { env } from './config/env.js';
import { ensureDatabaseMigrations } from './lib/migrations.js';
import { closeMysqlPool } from './lib/mysql.js';
import { logEvent } from './lib/observability.js';
import { ensurePlatformReady } from './modules/platform/bootstrap.js';
import { startReminderWorker, stopReminderWorker } from './modules/scheduler/service.js';
import { documentStorageService } from './modules/storage/service.js';

const isMysqlConfigured = Boolean(
  env.MYSQL_HOST && env.MYSQL_DATABASE && env.MYSQL_USER && env.MYSQL_PASSWORD
);

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
    if (env.HEALTHCHECK_REQUIRE_MYSQL) {
      throw new Error(
        'MySQL is required on startup, but MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, or MYSQL_PASSWORD is missing.'
      );
    }

    return;
  }

  await ensureDatabaseMigrations();
  await ensurePlatformReady();
};

const bootstrap = async () => {
  await warmDatabase();
  await documentStorageService.onStartup();

  if (env.REMINDER_WORKER_ENABLED) {
    startReminderWorker();
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logEvent('info', 'admin_server.started', {
      port: env.PORT,
      publicAdminWebOrigin: env.PUBLIC_ADMIN_WEB_ORIGIN,
    });
  });

  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logEvent('warn', 'admin_server.shutdown_requested', { signal });

    const shutdownTimer = setTimeout(() => {
      logEvent('error', 'admin_server.shutdown_timeout', {
        timeoutMs: env.SHUTDOWN_TIMEOUT_MS,
      });
      process.exit(1);
    }, env.SHUTDOWN_TIMEOUT_MS);

    try {
      stopReminderWorker();
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
      logEvent('info', 'admin_server.stopped', { signal });
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimer);
      logEvent('error', 'admin_server.shutdown_failed', {
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
  logEvent('error', 'admin_server.bootstrap_failed', {
    error: serializeError(error),
  });
  stopReminderWorker();
  await closeMysqlPool();
  process.exit(1);
});
