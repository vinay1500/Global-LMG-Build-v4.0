import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/httpErrors.js';
import {
  listReminderWorkspace,
  processDueReminders,
  retryReminder,
} from '../modules/reminders/service.js';
import { requireMutationPermission, requireReadPermission } from './shared.js';

export const remindersRouter = Router();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const processSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const reminderParamsSchema = z.object({
  reminderId: z.coerce.number().int().positive(),
});

remindersRouter.get(
  '/reminders/workspace',
  asyncHandler(async (request, response) => {
    await requireReadPermission(request, 'event.view');
    response.json(await listReminderWorkspace(listQuerySchema.parse(request.query)));
  })
);

remindersRouter.post(
  '/reminders/process',
  asyncHandler(async (request, response) => {
    await requireMutationPermission(request, 'event.manage');
    response.json(await processDueReminders(processSchema.parse(request.body || {})));
  })
);

remindersRouter.post(
  '/reminders/:reminderId/retry',
  asyncHandler(async (request, response) => {
    const actor = await requireMutationPermission(request, 'event.manage');
    const params = reminderParamsSchema.parse(request.params);
    response.json(await retryReminder(actor, params.reminderId));
  })
);
