import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { queryRows } from '../lib/mysql.js';

export const healthRouter = Router();

healthRouter.get(
  '/health',
  asyncHandler(async (_request, response) => {
    await queryRows('SELECT 1');
    response.json({
      service: 'global-lmg-admin-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  })
);
