import { BRAND_NAME } from '../config/brand';
import { selfHostedUnsplashImage } from '../utils/assets';

export type ProBonoImpactIconKey = 'scale' | 'users' | 'globe' | 'heart';

export interface ProBonoStat {
  value: string;
  label: string;
}

export interface ProBonoImpactArea {
  iconKey: ProBonoImpactIconKey;
  title: string;
  description: string;
  stats: string;
}

export interface ProBonoCaseStudy {
  id: number;
  title: string;
  description: string;
  impact: string;
  image: string;
}

export const PRO_BONO_PAGE_CONTENT = {
  eyebrow: 'GIVING BACK',
  title: 'Pro Bono\nCommitment',
  intro: `At ${BRAND_NAME}, we believe access to justice matters. Our pro bono coordination program supports qualified independent professionals and nonprofit partners serving people with limited resources.`,
  impactTitle: 'Our Impact Areas',
  storiesTitle: 'Recent Success Stories',
  recognitionTitle: 'Recognized Excellence',
  recognitionDescription:
    'Our pro bono program has been recognized by leading legal organizations for our commitment to social justice and community service.',
  partnershipTitle: 'Partner with Us',
  partnershipDescription:
    "If you represent a nonprofit organization or community group that could benefit from coordination and support, we'd like to hear from you.",
} as const;

export const PRO_BONO_STATS: ProBonoStat[] = [
  {
    value: '15,000+',
    label: 'Pro Bono Hours',
  },
  {
    value: '500+',
    label: 'Cases Handled',
  },
  {
    value: '100+',
    label: 'Nonprofit Partners',
  },
  {
    value: '40+',
    label: 'Countries Served',
  },
];

export const PRO_BONO_IMPACT_AREAS: ProBonoImpactArea[] = [
  {
    iconKey: 'scale',
    title: 'Access to Justice',
    description:
      'Coordinating access-to-justice support with qualified independent professionals and community partners.',
    stats: '500+ cases annually',
  },
  {
    iconKey: 'users',
    title: 'Human Rights',
    description:
      'Defending fundamental rights and supporting organizations fighting discrimination.',
    stats: '50+ organizations supported',
  },
  {
    iconKey: 'globe',
    title: 'Environmental Protection',
    description: 'Advocating for sustainable practices and environmental conservation initiatives.',
    stats: '30+ environmental projects',
  },
  {
    iconKey: 'heart',
    title: 'Social Justice',
    description:
      'Supporting nonprofits working on education, healthcare, and community development.',
    stats: '100+ nonprofit partners',
  },
];

export const PRO_BONO_CASE_STUDIES: ProBonoCaseStudy[] = [
  {
    id: 1,
    title: 'Refugee Rights Advocacy',
    description:
      'Successfully represented asylum seekers in complex immigration proceedings, securing protection for vulnerable families.',
    impact: '150+ families protected',
    image: selfHostedUnsplashImage('photo-1469571486292-0ba58a3f068b'),
  },
  {
    id: 2,
    title: 'Environmental Justice Campaign',
    description:
      'Partnered with community groups to challenge harmful industrial practices affecting underserved neighborhoods.',
    impact: 'Protected 10,000+ residents',
    image: selfHostedUnsplashImage('photo-1473341304170-971dccb5ac1e'),
  },
  {
    id: 3,
    title: 'Small Business Legal Clinic',
    description:
      'Coordinated clinic support for entrepreneurs from disadvantaged communities working with qualified independent professionals.',
    impact: '200+ businesses supported',
    image: selfHostedUnsplashImage('photo-1556761175-b413da4baf72'),
  },
];

export const PRO_BONO_RECOGNITION_AWARDS = [
  'Pro Bono Institute Leadership Award',
  'Corporate Social Responsibility Excellence',
  'Access to Justice Recognition',
] as const;
