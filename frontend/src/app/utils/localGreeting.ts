import { getCountryTimeZone } from './geoAddressData';

const getHourInTimezone = (timeZone: string, date: Date) => {
  try {
    const hour = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone,
    }).formatToParts(date).find((part) => part.type === 'hour')?.value;

    return Number(hour);
  } catch {
    return date.getHours();
  }
};

export const getGreetingForCountry = (
  countryCodeOrName: string | null | undefined,
  date = new Date()
) => {
  const timeZone = getCountryTimeZone(countryCodeOrName);
  const hour = timeZone ? getHourInTimezone(timeZone, date) : date.getHours();

  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  }

  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }

  if (hour >= 17 && hour < 22) {
    return 'Good evening';
  }

  return 'Hello';
};
