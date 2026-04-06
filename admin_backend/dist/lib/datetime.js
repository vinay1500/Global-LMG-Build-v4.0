const pad = (value, size = 2) => String(value).padStart(size, '0');
export const toMysqlDateTime = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    return [
        `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
        `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}000`,
    ].join(' ');
};
export const fromMysqlDateTime = (value) => {
    if (!value) {
        return undefined;
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value === 'string') {
        const normalized = value.includes('T') ? value : value.replace(' ', 'T');
        return normalized.endsWith('Z') ? normalized : `${normalized}Z`;
    }
    return undefined;
};
export const nowUtc = () => new Date().toISOString();
export const addMinutesUtc = (minutes) => new Date(Date.now() + minutes * 60_000).toISOString();
export const addHoursUtc = (hours) => new Date(Date.now() + hours * 60 * 60_000).toISOString();
export const addDaysUtc = (days) => new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
