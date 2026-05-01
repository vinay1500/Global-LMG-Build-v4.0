import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorMiddleware } from './lib/httpErrors.js';
import { apiRouter } from './routes/index.js';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    cors({
      credentials: true,
      exposedHeaders: ['content-disposition'],
      origin: env.PUBLIC_ADMIN_WEB_ORIGIN,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', apiRouter);
  app.use(errorMiddleware);

  return app;
};
