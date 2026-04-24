import { type Request, type Response, Router } from 'express';
import { env } from '../config/env.js';
import { asyncHandler } from '../lib/httpErrors.js';
import { getMysqlPool } from '../lib/mysql.js';
import { ensurePhase5SchemaReadiness } from '../lib/schemaReadiness.js';

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
      ready: false,
      status: 'unreachable',
      error: error instanceof Error ? error.message : 'Unknown MySQL error',
    };
  }
};

const getSchemaReadiness = async (mysqlReady: boolean) => {
  if (!mysqlReady) {
    return {
      ready: false,
      status: 'blocked-by-mysql',
    };
  }

  try {
    await ensurePhase5SchemaReadiness();
    return {
      ready: true,
      status: 'ok',
    };
  } catch (error) {
    return {
      ready: false,
      status: 'missing-required-schema',
      error: error instanceof Error ? error.message : 'Unknown schema readiness error',
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
    const schema = await getSchemaReadiness(mysql.ready);
    const ready = mysql.ready && schema.ready;

    response.status(ready ? 200 : 503).json({
      checks: {
        mysql,
        schema,
      },
      environment: env.APP_ENV,
      service: 'global-lmg-admin-api',
      status: ready ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    });
  })
);
