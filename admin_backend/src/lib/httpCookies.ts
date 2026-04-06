import type { Response } from 'express';

export interface CookieOptions {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
}

const encode = (value: string) => encodeURIComponent(value);

export const parseCookies = (cookieHeader: string | undefined) => {
  if (!cookieHeader) {
    return {} as Record<string, string>;
  }

  return cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex === -1) {
        return cookies;
      }

      const name = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      cookies[name] = decodeURIComponent(value);
      return cookies;
    }, {});
};

export const serializeCookie = (name: string, value: string, options: CookieOptions = {}) => {
  const parts = [`${name}=${encode(value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }

  parts.push(`Path=${options.path || '/'}`);

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
  response.append('Set-Cookie', serializeCookie(name, value, options));
};

export const clearCookie = (
  response: Response,
  name: string,
  options: Pick<CookieOptions, 'path' | 'sameSite' | 'secure'> = {}
) => {
  response.append(
    'Set-Cookie',
    serializeCookie(name, '', {
      ...options,
      maxAge: 0,
      path: options.path || '/',
    })
  );
};
