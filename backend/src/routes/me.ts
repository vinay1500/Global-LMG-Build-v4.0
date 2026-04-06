import { type Request, Router } from 'express';
import { z } from 'zod';
import { requireActor, assertPermission } from '../lib/authorization.js';
import { requireAuthenticatedUser } from '../lib/authSession.js';
import { requireCsrf } from '../lib/csrf.js';
import { forbidden } from '../lib/httpErrors.js';
import { asyncHandler } from '../lib/httpErrors.js';
import { renderInvoicePdf } from '../lib/invoicePdf.js';
import { clientAccountsService } from '../modules/clientAccounts/service.js';
import { domainService } from '../modules/domain/service.js';
import { documentStorageService } from '../modules/storage/service.js';

export const meRouter = Router();

const notificationPreferencesSchema = z.object({
  caseActivityAlerts: z.boolean(),
  emailUpdates: z.boolean(),
  invoiceReminders: z.boolean(),
  productAnnouncements: z.boolean(),
  smsAlerts: z.boolean(),
});

const requireClientActor = async (request: Parameters<typeof requireActor>[0], response: Parameters<typeof requireActor>[1]) => {
  const actor = await requireActor(request, response);

  if (!actor.clientAccountId) {
    throw forbidden('client_account_required', 'A linked client account is required.');
  }

  return actor;
};

const getRouteParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || '' : value || '';

const sanitizeDownloadFilename = (value: string) =>
  value.replace(/["\r\n]+/g, '_').trim() || 'download.bin';

const getUserAgent = (request: Request) => request.get('user-agent') || null;

meRouter.get(
  '/me/preferences',
  asyncHandler(async (request, response) => {
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    const preferences = await clientAccountsService.getNotificationPreferences(
      authenticatedUser.id
    );
    response.json(preferences);
  })
);

meRouter.put(
  '/me/preferences',
  asyncHandler(async (request, response) => {
    requireCsrf(request);
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    const preferences = notificationPreferencesSchema.parse(request.body);
    const nextPreferences = await clientAccountsService.updateNotificationPreferences(
      authenticatedUser.id,
      preferences
    );
    response.json(nextPreferences);
  })
);

meRouter.get(
  '/me/client-account',
  asyncHandler(async (request, response) => {
    const actor = await requireClientActor(request, response);
    assertPermission(actor.permissionCodes, 'client_account.view');
    const clientAccount = await domainService.getMyClientAccount(actor.publicId);
    response.json(clientAccount);
  })
);

meRouter.get(
  '/me/matters',
  asyncHandler(async (request, response) => {
    const actor = await requireClientActor(request, response);
    assertPermission(actor.permissionCodes, 'matter.view');
    const matters = await domainService.listClientMatters(actor.clientAccountId!);
    response.json(matters);
  })
);

meRouter.get(
  '/me/matters/:matterId',
  asyncHandler(async (request, response) => {
    const actor = await requireClientActor(request, response);
    assertPermission(actor.permissionCodes, 'matter.view');
    const matter = await domainService.getClientMatter(actor.clientAccountId!, getRouteParam(request.params.matterId));
    response.json(matter);
  })
);

meRouter.get(
  '/me/documents',
  asyncHandler(async (request, response) => {
    const actor = await requireClientActor(request, response);
    assertPermission(actor.permissionCodes, 'document.view');
    const documents = await domainService.listClientDocuments(actor.clientAccountId!);
    response.json(documents);
  })
);

meRouter.get(
  '/me/documents/:documentId',
  asyncHandler(async (request, response) => {
    const actor = await requireClientActor(request, response);
    assertPermission(actor.permissionCodes, 'document.view');
    const document = await domainService.getClientDocument(
      actor.clientAccountId!,
      getRouteParam(request.params.documentId)
    );
    response.json(document);
  })
);

meRouter.get(
  '/me/documents/:documentId/download',
  asyncHandler(async (request, response) => {
    const actor = await requireClientActor(request, response);
    assertPermission(actor.permissionCodes, 'document.download');
    const result = await documentStorageService.getClientDocumentDownload(
      actor.publicId,
      actor.clientAccountId!,
      getRouteParam(request.params.documentId),
      {
        ipAddress: request.ip,
        userAgent: getUserAgent(request),
      }
    );

    await new Promise<void>((resolve, reject) => {
      response.sendFile(
        result.absolutePath,
        {
          headers: {
            'Content-Disposition': `attachment; filename="${sanitizeDownloadFilename(
              result.originalName
            )}"`,
            'Content-Type': result.mimeType,
          },
        },
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        }
      );
    });
  })
);

meRouter.get(
  '/me/events',
  asyncHandler(async (request, response) => {
    const actor = await requireClientActor(request, response);
    assertPermission(actor.permissionCodes, 'event.view');
    const events = await domainService.listClientEvents(actor.clientAccountId!);
    response.json(events);
  })
);

meRouter.get(
  '/me/invoices',
  asyncHandler(async (request, response) => {
    const actor = await requireClientActor(request, response);
    assertPermission(actor.permissionCodes, 'invoice.view');
    const invoices = await domainService.listClientInvoices(actor.clientAccountId!);
    response.json(invoices);
  })
);

meRouter.get(
  '/me/invoices/:invoiceId',
  asyncHandler(async (request, response) => {
    const actor = await requireClientActor(request, response);
    assertPermission(actor.permissionCodes, 'invoice.view');
    const invoice = await domainService.getClientInvoice(
      actor.clientAccountId!,
      getRouteParam(request.params.invoiceId)
    );
    response.json(invoice);
  })
);

meRouter.get(
  '/me/invoices/:invoiceId/download',
  asyncHandler(async (request, response) => {
    const actor = await requireClientActor(request, response);
    assertPermission(actor.permissionCodes, 'invoice.view');
    const invoice = await domainService.getClientInvoice(
      actor.clientAccountId!,
      getRouteParam(request.params.invoiceId)
    );
    const pdf = await renderInvoicePdf(invoice);
    const filename = sanitizeDownloadFilename(`${invoice.invoiceNumber || invoice.id}.pdf`);

    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    response.setHeader('Content-Type', 'application/pdf');
    response.send(pdf);
  })
);

meRouter.get(
  '/me/payments',
  asyncHandler(async (request, response) => {
    const actor = await requireClientActor(request, response);
    assertPermission(actor.permissionCodes, 'payment.view');
    const payments = await domainService.listClientPayments(actor.clientAccountId!);
    response.json(payments);
  })
);

meRouter.get(
  '/me/refunds',
  asyncHandler(async (request, response) => {
    const actor = await requireClientActor(request, response);
    assertPermission(actor.permissionCodes, 'refund.view');
    const refunds = await domainService.listClientRefunds(actor.clientAccountId!);
    response.json(refunds);
  })
);
