import { BRAND_NAME, BRAND_WORDMARK, CONTACT_EMAIL, CONTACT_PHONE } from '../../config/brand';

// Edit shared public-site navigation, footer, and fallback copy here.

export const NAVIGATION_COPY = {
  account: {
    dashboard: 'Dashboard',
    notifications: 'Notifications',
    settings: 'Settings',
    signOut: 'Sign out',
    signIn: 'Sign in',
  },
  dropdowns: {
    careers: {
      heading: 'Join our team',
      viewAll: 'View All Careers',
    },
    expertise: {
      heading: 'Practice Areas',
      viewFull: 'View Full Practice Overview',
    },
    services: {
      heading: 'Our Services',
    },
  },
  links: {
    about: 'About Us',
    careers: 'Careers',
    contact: 'Contact Us',
    services: 'Services',
  },
  utility: {
    language: 'EN',
    network: 'Global Office Network',
  },
} as const;

export const FOOTER_CONTENT = {
  address: ['125 Global Financial Center', 'London, EC2V 6BT', 'United Kingdom'],
  brand: BRAND_WORDMARK,
  contact: {
    email: CONTACT_EMAIL,
    phone: CONTACT_PHONE,
    phoneHref: 'tel:+15550001234',
  },
  coverage: {
    ctaLabel: 'Request Coverage Details',
    heading: 'Global Coverage',
    kicker: 'Our Network',
    text: 'Presence in 40+ countries across 5 continents.',
  },
  legalLinks: [
    { label: 'Terms', path: '/terms' },
    { label: 'Refunds & Cancellations', path: '/refund-cancellation' },
    { label: 'Legal Disclaimer', path: '/legal-disclaimer' },
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Cookies', path: '/cookies' },
  ],
  resources: [
    { label: 'Legal Insights', path: '/insights' },
    { label: 'Market Reports', path: '/market-reports' },
    { label: 'Careers', path: '/careers' },
    { label: 'Newsroom', path: '/newsroom' },
    { label: 'Pro Bono', path: '/pro-bono' },
  ],
  resourcesHeading: 'Resources',
  socialNote: 'Official social profile links will be added after the final brand directory is approved.',
  expertiseHeading: 'Expertise',
  copyright: `© 2026 ${BRAND_WORDMARK}. ALL RIGHTS RESERVED.`,
} as const;

export const NOT_FOUND_CONTENT = {
  backToLabel: 'Back to Home',
  description: 'The page you are looking for does not exist or may have moved.',
  eyebrow: '404',
  title: 'Page not found',
} as const;

export const PUBLIC_SITE_COMPLIANCE_NOTE = `${BRAND_NAME} is an intermediary legal consultancy and lawyer-matching platform. We are not a law firm and do not provide direct legal advice.`;
