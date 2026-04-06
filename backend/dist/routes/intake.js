import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, badRequest } from '../lib/httpErrors.js';
const intakePayloadSchema = z.object({
    companyName: z.string().min(2).max(160),
    contactEmail: z.string().email(),
    contactName: z.string().min(2).max(120),
    message: z.string().min(10).max(5000),
    practiceArea: z.string().min(2).max(120).optional(),
});
export const intakeRouter = Router();
intakeRouter.post('/intake', asyncHandler(async (request, response) => {
    const parsedPayload = intakePayloadSchema.safeParse(request.body);
    if (!parsedPayload.success) {
        throw badRequest('invalid_intake_payload', 'Client intake payload validation failed.', parsedPayload.error.flatten());
    }
    response.status(501).json({
        message: 'Phase 6 scaffold only. Replace the temporary Google Form by persisting this payload through the real intake service in a future phase.',
    });
}));
