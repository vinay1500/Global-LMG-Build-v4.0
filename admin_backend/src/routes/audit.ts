import { Router } from 'express';
import { asyncHandler } from '../lib/httpErrors.js';
import { adminAuditService } from '../modules/audit/service.js';
import { getRouteParam, requireAdminPermission } from './shared.js';

export const auditRouter = Router();

auditRouter.get(
  '/audit',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'audit.view', [
      'ops_admin',
      'case_manager',
      'billing_admin',
      'messaging_desk',
      'management_viewer',
    ]);
    response.json(
      await adminAuditService.listAudit({
        actorName: typeof request.query.actorName === 'string' ? request.query.actorName : undefined,
        entityTableName:
          typeof request.query.entityTableName === 'string'
            ? request.query.entityTableName
            : undefined,
        limit: Number(request.query.limit || 50),
        search: typeof request.query.search === 'string' ? request.query.search : undefined,
        sourceModule:
          typeof request.query.sourceModule === 'string' ? request.query.sourceModule : undefined,
      })
    );
  })
);

auditRouter.get(
  '/audit/download',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'audit.view', [
      'ops_admin',
      'case_manager',
      'billing_admin',
      'messaging_desk',
      'management_viewer',
    ]);
    const csv = await adminAuditService.downloadAuditCsv({
      actorName: typeof request.query.actorName === 'string' ? request.query.actorName : undefined,
      entityTableName:
        typeof request.query.entityTableName === 'string'
          ? request.query.entityTableName
          : undefined,
      limit: Number(request.query.limit || 200),
      search: typeof request.query.search === 'string' ? request.query.search : undefined,
      sourceModule:
        typeof request.query.sourceModule === 'string' ? request.query.sourceModule : undefined,
    });
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Disposition', 'attachment; filename="admin-audit-export.csv"');
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.send(csv);
  })
);

auditRouter.get(
  '/audit/:auditId',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'audit.view', [
      'ops_admin',
      'case_manager',
      'billing_admin',
      'messaging_desk',
      'management_viewer',
    ]);
    response.json(await adminAuditService.getAuditDetail(getRouteParam(request.params.auditId)));
  })
);
