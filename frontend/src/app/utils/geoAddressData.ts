import Country from 'country-state-city/lib/country';
import State from 'country-state-city/lib/state';
import { getCountryCode } from './countryDialCodes';

const normalizeLookup = (value: string) => value.trim().toLowerCase();

export const getStateRegionSuggestions = (country: string) => {
  const countryCode = getCountryCode(country) || country.trim().toUpperCase();
  return State.getStatesOfCountry(countryCode)
    .map((state) => state.name)
    .sort((left, right) => left.localeCompare(right));
};

export const getStateCode = (country: string, stateOrRegion: string) => {
  const countryCode = getCountryCode(country) || country.trim().toUpperCase();
  const normalizedState = normalizeLookup(stateOrRegion);
  const state = State.getStatesOfCountry(countryCode).find(
    (entry) => normalizeLookup(entry.name) === normalizedState || normalizeLookup(entry.isoCode) === normalizedState
  );

  return state?.isoCode || '';
};

export const getCountryTimeZone = (countryCodeOrName: string | null | undefined) => {
  const countryCode = countryCodeOrName
    ? getCountryCode(countryCodeOrName) || countryCodeOrName.trim().toUpperCase()
    : '';
  const timezones = countryCode ? Country.getCountryByCode(countryCode)?.timezones || [] : [];

  if (!timezones.length) {
    return null;
  }

  const sortedTimezones = [...timezones].sort((left, right) => left.gmtOffset - right.gmtOffset);
  return sortedTimezones[Math.floor(sortedTimezones.length / 2)]?.zoneName || timezones[0]?.zoneName || null;
};

export const getCountryCurrency = (countryCodeOrName: string | null | undefined) => {
  const countryCode = countryCodeOrName
    ? getCountryCode(countryCodeOrName) || countryCodeOrName.trim().toUpperCase()
    : '';

  return countryCode ? Country.getCountryByCode(countryCode)?.currency || null : null;
};
