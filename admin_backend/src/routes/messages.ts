import { Router } from 'express';
import { requireCsrf } from '../lib/csrf.js';
import { asyncHandler } from '../lib/httpErrors.js';
import { adminMessagingService } from '../modules/messaging/service.js';
import { requireAdminPermission, getRouteParam } from './shared.js';

export const messagesRouter = Router();

messagesRouter.get(
  '/messages/threads',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'message.view', [
      'ops_admin',
      'case_manager',
      'messaging_desk',
      'management_viewer',
    ]);
    response.json(
      await adminMessagingService.listThreads({
        limit: Number(request.query.limit || 20),
        offset: Number(request.query.offset || 0),
        search: typeof request.query.search === 'string' ? request.query.search : undefined,
      })
    );
  })
);

messagesRouter.get(
  '/messages/threads/:threadId',
  asyncHandler(async (request, response) => {
    await requireAdminPermission(request, response, 'message.view', [
      'ops_admin',
      'case_manager',
      'messaging_desk',
      'management_viewer',
    ]);
    response.json(await adminMessagingService.getThread(getRouteParam(request.params.threadId)));
  })
);

messagesRouter.post(
  '/messages/threads/:threadId/replies',
  asyncHandler(async (request, response) => {
    await requireCsrf(request);
    const actor = await requireAdminPermission(request, response, 'message.send', [
      'ops_admin',
      'case_manager',
      'messaging_desk',
    ]);
    response
      .status(201)
      .json(
        await adminMessagingService.sendReply(
          actor.userId,
          actor.publicId,
          actor.roleCodes[0] || actor.actorTypeCode,
          getRouteParam(request.params.threadId),
          request.body
        )
      );
  })
);
