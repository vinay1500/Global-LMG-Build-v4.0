import type { Response } from 'express';

type CookieOptions = {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
};

export const parseCookies = (cookieHeader: string | undefined) => {
  if (!cookieHeader) {
    return {} as Record<string, string>;
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((accumulator, chunk) => {
    const [rawName, ...rest] = chunk.trim().split('=');
    if (!rawName) {
      return accumulator;
    }

    accumulator[rawName] = decodeURIComponent(rest.join('='));
    return accumulator;
  }, {});
};

const serializeCookie = (name: string, value: string, options: CookieOptions = {}) => {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || '/'}`);

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
};

export const appendCookie = (
  response: Response,
  name: string,
  value: string,
  options: CookieOptions = {}
) => {
  const existing = response.getHeader('Set-Cookie');
  const nextCookie = serializeCookie(name, value, options);

  if (!existing) {
    response.setHeader('Set-Cookie', nextCookie);
    return;
  }

  if (Array.isArray(existing)) {
    response.setHeader('Set-Cookie', [...existing, nextCookie]);
    return;
  }

  response.setHeader('Set-Cookie', [String(existing), nextCookie]);
};

export const clearCookie = (response: Response, name: string, options: CookieOptions = {}) => {
  appendCookie(response, name, '', {
    ...options,
    maxAge: 0,
  });
};
