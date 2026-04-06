import { Router } from 'express';
import { z } from 'zod';
import { assertPermission, assertRole, requireActor } from '../lib/authorization.js';
import { requireCsrf } from '../lib/csrf.js';
import { asyncHandler } from '../lib/httpErrors.js';
import { domainService } from '../modules/domain/service.js';
export const adminRouter = Router();
const updateMatterStageSchema = z.object({
    changeNote: z.string().trim().max(2000).optional(),
    operationalStatusCode: z.string().trim().min(2).max(64).optional(),
    stageCode: z.string().trim().min(2).max(64),
    visibleToClient: z.boolean().optional(),
});
const matterAssignmentSchema = z.object({
    assignmentRoleCode: z.string().trim().min(2).max(64),
    counselPartnerId: z.string().trim().min(2).max(64).optional(),
    feeAgreedAmount: z.number().nonnegative().optional(),
    feeDueAmount: z.number().nonnegative().optional(),
    feePaidAmount: z.number().nonnegative().optional(),
    internalUserId: z.string().trim().min(2).max(64).optional(),
    isPrimary: z.boolean().optional(),
    notes: z.string().trim().max(2000).optional(),
});
const eventParticipantSchema = z.object({
    clientContactUserId: z.string().trim().min(2).max(64).optional(),
    counselPartnerId: z.string().trim().min(2).max(64).optional(),
    internalUserId: z.string().trim().min(2).max(64).optional(),
    participantRoleCode: z.string().trim().min(2).max(64),
    rsvpStatusCode: z.string().trim().min(2).max(64).optional(),
});
const createEventSchema = z.object({
    clientAccountId: z.string().trim().min(2).max(64),
    clientVisibleFlag: z.boolean().optional(),
    joinUrl: z.string().trim().url().optional(),
    locationText: z.string().trim().max(255).optional(),
    matterId: z.string().trim().min(2).max(64).optional(),
    meetingProviderCode: z.string().trim().min(2).max(64).optional(),
    modeCode: z.string().trim().min(2).max(64),
    notes: z.string().trim().max(4000).optional(),
    participants: z.array(eventParticipantSchema).max(20).optional(),
    scheduledEndAt: z.string().trim().datetime(),
    scheduledStartAt: z.string().trim().datetime(),
    statusCode: z.string().trim().min(2).max(64).optional(),
    timezoneName: z.string().trim().min(2).max(64).optional(),
    title: z.string().trim().min(2).max(255),
    typeCode: z.string().trim().min(2).max(64),
});
const createRefundSchema = z.object({
    amount: z.number().positive(),
    invoiceId: z.string().trim().min(2).max(64).optional(),
    paymentId: z.string().trim().min(2).max(64),
    reasonText: z.string().trim().min(5).max(4000),
});
const replaceUserRolesSchema = z.object({
    roleCodes: z.array(z.string().trim().min(2).max(64)).min(1).max(20),
});
const requireAdminPermission = async (request, response, permissionCode, allowedRoleCodes) => {
    const actor = await requireActor(request, response);
    assertRole(actor.roleCodes, allowedRoleCodes);
    assertPermission(actor.permissionCodes, permissionCode);
    return actor;
};
const getRouteParam = (value) => Array.isArray(value) ? value[0] || '' : value || '';
adminRouter.get('/admin/client-accounts', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'client_account.view', [
        'ops_admin',
        'case_manager',
        'billing_admin',
    ]);
    response.json(await domainService.listClientAccounts());
}));
adminRouter.get('/admin/client-accounts/:clientAccountId', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'client_account.view', [
        'ops_admin',
        'case_manager',
        'billing_admin',
    ]);
    response.json(await domainService.getClientAccountByPublicId(getRouteParam(request.params.clientAccountId)));
}));
adminRouter.get('/admin/counsel-partners', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'counsel_partner.view', [
        'ops_admin',
        'case_manager',
    ]);
    response.json(await domainService.listCounselPartners());
}));
adminRouter.get('/admin/counsel-partners/:counselPartnerId', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'counsel_partner.view', [
        'ops_admin',
        'case_manager',
    ]);
    response.json(await domainService.getCounselPartnerByPublicId(getRouteParam(request.params.counselPartnerId)));
}));
adminRouter.get('/admin/matters', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'matter.view', ['ops_admin', 'case_manager']);
    response.json(await domainService.listMatters());
}));
adminRouter.get('/admin/matters/:matterId', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'matter.view', ['ops_admin', 'case_manager']);
    response.json(await domainService.getMatterByPublicId(getRouteParam(request.params.matterId)));
}));
adminRouter.patch('/admin/matters/:matterId/stage', asyncHandler(async (request, response) => {
    requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'matter.update', [
        'ops_admin',
        'case_manager',
    ]);
    const payload = updateMatterStageSchema.parse(request.body);
    response.json(await domainService.updateMatterStage(actor.publicId, actor.roleCodes[0] || actor.actorTypeCode, getRouteParam(request.params.matterId), payload));
}));
adminRouter.post('/admin/matters/:matterId/assignments', asyncHandler(async (request, response) => {
    requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'matter.update', [
        'ops_admin',
        'case_manager',
    ]);
    const payload = matterAssignmentSchema.parse(request.body);
    response.status(201).json(await domainService.createMatterAssignment(actor.publicId, getRouteParam(request.params.matterId), payload));
}));
adminRouter.get('/admin/documents', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'document.view', ['ops_admin', 'case_manager']);
    response.json(await domainService.listDocuments());
}));
adminRouter.get('/admin/documents/:documentId', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'document.view', ['ops_admin', 'case_manager']);
    response.json(await domainService.getDocumentByPublicId(getRouteParam(request.params.documentId)));
}));
adminRouter.get('/admin/events', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'event.view', ['ops_admin', 'case_manager']);
    response.json(await domainService.listEvents());
}));
adminRouter.get('/admin/events/:eventId', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'event.view', ['ops_admin', 'case_manager']);
    response.json(await domainService.getEventByPublicId(getRouteParam(request.params.eventId)));
}));
adminRouter.post('/admin/events', asyncHandler(async (request, response) => {
    requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'event.manage', [
        'ops_admin',
        'case_manager',
    ]);
    const payload = createEventSchema.parse(request.body);
    response
        .status(201)
        .json(await domainService.createEvent(actor.publicId, actor.roleCodes[0] || actor.actorTypeCode, payload));
}));
adminRouter.get('/admin/invoices', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'invoice.view', [
        'ops_admin',
        'billing_admin',
        'case_manager',
    ]);
    response.json(await domainService.listInvoices());
}));
adminRouter.get('/admin/invoices/:invoiceId', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'invoice.view', [
        'ops_admin',
        'billing_admin',
        'case_manager',
    ]);
    response.json(await domainService.getInvoiceByPublicId(getRouteParam(request.params.invoiceId)));
}));
adminRouter.get('/admin/payments', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'payment.view', [
        'ops_admin',
        'billing_admin',
        'case_manager',
    ]);
    response.json(await domainService.listPayments());
}));
adminRouter.get('/admin/refunds', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'refund.view', [
        'ops_admin',
        'billing_admin',
        'case_manager',
    ]);
    response.json(await domainService.listRefunds());
}));
adminRouter.post('/admin/refunds', asyncHandler(async (request, response) => {
    requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'refund.manage', [
        'ops_admin',
        'billing_admin',
    ]);
    const payload = createRefundSchema.parse(request.body);
    response
        .status(201)
        .json(await domainService.createRefund(actor.publicId, actor.roleCodes[0] || actor.actorTypeCode, payload));
}));
adminRouter.get('/admin/rbac/roles', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'rbac.manage', ['ops_admin']);
    response.json(await domainService.listRoles());
}));
adminRouter.get('/admin/rbac/permissions', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'rbac.manage', ['ops_admin']);
    response.json(await domainService.listPermissions());
}));
adminRouter.get('/admin/rbac/users', asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'rbac.manage', ['ops_admin']);
    response.json(await domainService.listUsersWithRoles());
}));
adminRouter.put('/admin/rbac/users/:userId/roles', asyncHandler(async (request, response) => {
    requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'rbac.manage', ['ops_admin']);
    const payload = replaceUserRolesSchema.parse(request.body);
    response.json(await domainService.replaceUserRoles(actor.publicId, getRouteParam(request.params.userId), payload));
}));
