import { BRAND_NAME } from '../../config/brand';
import { selfHostedUnsplashImage } from '../../utils/assets';

// Edit public About page copy here. Components should import these objects instead of embedding text.

export type AboutFeatureIconKey = 'globe' | 'shield' | 'users' | 'award';

export interface AboutMetric {
  value: string;
  label: string;
}

export interface AboutFeature {
  iconKey: AboutFeatureIconKey;
  title: string;
  desc: string;
}

export const ABOUT_PAGE_CONTENT = {
  eyebrow: 'OUR PLATFORM',
  title: 'Excellence as our standard.',
  intro: `${BRAND_NAME} is an intermediary legal consultancy, lawyer-matching, coordination, and support platform for founders, operators, and business teams working across jurisdictions.`,
  image: selfHostedUnsplashImage('photo-1497366216548-37526070297c'),
  imageAlt: 'Global LMG office workspace',
  sectionTitle: 'A New Era of Legal Coordination',
  sectionBody:
    'Founded on the principles of integrity and innovation, we coordinate with independent professionals and partners across 40+ countries. Our multidisciplinary operating model combines local context with a seamless global perspective.',
} as const;

export const ABOUT_METRICS: AboutMetric[] = [
  {
    value: '120+',
    label: 'Partners Worldwide',
  },
  {
    value: '40+',
    label: 'Global Offices',
  },
];

export const ABOUT_FEATURES: AboutFeature[] = [
  {
    iconKey: 'globe',
    title: 'Global Presence',
    desc: 'Seamless service across all major financial centers.',
  },
  {
    iconKey: 'shield',
    title: 'Uncompromising Integrity',
    desc: 'The highest ethical standards in every matter.',
  },
  {
    iconKey: 'users',
    title: 'Collaborative Culture',
    desc: 'Unified teams working toward your success.',
  },
  {
    iconKey: 'award',
    title: 'Excellence in Execution',
    desc: 'Precision and quality in every coordination and support workflow.',
  },
];
