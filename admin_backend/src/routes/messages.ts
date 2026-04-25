import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/httpErrors.js';
import { archiveThread, getWorkspace, markThreadRead, replyToThread } from '../modules/messages/service.js';
import { requireMutationPermission, requireReadPermission } from './shared.js';

export const messagesRouter = Router();

const replySchema = z.object({
  content: z.string().trim().min(1).max(4000),
  visibleToClient: z.boolean().optional(),
});

messagesRouter.get(
  '/messages/workspace',
  asyncHandler(async (request, response) => {
    const actor = await requireReadPermission(request, 'message.send');
    response.json(await getWorkspace(actor));
  })
);

messagesRouter.post(
  '/messages/:threadId/replies',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'message.send');
    response.status(201).json(
      await replyToThread(actor, {
        ...replySchema.parse(request.body),
        threadId: String(request.params.threadId || ''),
      })
    );
  })
);

messagesRouter.post(
  '/messages/:threadId/read',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'message.send');
    response.json(await markThreadRead(actor, String(request.params.threadId || '')));
  })
);

messagesRouter.post(
  '/messages/:threadId/archive',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'message.send');
    response.json(await archiveThread(actor, String(request.params.threadId || '')));
  })
);
