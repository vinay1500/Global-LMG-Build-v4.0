import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { adminDashboardService } from '../modules/dashboard/service.js';
import { requireAdminPermission } from './shared.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/dashboard/summary',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'dashboard.view', [
      'ops_admin',
      'case_manager',
      'billing_admin',
      'messaging_desk',
      'management_viewer',
    ]);
    response.json(await adminDashboardService.getSummary());
  })
);
