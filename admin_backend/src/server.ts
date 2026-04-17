import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeMysqlPool } from './lib/mysql.js';

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
