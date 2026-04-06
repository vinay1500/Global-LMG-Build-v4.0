import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './lib/httpErrors.js';
import { requestContextMiddleware, requestLoggingMiddleware } from './lib/observability.js';
import { createRateLimitMiddleware } from './lib/rateLimit.js';
import { apiRouter } from './routes/index.js';
export const createApp = () => {
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    app.use(requestContextMiddleware);
    app.use(requestLoggingMiddleware);
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    }));
    app.use(cors({
        credentials: true,
        origin: env.PUBLIC_ADMIN_WEB_ORIGIN,
    }));
    app.use(createRateLimitMiddleware({
        keyPrefix: 'admin_api',
        maxRequests: env.GENERAL_RATE_LIMIT_MAX_REQUESTS,
        windowMs: env.GENERAL_RATE_LIMIT_WINDOW_MS,
    }));
    app.use(express.json({ limit: '2mb' }));
    app.use('/api', apiRouter);
    app.use(errorHandler);
    return app;
};
