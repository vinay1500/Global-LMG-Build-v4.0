import {
  BRAND_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  PRESS_EMAIL,
  PRO_BONO_EMAIL,
  SECURITY_EMAIL,
  SITE_DESCRIPTION,
} from '../config/brand';
import { DEFAULT_SEO_IMAGE_PATH, getAbsoluteSiteUrl } from './siteMetadata';

export type SeoJsonLd = Record<string, unknown>;

export interface BreadcrumbItem {
  name: string;
  path: string;
}

interface WebPageJsonLdOptions {
  title: string;
  description: string;
  path: string;
  type?: string;
}

interface ArticleJsonLdOptions {
  title: string;
  description: string;
  path: string;
  image?: string;
  publishedTime?: string;
  authorName?: string;
  section?: string;
  keywords?: string[];
}

interface ServiceJsonLdOptions {
  name: string;
  description: string;
  path: string;
  serviceType?: string;
}

const buildOrganizationReference = () => ({
  '@type': 'Organization',
  name: BRAND_NAME,
  url: getAbsoluteSiteUrl('/'),
  logo: getAbsoluteSiteUrl('/favicon.svg'),
});

export const buildOrganizationJsonLd = (): SeoJsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BRAND_NAME,
  url: getAbsoluteSiteUrl('/'),
  description: SITE_DESCRIPTION,
  logo: getAbsoluteSiteUrl('/favicon.svg'),
  email: CONTACT_EMAIL,
  telephone: CONTACT_PHONE,
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'client enquiries',
      email: CONTACT_EMAIL,
      telephone: CONTACT_PHONE,
      areaServed: 'Global',
      availableLanguage: ['English'],
    },
    {
      '@type': 'ContactPoint',
      contactType: 'press',
      email: PRESS_EMAIL,
      areaServed: 'Global',
      availableLanguage: ['English'],
    },
    {
      '@type': 'ContactPoint',
      contactType: 'pro bono',
      email: PRO_BONO_EMAIL,
      areaServed: 'Global',
      availableLanguage: ['English'],
    },
    {
      '@type': 'ContactPoint',
      contactType: 'security',
      email: SECURITY_EMAIL,
      areaServed: 'Global',
      availableLanguage: ['English'],
    },
  ],
});

export const buildWebSiteJsonLd = (): SeoJsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: BRAND_NAME,
  url: getAbsoluteSiteUrl('/'),
  description: SITE_DESCRIPTION,
  publisher: buildOrganizationReference(),
});

export const buildBreadcrumbJsonLd = (items: BreadcrumbItem[]): SeoJsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: getAbsoluteSiteUrl(item.path),
  })),
});

export const buildWebPageJsonLd = ({
  title,
  description,
  path,
  type = 'WebPage',
}: WebPageJsonLdOptions): SeoJsonLd => ({
  '@context': 'https://schema.org',
  '@type': type,
  name: title,
  description,
  url: getAbsoluteSiteUrl(path),
  isPartOf: {
    '@type': 'WebSite',
    name: BRAND_NAME,
    url: getAbsoluteSiteUrl('/'),
  },
});

export const buildArticleJsonLd = ({
  title,
  description,
  path,
  image = DEFAULT_SEO_IMAGE_PATH,
  publishedTime,
  authorName,
  section,
  keywords,
}: ArticleJsonLdOptions): SeoJsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  description,
  url: getAbsoluteSiteUrl(path),
  image: [getAbsoluteSiteUrl(image)],
  datePublished: publishedTime,
  author: authorName
    ? {
        '@type': 'Person',
        name: authorName,
      }
    : buildOrganizationReference(),
  publisher: buildOrganizationReference(),
  articleSection: section,
  keywords,
});

export const buildServiceJsonLd = ({
  name,
  description,
  path,
  serviceType,
}: ServiceJsonLdOptions): SeoJsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  name,
  description,
  url: getAbsoluteSiteUrl(path),
  serviceType: serviceType ?? name,
  provider: buildOrganizationReference(),
  areaServed: 'Global',
});
