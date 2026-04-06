import { BRAND_NAME } from '../config/brand';
import { selfHostedUnsplashImage } from '../utils/assets';

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
  eyebrow: 'OUR FIRM',
  title: 'Excellence as our standard.',
  intro: `${BRAND_NAME} is a modern legal advisory platform focused on helping founders, operators, and business teams navigate complex legal decisions with clarity.`,
  image: selfHostedUnsplashImage('photo-1497366216548-37526070297c'),
  imageAlt: 'Global LMG office workspace',
  sectionTitle: 'A New Era of Legal Partnership',
  sectionBody:
    'Founded on the principles of integrity and innovation, we have built a network that spans across 40+ countries. Our multidisciplinary team combines deep local knowledge with a seamless global perspective.',
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
    desc: 'Precision and quality in every legal brief.',
  },
];
