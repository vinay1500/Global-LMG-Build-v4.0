import type { RowDataPacket } from 'mysql2/promise';

export interface TimestampedRow extends RowDataPacket {
  [key: string]: unknown;
}

const pad = (value: number, size = 2) => String(value).padStart(size, '0');

export const toMysqlDateTime = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);

  return [
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(
      date.getUTCMilliseconds(),
      3
    )}000`,
  ].join(' ');
};

export const fromMysqlDateTime = (value: unknown) => {
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

export const addMinutesUtc = (minutes: number) =>
  new Date(Date.now() + minutes * 60_000).toISOString();

export const addHoursUtc = (hours: number) =>
  new Date(Date.now() + hours * 60 * 60_000).toISOString();

export const addDaysUtc = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
