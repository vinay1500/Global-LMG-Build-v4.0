const encode = (value) => encodeURIComponent(value);
export const parseCookies = (cookieHeader) => {
    if (!cookieHeader) {
        return {};
    }
    return cookieHeader
        .split(';')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .reduce((cookies, entry) => {
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
export const serializeCookie = (name, value, options = {}) => {
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
export const appendCookie = (response, name, value, options = {}) => {
    response.append('Set-Cookie', serializeCookie(name, value, options));
};
export const clearCookie = (response, name, options = {}) => {
    response.append('Set-Cookie', serializeCookie(name, '', {
        ...options,
        maxAge: 0,
        path: options.path || '/',
    }));
};
