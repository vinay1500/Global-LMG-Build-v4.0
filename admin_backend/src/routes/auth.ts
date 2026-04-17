import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/httpErrors.js';
import { getSession, signIn, signOut } from '../modules/auth/service.js';

export const authRouter = Router();

const signInSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(8),
  rememberMe: z.boolean().optional(),
});

authRouter.get(
  '/auth/session',
  asyncHandler(async (request, response) => {
    response.json(await getSession(request, response));
  })
);

authRouter.post(
  '/auth/sign-in',
  asyncHandler(async (request, response) => {
    const payload = signInSchema.parse(request.body);
    response.json(
      await signIn(
        payload.identifier,
        payload.password,
        Boolean(payload.rememberMe),
        request,
        response
      )
    );
  })
);

authRouter.post(
  '/auth/sign-out',
  asyncHandler(async (request, response) => {
    response.json(await signOut(request, response));
  })
);
