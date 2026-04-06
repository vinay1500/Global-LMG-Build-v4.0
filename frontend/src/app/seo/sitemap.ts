import { CAREER_CATEGORIES, CAREER_OPENINGS } from '../data/careers';
import { EXPERTISE_CATALOG } from '../data/expertiseCatalog';
import { INSIGHT_ARTICLES } from '../data/insights';
import { SERVICE_CATALOG, buildServicePath } from '../data/services';

export interface SitemapEntry {
  path: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  priority: string;
}

const STATIC_ENTRIES: SitemapEntry[] = [
  { path: '/', changeFrequency: 'weekly', priority: '1.0' },
  { path: '/about', changeFrequency: 'monthly', priority: '0.8' },
  { path: '/insights', changeFrequency: 'weekly', priority: '0.9' },
  { path: '/market-reports', changeFrequency: 'monthly', priority: '0.8' },
  { path: '/newsroom', changeFrequency: 'weekly', priority: '0.8' },
  { path: '/pro-bono', changeFrequency: 'monthly', priority: '0.7' },
  { path: '/careers', changeFrequency: 'weekly', priority: '0.8' },
  { path: '/privacy', changeFrequency: 'monthly', priority: '0.4' },
  { path: '/cookies', changeFrequency: 'monthly', priority: '0.4' },
  { path: '/legal-disclaimer', changeFrequency: 'monthly', priority: '0.4' },
];

const SERVICE_ENTRIES: SitemapEntry[] = SERVICE_CATALOG.map((service) => ({
  path: buildServicePath(service.title),
  changeFrequency: 'monthly',
  priority: '0.7',
}));

const CAREER_ENTRIES: SitemapEntry[] = [
  ...CAREER_CATEGORIES.map((category) => ({
    path: `/careers/${category.slug}`,
    changeFrequency: 'weekly' as const,
    priority: '0.7',
  })),
  ...CAREER_OPENINGS.map((opening) => ({
    path: `/careers/${opening.slug}`,
    changeFrequency: 'weekly' as const,
    priority: '0.6',
  })),
];

const EXPERTISE_ENTRIES: SitemapEntry[] = [
  ...EXPERTISE_CATALOG.map((category) => ({
    path: category.route,
    changeFrequency: 'monthly' as const,
    priority: '0.8',
  })),
  ...EXPERTISE_CATALOG.flatMap((category) =>
    category.items.map((item) => ({
      path: item.route,
      changeFrequency: 'monthly' as const,
      priority: '0.7',
    }))
  ),
];

const INSIGHT_ENTRIES: SitemapEntry[] = INSIGHT_ARTICLES.map((blog) => ({
  path: `/insights/${blog.id}`,
  changeFrequency: 'monthly',
  priority: '0.7',
}));

export const getSitemapEntries = () => {
  const seenPaths = new Set<string>();
  const entries = [
    ...STATIC_ENTRIES,
    ...SERVICE_ENTRIES,
    ...CAREER_ENTRIES,
    ...EXPERTISE_ENTRIES,
    ...INSIGHT_ENTRIES,
  ];

  return entries.filter((entry) => {
    if (seenPaths.has(entry.path)) {
      return false;
    }

    seenPaths.add(entry.path);
    return true;
  });
};

const getAbsoluteUrl = (baseUrl: string, path: string) => {
  return new URL(path, baseUrl).toString();
};

export const buildSitemapXml = (baseUrl: string) => {
  const normalizedBaseUrl = new URL(baseUrl).toString();
  const lastModified = new Date().toISOString();
  const urlEntries = getSitemapEntries()
    .map(
      (entry) => `  <url>
    <loc>${getAbsoluteUrl(normalizedBaseUrl, entry.path)}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;
};

export const buildRobotsTxt = (baseUrl: string) => {
  const normalizedBaseUrl = new URL(baseUrl).toString();

  return `User-agent: *
Allow: /

Sitemap: ${getAbsoluteUrl(normalizedBaseUrl, '/sitemap.xml')}
`;
};
