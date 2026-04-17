import type { NextFunction, Request, Response } from 'express';

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
  _request: Request,
  response: Response,
  _next: NextFunction
) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: error.code,
      issues: error.issues,
      message: error.message,
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  response.status(500).json({
    error: 'internal_server_error',
    message,
  });
};
