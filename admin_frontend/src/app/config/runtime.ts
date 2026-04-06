const DEFAULT_ADMIN_API_BASE_URL = '/api';

const getApiBaseUrl = (value: string | undefined) => {
  if (!value) {
    return DEFAULT_ADMIN_API_BASE_URL;
  }

  if (value.startsWith('/')) {
    return value;
  }

  try {
    return new URL(value).toString();
  } catch {
    return DEFAULT_ADMIN_API_BASE_URL;
  }
};

export const ADMIN_API_BASE_URL = getApiBaseUrl(import.meta.env.VITE_ADMIN_API_BASE_URL);
