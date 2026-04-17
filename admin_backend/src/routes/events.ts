import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, badRequest } from '../lib/httpErrors.js';
import { createEvent, getWorkspace } from '../modules/events/service.js';
import { requireMutationPermission, requireReadPermission } from './shared.js';

export const eventsRouter = Router();

const createEventSchema = z.object({
  clientAccountId: z.string().trim().min(2).optional(),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.number().int().positive().max(720).optional(),
  matterId: z.string().trim().min(2).optional(),
  meetLink: z.string().trim().url().optional(),
  mode: z.string().trim().min(2).max(32),
  notes: z.string().trim().max(4000).optional(),
  time: z.string().trim().regex(/^\d{2}:\d{2}$/),
  title: z.string().trim().min(2).max(255),
  type: z.string().trim().min(2).max(32),
  visibleToClient: z.boolean().optional(),
});

eventsRouter.get(
  '/events',
  asyncHandler(async (request, response) => {
    await requireReadPermission(request, 'event.view');
    response.json(await getWorkspace());
  })
);

eventsRouter.post(
  '/events',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'event.manage');
    const payload = createEventSchema.parse(request.body);

    if (!payload.clientAccountId && !payload.matterId) {
      throw badRequest(
        'event_context_required',
        'Either matterId or clientAccountId is required to create an event.'
      );
    }

    response.status(201).json(await createEvent(actor, payload));
  })
);
