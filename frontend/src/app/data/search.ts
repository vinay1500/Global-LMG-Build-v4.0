import { CAREER_CATEGORIES, CAREER_OPENINGS } from './careers';
import { EXPERTISE_CATALOG } from './expertiseCatalog';
import { INSIGHT_ARTICLES } from './insights';
import { LEGAL_SEARCH_ENTRIES } from './legalContent';
import { SERVICE_CATALOG, buildServicePath } from './services';

export interface SearchEntry {
  id: string;
  label: string;
  type:
    | 'Service'
    | 'Practice Area'
    | 'Expertise Item'
    | 'Career Category'
    | 'Career Opening'
    | 'Insight'
    | 'Legal';
  route: string;
  subtitle?: string;
  keywords: string[];
}

export const SEARCH_INDEX: SearchEntry[] = [
  ...SERVICE_CATALOG.map((service) => {
    return {
      id: `service:${service.id}`,
      label: service.title,
      type: 'Service' as const,
      route: buildServicePath(service.title),
      subtitle: 'Service',
      keywords: [service.title, service.summary],
    };
  }),
  ...EXPERTISE_CATALOG.flatMap((category) => [
    {
      id: `practice:${category.categorySlug}`,
      label: category.category,
      type: 'Practice Area' as const,
      route: category.route,
      subtitle: 'Practice Area',
      keywords: [category.category, category.description],
    },
    ...category.items.map((item) => ({
      id: `expertise-item:${category.categorySlug}:${item.itemSlug}`,
      label: item.title,
      type: 'Expertise Item' as const,
      route: item.route,
      subtitle: category.category,
      keywords: [item.title, item.summary, category.category],
    })),
  ]),
  ...CAREER_CATEGORIES.map((category) => ({
    id: `career-category:${category.slug}`,
    label: category.title,
    type: 'Career Category' as const,
    route: `/careers/${category.slug}`,
    subtitle: 'Careers',
    keywords: [category.title, category.description, category.heroDescription],
  })),
  ...CAREER_OPENINGS.map((opening) => ({
    id: `career-opening:${opening.slug}`,
    label: opening.title,
    type: 'Career Opening' as const,
    route: `/careers/${opening.slug}`,
    subtitle: `${opening.categoryTitle} • ${opening.location}`,
    keywords: [
      opening.title,
      opening.description,
      opening.categoryTitle,
      opening.location,
      opening.department,
    ],
  })),
  ...INSIGHT_ARTICLES.map((blog) => ({
    id: `insight:${blog.id}`,
    label: blog.title,
    type: 'Insight' as const,
    route: `/insights/${blog.id}`,
    subtitle: `${blog.category} • ${blog.type}`,
    keywords: [blog.title, blog.excerpt, blog.category, blog.type, ...(blog.tags || [])],
  })),
  ...LEGAL_SEARCH_ENTRIES,
];
