import { SITE_DESCRIPTION, SITE_TITLE } from '../config/brand';
import { PUBLIC_SITE_URL } from '../config/runtime';

export const DEFAULT_SEO_TITLE = SITE_TITLE;
export const DEFAULT_SEO_DESCRIPTION = SITE_DESCRIPTION;
export const DEFAULT_SEO_IMAGE_PATH = '/images/unsplash/photo-1758448656987-cfae6bf225e4.jpg';
export const DEFAULT_TWITTER_CARD = 'summary_large_image';
export const DEFAULT_ROBOTS = 'index, follow';
export const DEFAULT_THEME_COLOR = '#0a0a0a';

export const getAbsoluteSiteUrl = (pathOrUrl: string) => {
  try {
    return new URL(pathOrUrl, PUBLIC_SITE_URL).toString();
  } catch {
    return PUBLIC_SITE_URL;
  }
};

export const getSeoTitle = (title?: string) => {
  if (!title || title === SITE_TITLE) {
    return SITE_TITLE;
  }

  return `${title} | ${SITE_TITLE}`;
};
