import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeMysqlPool } from './lib/mysql.js';
import { ensurePhase5SchemaReadiness } from './lib/schemaReadiness.js';

const start = async () => {
  await ensurePhase5SchemaReadiness();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`global-lmg-admin-api listening on ${env.PORT}`);
  });

  const shutdown = async () => {
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
  };

  process.on('SIGINT', () => {
    void shutdown().finally(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    void shutdown().finally(() => process.exit(0));
  });
};

void start().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Failed to start admin backend.');
  void closeMysqlPool().finally(() => process.exit(1));
});
