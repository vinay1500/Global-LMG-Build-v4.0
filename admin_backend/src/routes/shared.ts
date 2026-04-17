import type { Request } from 'express';
import { requireAdminSession } from '../modules/auth/service.js';

export const requireReadActor = async (request: Request) => requireAdminSession(request);
