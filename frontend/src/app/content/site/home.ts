import { BRAND_NAME } from '../../config/brand';
import { selfHostedUnsplashImage } from '../../utils/assets';

// Edit public homepage and reusable brochure-section copy here.

export const HOME_SEO_CONTENT = {
  description:
    'Global LMG delivers cross-border legal coordination, lawyer-matching support, and practical business insights for modern clients operating across jurisdictions.',
  image: selfHostedUnsplashImage('photo-1758448656987-cfae6bf225e4'),
  title: 'Global LMG',
} as const;

export const HOME_HERO_CONTENT = {
  alt: `${BRAND_NAME} office building`,
  authenticatedCtaLabel: 'Open dashboard',
  body: `${BRAND_NAME} delivers cross-border legal coordination, lawyer-matching support, and practical insights for modern clients operating across jurisdictions.`,
  guestCtaLabel: 'Read more',
  image: HOME_SEO_CONTENT.image,
  titleLines: ['Empowering your', 'global legal strategy.'],
} as const;

export const HOME_INTRO_CONTENT = {
  bodyLines: [
    'Our collaborative framework integrates jurisdictional context with',
    'forward-thinking operational infrastructure to support seamless coordination.',
    'We bridge the gap between traditional legal workflows and future markets.',
  ],
  ctaLabel: 'READ MORE',
  eyebrowLines: ['Pioneering the next era of', 'Global Legal Coordination'],
  titleLines: [
    'Redefining standard practices through',
    'digital innovation and specialized',
    "intelligence to solve the world's most",
    'complex coordination challenges today.',
  ],
} as const;

export const HOME_CAROUSEL_CONTENT = {
  body:
    'From high-stakes litigation coordination to complex corporate support, our multi-disciplinary approach keeps service delivery structured and practical.',
  ctaLabel: 'LEARN MORE',
  defaultServiceSummary:
    'Specialized coordination, lawyer-matching support, and operational guidance for clients operating across global markets.',
  eyebrow: 'OUR CAPABILITIES',
  titleLines: ['Tailored Coordination', 'Support'],
} as const;

export const HOME_SPOTLIGHT_CONTENT = {
  ctaLabel: 'VIEW ALL NEWS AND INSIGHTS',
  titleLines: ['Spotlight on our news and', 'insights'],
} as const;

export const HOME_INSIGHTS_CONTENT = {
  headerLinkText: 'View all insights',
  headerTitle: 'Insights',
  cards: [
    {
      category: 'Market Report',
      date: 'Feb 10, 2026',
      image: selfHostedUnsplashImage('photo-1739502759976-1849f579549d'),
      title: 'Global M&A Trends: A Shift Towards Energy Transition',
    },
    {
      category: 'Analysis',
      date: 'Feb 08, 2026',
      image: selfHostedUnsplashImage('photo-1718873030311-665e717830f3'),
      title: 'The Future of Digital Assets in European Markets',
    },
    {
      category: 'Briefing',
      date: 'Feb 05, 2026',
      image: selfHostedUnsplashImage('photo-1620712943543-bcc4628c7215'),
      title: 'Cross-border Regulatory Compliance in the AI Era',
    },
  ],
} as const;

export const HOME_EXPERTISE_CONTENT = {
  body:
    'We offer coordinated legal support across major markets and sectors, helping clients navigate critical decisions with the right independent professionals.',
  globalReach: {
    body:
      'With coverage across more than 40 countries, we help clients coordinate cross-border support where they need it. Our network supports practical workflows across complex legal and business matters.',
    ctaLabel: 'Explore our offices',
    image: selfHostedUnsplashImage('photo-1721598418579-6a3f001c4021'),
    imageAlt: 'Global skyline',
    title: 'Global perspective, local depth.',
  },
  practices: [
    { iconKey: 'scale', name: 'Antitrust & Competition' },
    { iconKey: 'landmark', name: 'Banking & Finance' },
    { iconKey: 'bar-chart', name: 'Capital Markets' },
    { iconKey: 'building', name: 'Corporate / M&A' },
    { iconKey: 'shield', name: 'Dispute Resolution' },
    { iconKey: 'globe', name: 'Tax' },
  ],
  practiceHoverPrefix: 'Learn more about our',
  title: 'Legal Expertise',
} as const;

export const HOME_DETAILED_EXPERTISE_CONTENT = {
  brochureIdleLabel: 'DOWNLOAD FIRM BROCHURE',
  brochureLoadingLabel: 'PREPARING BROCHURE...',
  ctaLabel: 'CONSULT A SPECIALIST',
  eyebrow: 'PRACTICE AREAS',
  resourceHeading: 'Practice Resources',
  summary:
    'Strategic coordination across major industries, helping clients navigate the complexities of modern global markets.',
  titleLines: ['World-class', 'Legal Expertise'],
} as const;
