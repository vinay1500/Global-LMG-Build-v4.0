import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './lib/httpErrors.js';
import { requestContextMiddleware, requestLoggingMiddleware } from './lib/observability.js';
import { apiRouter } from './routes/index.js';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(requestContextMiddleware);
  app.use(requestLoggingMiddleware);

  app.use(
    helmet({
      // CSP is expected to be enforced primarily at Nginx for the full platform.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(
    cors({
      credentials: true,
      origin: env.PUBLIC_WEB_ORIGIN,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRouter);
  app.use(errorHandler);

  return app;
};
