import { Router } from 'express';
import { z } from 'zod';
import { requireCsrf } from '../lib/csrf.js';
import { asyncHandler } from '../lib/httpErrors.js';
import { adminReportService } from '../modules/reports/service.js';
import { getRouteParam, requireAdminPermission } from './shared.js';
export const reportsRouter = Router();
const retryReminderSchema = z.object({
    reminderId: z.coerce.number().int().positive(),
});
reportsRouter.get('/reports/overview', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'report.view', [
        'ops_admin',
        'management_viewer',
        'case_manager',
        'billing_admin',
    ]);
    response.json(await adminReportService.getOverview());
}));
reportsRouter.get('/reports/overview/download', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'report.view', [
        'ops_admin',
        'management_viewer',
        'case_manager',
        'billing_admin',
    ]);
    const csv = await adminReportService.downloadOverviewCsv();
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Disposition', 'attachment; filename="admin-report-overview.csv"');
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.send(csv);
}));
reportsRouter.get('/reports/drilldowns', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'report.view', [
        'ops_admin',
        'management_viewer',
        'case_manager',
        'billing_admin',
    ]);
    response.json(await adminReportService.getDrilldowns());
}));
reportsRouter.post('/reports/drilldowns/async-jobs/:jobId/retry', asyncHandler(async (request, response) => {
    await requireCsrf(request);
    await requireAdminPermission(request, response, 'report.view', [
        'ops_admin',
        'management_viewer',
        'case_manager',
        'billing_admin',
    ]);
    response.json(await adminReportService.retryAsyncJob(getRouteParam(request.params.jobId)));
}));
reportsRouter.post('/reports/drilldowns/reminders/:reminderId/retry', asyncHandler(async (request, response) => {
    await requireCsrf(request);
    await requireAdminPermission(request, response, 'report.view', [
        'ops_admin',
        'management_viewer',
        'case_manager',
        'billing_admin',
    ]);
    const payload = retryReminderSchema.parse({
        reminderId: request.params.reminderId,
    });
    response.json(await adminReportService.retryReminder(payload.reminderId));
}));
