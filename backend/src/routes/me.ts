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
  inAppAlerts: z.boolean().default(true),
  invoiceReminders: z.boolean(),
  productAnnouncements: z.boolean(),
  smsAlerts: z.boolean(),
  whatsappAlerts: z.boolean().default(false),
});

const accountContactSchema = z.object({
  whatsappNumber: z.string().trim().min(8).max(40),
  whatsappSameAsMobile: z.boolean(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10).max(200),
});

const emailChangeRequestSchema = z.object({
  email: z.string().trim().email(),
});

const emailChangeConfirmSchema = z.object({
  code: z.string().trim().min(4).max(12),
  email: z.string().trim().email(),
});

const phoneChangeRequestSchema = z.object({
  phone: z.string().trim().min(8).max(40),
});

const phoneChangeConfirmSchema = z.object({
  code: z.string().trim().min(4).max(12),
  phone: z.string().trim().min(8).max(40),
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
  '/me/account-settings',
  asyncHandler(async (request, response) => {
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    response.json(await clientAccountsService.getAccountSettings(authenticatedUser.id));
  })
);

meRouter.patch(
  '/me/account/contact',
  asyncHandler(async (request, response) => {
    requireCsrf(request);
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    response.json(
      await clientAccountsService.updateContactSettings(
        authenticatedUser.id,
        accountContactSchema.parse(request.body)
      )
    );
  })
);

meRouter.post(
  '/me/account/password',
  asyncHandler(async (request, response) => {
    requireCsrf(request);
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    response.json(
      await clientAccountsService.changePassword(
        authenticatedUser.id,
        changePasswordSchema.parse(request.body)
      )
    );
  })
);

meRouter.post(
  '/me/account/email-change/request',
  asyncHandler(async (request, response) => {
    requireCsrf(request);
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    const payload = emailChangeRequestSchema.parse(request.body);
    response.json(await clientAccountsService.requestEmailChange(authenticatedUser.id, payload.email));
  })
);

meRouter.post(
  '/me/account/email-change/confirm',
  asyncHandler(async (request, response) => {
    requireCsrf(request);
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    response.json(
      await clientAccountsService.confirmEmailChange(
        authenticatedUser.id,
        emailChangeConfirmSchema.parse(request.body)
      )
    );
  })
);

meRouter.post(
  '/me/account/phone-change/request',
  asyncHandler(async (request, response) => {
    requireCsrf(request);
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    const payload = phoneChangeRequestSchema.parse(request.body);
    response.json(await clientAccountsService.requestPhoneChange(authenticatedUser.id, payload.phone));
  })
);

meRouter.post(
  '/me/account/phone-change/confirm',
  asyncHandler(async (request, response) => {
    requireCsrf(request);
    const authenticatedUser = await requireAuthenticatedUser(request, response);
    response.json(
      await clientAccountsService.confirmPhoneChange(
        authenticatedUser.id,
        phoneChangeConfirmSchema.parse(request.body)
      )
    );
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
  '/me/documents/:documentId/preview',
  asyncHandler(async (request, response) => {
    const actor = await requireClientActor(request, response);
    assertPermission(actor.permissionCodes, 'document.view');
    const result = await documentStorageService.getClientDocumentPreview(
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
            'Cache-Control': 'no-store',
            'Content-Disposition': `inline; filename="${sanitizeDownloadFilename(
              result.originalName
            )}"`,
            'Content-Security-Policy': 'sandbox',
            'Content-Type': result.mimeType,
            'X-Content-Type-Options': 'nosniff',
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
