import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';

export const DEFAULT_COUNTRY = 'India';

const COUNTRY_NAME_OVERRIDES: Record<string, string> = {
  AC: 'Ascension Island',
  TA: 'Tristan da Cunha',
  XK: 'Kosovo',
};

const regionDisplayNames =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

const buildCountryName = (countryCode: string) =>
  COUNTRY_NAME_OVERRIDES[countryCode] || regionDisplayNames?.of(countryCode) || countryCode;

const COUNTRY_RECORDS = getCountries()
  .map((countryCode) => ({
    code: countryCode,
    name: buildCountryName(countryCode),
    dialCode: `+${getCountryCallingCode(countryCode)}`,
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

export const COUNTRIES = COUNTRY_RECORDS.map(({ name }) => name);
const COUNTRY_DIAL_CODES: Record<string, string> = Object.fromEntries(
  COUNTRY_RECORDS.map(({ name, dialCode }) => [name, dialCode])
);

const NAME_TO_COUNTRY_CODE: Record<string, string> = Object.fromEntries(
  COUNTRY_RECORDS.map(({ name, code }) => [name, code])
);

export const getCountryDialCode = (country: string) => COUNTRY_DIAL_CODES[country] || '';

export const getCountryCode = (country: string) => NAME_TO_COUNTRY_CODE[country] || '';

export const detectCountryFromPhone = (phone: string, fallbackCountry = DEFAULT_COUNTRY) => {
  const normalized = phone.trim();
  if (!normalized) {
    return fallbackCountry;
  }

  const parsed = parsePhoneNumberFromString(normalized);
  if (!parsed?.country) {
    return fallbackCountry;
  }

  return buildCountryName(parsed.country);
};

export const applyCountryDialCode = (phone: string, country: string) => {
  const countryCode = NAME_TO_COUNTRY_CODE[country];
  const dialCode = getCountryDialCode(country);

  if (!countryCode || !dialCode) {
    return phone.trim();
  }

  const trimmed = phone.trim();
  if (!trimmed) {
    return `${dialCode} `;
  }

  if (trimmed.startsWith('+')) {
    const parsedPhone = parsePhoneNumberFromString(trimmed);
    if (parsedPhone?.country === countryCode) {
      return trimmed;
    }
  }

  const digitsOnly = trimmed.replace(/[^\d]/g, '');
  const parsedExistingPhone = parsePhoneNumberFromString(trimmed);
  const nationalDigits = parsedExistingPhone?.nationalNumber || digitsOnly;
  const formatted = new AsYouType(countryCode).input(`+${getCountryCallingCode(countryCode)}${nationalDigits}`);

  return formatted || `${dialCode} `;
};
