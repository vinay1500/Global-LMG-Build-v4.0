import { type Request, type Response, Router } from 'express';
import { env } from '../config/env.js';
import { getMysqlPool } from '../lib/mysql.js';
import { asyncHandler } from '../lib/httpErrors.js';

export const healthRouter = Router();

const isMysqlConfigured = Boolean(
  env.MYSQL_HOST && env.MYSQL_DATABASE && env.MYSQL_USER && env.MYSQL_PASSWORD
);

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
  } catch (error) {
    return {
      configured: true,
      error: error instanceof Error ? error.message : 'Unknown MySQL error',
      ready: false,
      status: 'unreachable',
    };
  }
};

const respondLive = (_request: Request, response: Response) => {
  response.json({
    environment: env.APP_ENV,
    service: 'global-lmg-admin-api',
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
};

healthRouter.get('/health', respondLive);
healthRouter.get('/health/live', respondLive);

healthRouter.get(
  '/health/ready',
  asyncHandler(async (_request, response) => {
    const mysql = await getMysqlReadiness();
    const ready = mysql.ready;

    response.status(ready ? 200 : 503).json({
      checks: {
        mysql,
      },
      environment: env.APP_ENV,
      service: 'global-lmg-admin-api',
      status: ready ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    });
  })
);
