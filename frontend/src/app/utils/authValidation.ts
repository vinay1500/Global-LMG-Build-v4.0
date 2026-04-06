import { parsePhoneNumberFromString } from 'libphonenumber-js';

export const AUTH_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[\p{L}][\p{L}\p{M}\s'.-]{1,79}$/u;
const COMPANY_REGEX = /^[\p{L}\p{N}][\p{L}\p{M}\p{N}\s&'.,()-]{1,99}$/u;
const ROLE_REGEX = /^[\p{L}\p{N}][\p{L}\p{M}\p{N}\s&'.,()/+-]{1,79}$/u;

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const normalizePhone = (value: string) => {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');

  return `${hasPlus ? '+' : ''}${digits}`;
};

export const trimField = (value: string) => value.trim().replace(/\s+/g, ' ');

export const isValidEmail = (value: string) => AUTH_EMAIL_REGEX.test(normalizeEmail(value));

export const isValidPhone = (value: string) => {
  const normalized = normalizePhone(value);
  if (!normalized.startsWith('+')) {
    return false;
  }

  const parsedPhone = parsePhoneNumberFromString(normalized);
  return Boolean(parsedPhone?.isPossible());
};

export const isValidFullName = (value: string) => NAME_REGEX.test(trimField(value));

export const isValidCompanyName = (value: string) =>
  value.trim().length === 0 || COMPANY_REGEX.test(trimField(value));

export const isValidRole = (value: string) =>
  value.trim().length === 0 || ROLE_REGEX.test(trimField(value));

export const getPasswordStrengthErrors = (value: string) => {
  const errors: string[] = [];

  if (value.trim().length < 10) {
    errors.push('Password must be at least 10 characters long.');
  }
  if (!/[A-Z]/.test(value)) {
    errors.push('Password must include at least one uppercase letter.');
  }
  if (!/[a-z]/.test(value)) {
    errors.push('Password must include at least one lowercase letter.');
  }
  if (!/\d/.test(value)) {
    errors.push('Password must include at least one number.');
  }
  if (!/[^A-Za-z0-9]/.test(value)) {
    errors.push('Password must include at least one special character.');
  }

  return errors;
};
