import { getCountryCode } from './countryDialCodes';

const POSTAL_CODE_TERMS: Record<string, { label: string; placeholder: string }> = {
  AU: { label: 'Postcode', placeholder: 'Postcode' },
  BR: { label: 'CEP', placeholder: 'CEP' },
  CA: { label: 'Postal code', placeholder: 'Postal code' },
  DE: { label: 'Postal code', placeholder: 'Postal code' },
  FR: { label: 'Postal code', placeholder: 'Postal code' },
  GB: { label: 'Postcode', placeholder: 'Postcode' },
  IE: { label: 'Eircode', placeholder: 'Eircode' },
  IN: { label: 'PIN code', placeholder: '6-digit PIN code' },
  IT: { label: 'CAP', placeholder: 'CAP' },
  JP: { label: 'Postal code', placeholder: 'Postal code' },
  MX: { label: 'Código postal', placeholder: 'Código postal' },
  NL: { label: 'Postcode', placeholder: 'Postcode' },
  NZ: { label: 'Postcode', placeholder: 'Postcode' },
  SG: { label: 'Postal code', placeholder: 'Postal code' },
  US: { label: 'ZIP code', placeholder: 'ZIP code' },
  ZA: { label: 'Postal code', placeholder: 'Postal code' },
};

export const getPostalCodeMetadata = (country: string) => {
  const countryCode = getCountryCode(country) || country.trim().toUpperCase();
  return POSTAL_CODE_TERMS[countryCode] || { label: 'Postal code', placeholder: 'Postal code' };
};
