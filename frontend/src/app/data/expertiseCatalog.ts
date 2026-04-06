import { getExpertiseItemsByCategory } from './expertiseDetails';
import { PRACTICE_AREAS_SOURCE } from './practiceAreas';
import {
  getDescriptionFromLabeledText,
  getTitleFromLabeledText,
  matchesSlugOrTitle,
  slugify,
} from '../utils/slug';

export interface ExpertiseCatalogItem {
  title: string;
  summary: string;
  categoryTitle: string;
  categorySlug: string;
  itemSlug: string;
  legacyId?: string;
  route: string;
  fullContent: string;
}

export interface ExpertiseCatalogCategory {
  category: string;
  categorySlug: string;
  description: string;
  route: string;
  items: ExpertiseCatalogItem[];
}

const buildFallbackContent = (title: string, categoryTitle: string, summary: string) => `
  <h2>${title}</h2>
  <p>${summary || `We provide focused legal support for ${title.toLowerCase()} matters within ${categoryTitle.toLowerCase()}.`}</p>

  <h3>How we help</h3>
  <ul>
    <li>Issue assessment and legal risk review tailored to the matter.</li>
    <li>Drafting, review, and negotiation support for relevant documents.</li>
    <li>Process guidance on strategy, next steps, and coordination.</li>
    <li>Practical advice aligned with business, procedural, and commercial realities.</li>
  </ul>

  <h3>When to engage us</h3>
  <p>Early legal involvement helps reduce drafting errors, negotiation delays, and avoidable disputes. We help clients evaluate options and move with clarity.</p>
`;

export const EXPERTISE_CATALOG: ExpertiseCatalogCategory[] = PRACTICE_AREAS_SOURCE.map(
  (category) => {
    const categorySlug = slugify(category.category);
    const detailedItems = getExpertiseItemsByCategory(category.category);

    return {
      category: category.category,
      categorySlug,
      description: category.description,
      route: `/expertise/${categorySlug}`,
      items: category.items.map((rawItem) => {
        const title = getTitleFromLabeledText(rawItem);
        const itemSlug = slugify(title);
        const detailedItem = detailedItems.find(
          (item) => item.id === itemSlug || slugify(item.title) === itemSlug
        );
        const summary = detailedItem?.shortDescription || getDescriptionFromLabeledText(rawItem);

        return {
          title,
          summary,
          categoryTitle: category.category,
          categorySlug,
          itemSlug,
          legacyId: detailedItem?.id,
          route: `/expertise/${categorySlug}/${itemSlug}`,
          fullContent:
            detailedItem?.fullContent || buildFallbackContent(title, category.category, summary),
        };
      }),
    };
  }
);

export const getExpertiseCategoryById = (value: string) => {
  return EXPERTISE_CATALOG.find((category) =>
    matchesSlugOrTitle(value, category.categorySlug, category.category)
  );
};

export const getExpertiseItemById = (categoryValue: string, itemValue: string) => {
  const category = getExpertiseCategoryById(categoryValue);

  if (!category) {
    return undefined;
  }

  return category.items.find((item) =>
    matchesSlugOrTitle(itemValue, item.itemSlug, item.title, item.legacyId)
  );
};

export const getExpertiseItemByLegacyId = (itemValue: string) => {
  for (const category of EXPERTISE_CATALOG) {
    const matchedItem = category.items.find((item) =>
      matchesSlugOrTitle(itemValue, item.itemSlug, item.title, item.legacyId)
    );

    if (matchedItem) {
      return matchedItem;
    }
  }

  return undefined;
};
