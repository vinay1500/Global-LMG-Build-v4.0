import { Router } from 'express';
import { env } from '../config/env.js';
import { getMysqlPool } from '../lib/mysql.js';
import { asyncHandler } from '../lib/httpErrors.js';
export const healthRouter = Router();
const isMysqlConfigured = Boolean(env.MYSQL_HOST && env.MYSQL_DATABASE && env.MYSQL_USER && env.MYSQL_PASSWORD);
const getMysqlReadiness = async () => {
    if (!isMysqlConfigured) {
        return {
            configured: false,
            ready: false,
            status: 'required-but-missing',
        };
    }
    try {
        await getMysqlPool().query('SELECT 1');
        return {
            configured: true,
            ready: true,
            status: 'ok',
        };
    }
    catch (error) {
        return {
            configured: true,
            ready: false,
            status: 'unreachable',
            error: error instanceof Error ? error.message : 'Unknown MySQL error',
        };
    }
};
const respondLive = (_request, response) => {
    response.json({
        environment: env.APP_ENV,
        service: 'global-lmg-api',
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
    });
};
healthRouter.get('/health', respondLive);
healthRouter.get('/health/live', respondLive);
healthRouter.get('/health/ready', asyncHandler(async (_request, response) => {
    const mysql = await getMysqlReadiness();
    const ready = mysql.ready;
    response.status(ready ? 200 : 503).json({
        checks: {
            mysql,
            storage: {
                mode: env.DASHBOARD_STORE_MODE,
                ready,
            },
        },
        environment: env.APP_ENV,
        service: 'global-lmg-api',
        status: ready ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
    });
}));
