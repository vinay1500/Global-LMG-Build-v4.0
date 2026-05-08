import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

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

const normalizeLookup = (value: string) => value.trim().toLowerCase();

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
const COUNTRY_CODE_TO_DIAL_CODE: Record<string, string> = Object.fromEntries(
  COUNTRY_RECORDS.map(({ code, dialCode }) => [code, dialCode])
);

const NAME_TO_COUNTRY_CODE: Record<string, string> = Object.fromEntries(
  COUNTRY_RECORDS.flatMap(({ name, code }) => [
    [name, code],
    [normalizeLookup(name), code],
  ])
);
const COUNTRY_CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  COUNTRY_RECORDS.map(({ name, code }) => [code, name])
);

export const getCountryDialCode = (country: string) => {
  const countryCode = getCountryCode(country) || country.trim().toUpperCase();
  return COUNTRY_DIAL_CODES[country] || COUNTRY_CODE_TO_DIAL_CODE[countryCode] || '';
};

export const getCountryCode = (country: string) => {
  const trimmed = country.trim();
  const uppercase = trimmed.toUpperCase();
  const codeFromName = NAME_TO_COUNTRY_CODE[trimmed] || NAME_TO_COUNTRY_CODE[normalizeLookup(trimmed)];

  if (codeFromName) {
    return codeFromName;
  }

  return COUNTRY_CODE_TO_NAME[uppercase] ? uppercase : '';
};

export const getCountryName = (countryCode: string) =>
  COUNTRY_CODE_TO_NAME[countryCode.trim().toUpperCase()] || '';

export const getCountryNameOrSelf = (value: string) => getCountryName(value) || value;

export const isPostalCodeReasonable = (postalCode: string, country: string) => {
  const trimmed = postalCode.trim();
  const countryCode = getCountryCode(country) || country.trim().toUpperCase();

  if (!trimmed) {
    return false;
  }

  if (countryCode === 'IN') {
    return /^\d{6}$/.test(trimmed);
  }

  if (countryCode === 'US') {
    return /^\d{5}(-\d{4})?$/.test(trimmed);
  }

  if (countryCode === 'GB') {
    return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(trimmed);
  }

  return trimmed.length >= 3 && trimmed.length <= 20;
};

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
  const countryCode = getCountryCode(country);
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
  const typedCountryCode = countryCode as CountryCode;
  const formatted = new AsYouType(typedCountryCode).input(`+${getCountryCallingCode(typedCountryCode)}${nationalDigits}`);

  return formatted || `${dialCode} `;
};
