import { Router } from 'express';
import { authRouter } from './auth.js';
import { billingRouter } from './billing.js';
import { clientsRouter } from './clients.js';
import { documentsRouter } from './documents.js';
import { healthRouter } from './health.js';
import { mattersRouter } from './matters.js';
import { messagesRouter } from './messages.js';

export const apiRouter = Router();

apiRouter.use('/v1/admin', healthRouter);
apiRouter.use('/v1/admin', authRouter);
apiRouter.use('/v1/admin', clientsRouter);
apiRouter.use('/v1/admin', mattersRouter);
apiRouter.use('/v1/admin', documentsRouter);
apiRouter.use('/v1/admin', messagesRouter);
apiRouter.use('/v1/admin', billingRouter);
