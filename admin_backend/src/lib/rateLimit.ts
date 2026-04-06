import type { Request, RequestHandler, Response } from 'express';

interface RateLimitOptions {
  keyPrefix: string;
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const getClientKey = (request: Request, keyPrefix: string) => {
  const clientIp = request.ip || request.socket.remoteAddress || 'unknown';
  return `${keyPrefix}:${clientIp}`;
};

const pruneExpiredEntries = (now: number) => {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
};

const setRateLimitHeaders = (
  response: Response,
  maxRequests: number,
  remainingRequests: number,
  resetAt: number
) => {
  response.setHeader('x-ratelimit-limit', String(maxRequests));
  response.setHeader('x-ratelimit-remaining', String(Math.max(0, remainingRequests)));
  response.setHeader('x-ratelimit-reset', String(Math.ceil(resetAt / 1000)));
};

export const createRateLimitMiddleware = ({
  keyPrefix,
  maxRequests,
  windowMs,
}: RateLimitOptions): RequestHandler => {
  if (maxRequests <= 0 || windowMs <= 0) {
    return (_request, _response, next) => next();
  }

  return (request, response, next) => {
    const now = Date.now();

    if (rateLimitStore.size > 5000) {
      pruneExpiredEntries(now);
    }

    const key = getClientKey(request, keyPrefix);
    const existingEntry = rateLimitStore.get(key);
    const isExpired = !existingEntry || existingEntry.resetAt <= now;
    const activeEntry = isExpired
      ? {
          count: 0,
          resetAt: now + windowMs,
        }
      : existingEntry;

    activeEntry.count += 1;
    rateLimitStore.set(key, activeEntry);

    const remainingRequests = maxRequests - activeEntry.count;
    setRateLimitHeaders(response, maxRequests, remainingRequests, activeEntry.resetAt);

    if (activeEntry.count > maxRequests) {
      response.status(429).json({
        error: 'rate_limit_exceeded',
        message: 'Too many requests. Try again later.',
      });
      return;
    }

    next();
  };
};
