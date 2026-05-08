import { Router } from 'express';
import { authRouter } from './auth.js';
import { dashboardRouter } from './dashboard.js';
import { healthRouter } from './health.js';
import { meRouter } from './me.js';
import { notificationsRouter } from './notifications.js';
import { uploadsRouter } from './uploads.js';
import { webhooksRouter } from './webhooks.js';

export const apiRouter = Router();

apiRouter.use('/v1', healthRouter);
apiRouter.use('/v1', authRouter);
apiRouter.use('/v1', dashboardRouter);
apiRouter.use('/v1', meRouter);
apiRouter.use('/v1', notificationsRouter);
apiRouter.use('/v1', uploadsRouter);
apiRouter.use('/v1', webhooksRouter);
