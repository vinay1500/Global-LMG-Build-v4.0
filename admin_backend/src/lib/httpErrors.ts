import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { getRequestId, logEvent } from './observability.js';

export class AppError extends Error {
  public readonly code: string;
  public readonly issues?: unknown;
  public readonly statusCode: number;

  constructor(statusCode: number, code: string, message: string, issues?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.issues = issues;
  }
}

export const badRequest = (code: string, message: string, issues?: unknown) =>
  new AppError(400, code, message, issues);

export const unauthorized = (code: string, message: string) =>
  new AppError(401, code, message);

export const forbidden = (code: string, message: string) => new AppError(403, code, message);

export const tooManyRequests = (code: string, message: string, issues?: unknown) =>
  new AppError(429, code, message, issues);

export const notFound = (code: string, message: string) => new AppError(404, code, message);

export const asyncHandler =
  (
    handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown> | unknown
  ) =>
  (request: Request, response: Response, next: NextFunction) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };

export const errorMiddleware = (
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction
) => {
  const requestId = getRequestId(response);

  if (error instanceof AppError) {
    logEvent(error.statusCode >= 500 ? 'error' : 'warn', 'request.error', {
      errorCode: error.code,
      issues: error.issues,
      method: request.method,
      path: request.originalUrl,
      requestId,
      statusCode: error.statusCode,
    });

    response.status(error.statusCode).json({
      error: error.code,
      issues: error.issues,
      message: error.message,
      requestId,
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  logEvent('error', 'request.error', {
    errorMessage: message,
    errorName: error instanceof Error ? error.name : 'UnknownError',
    errorStack: env.APP_ENV === 'production' ? undefined : error instanceof Error ? error.stack : undefined,
    method: request.method,
    path: request.originalUrl,
    requestId,
    statusCode: 500,
  });

  response.status(500).json({
    error: 'internal_server_error',
    message,
    requestId,
  });
};
