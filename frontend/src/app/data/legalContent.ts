import { BRAND_NAME, CONTACT_EMAIL, SECURITY_EMAIL } from '../config/brand';

export interface LegalDocumentSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocument {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalDocumentSection[];
  footerNote?: string;
}

export const PRIVACY_POLICY_DOCUMENT: LegalDocument = {
  eyebrow: 'Privacy',
  title: 'Privacy Policy',
  lastUpdated: 'March 31, 2026',
  intro: `${BRAND_NAME} operates a public site and authenticated client portal for intake, coordination, documents, billing, messages, and related support workflows. This policy explains what data the current site and portal handle, and where third-party services may process information independently.`,
  sections: [
    {
      heading: 'What this site collects today',
      paragraphs: [
        'The current codebase does not include advertising pixels, analytics SDKs, or user account tracking. Browsing the public pages does, however, result in standard hosting and reverse-proxy request logs when the site is deployed.',
        'Those technical logs may include IP address, user agent, referrer, requested path, response status, and approximate request time for operational security, abuse prevention, and troubleshooting.',
      ],
    },
    {
      heading: 'Client intake and portal workflows',
      paragraphs: [
        'Client intake and follow-up workflows may be handled through the authenticated portal or, when separately configured, an external intake form. External forms are processed by their provider under that provider’s own terms and privacy controls.',
        'Use the authenticated portal for sensitive document and account workflows. Do not send payment card data, passwords, or unnecessary highly sensitive information through public forms or unsecured channels.',
      ],
    },
    {
      heading: 'How contact data is used',
      paragraphs: [
        'If you voluntarily contact Global LMG or submit an intake request, the submitted details may be used to respond to your request, assess whether a follow-up conversation is appropriate, and coordinate next steps with relevant internal teams or independently engaged professionals.',
        'Submitting an enquiry does not, by itself, create an attorney-client relationship.',
      ],
    },
    {
      heading: 'Cookies and local storage',
      paragraphs: [
        'The public site does not intentionally set marketing or profiling cookies in the shipped front-end code. Essential hosting or third-party services may still use their own technical cookies when you interact with them after leaving the site.',
        'The authenticated portal uses essential session and CSRF cookies for login state, security, and abuse prevention.',
      ],
    },
    {
      heading: 'Security and retention',
      paragraphs: [
        'Reasonable administrative and technical safeguards should be applied at the hosting, proxy, and application layers. Sensitive workflows should use authenticated portal routes or another approved secure channel.',
        'Operational logs and enquiry records should only be retained for as long as they are needed for security, compliance, or legitimate business follow-up.',
      ],
    },
    {
      heading: 'Contact and requests',
      paragraphs: [
        `For privacy or data-handling questions, contact ${CONTACT_EMAIL} or ${SECURITY_EMAIL}.`,
        'Region-specific rights handling, retention schedules, and portal account controls should be reviewed before each production release.',
      ],
    },
  ],
  footerNote:
    'This document reflects the current public-site and authenticated portal beta. It should be reviewed again before production launch.',
};

export const COOKIE_POLICY_DOCUMENT: LegalDocument = {
  eyebrow: 'Cookies',
  title: 'Cookie Notice',
  lastUpdated: 'March 31, 2026',
  intro: `${BRAND_NAME} uses a public front end and authenticated portal. This notice explains the current cookie footprint for public pages, portal sessions, and security controls.`,
  sections: [
    {
      heading: 'Current public-site behavior',
      paragraphs: [
        'The present front-end build does not intentionally ship analytics cookies, ad-tech tags, or personalization beacons.',
        'Your hosting environment, browser, CDN, or third-party destinations may still use technical cookies outside the front-end bundle.',
      ],
    },
    {
      heading: 'Third-party services',
      paragraphs: [
        'If you follow a link to an external form, calendar provider, meeting provider, or other third-party platform, those services may set their own cookies and process information independently.',
        'Those cookies are governed by the third party, not by this site.',
      ],
    },
    {
      heading: 'Portal session cookies',
      paragraphs: [
        'The authenticated portal requires essential cookies for login state, verification flows, CSRF defense, and abuse prevention.',
        'Any optional analytics, marketing, or profiling cookies should remain disabled unless separately reviewed and disclosed.',
      ],
      bullets: [
        'Security cookies should be marked HttpOnly, Secure, and SameSite as tightly as possible.',
        'Session lifetimes should be short and rotated after sign-in or privilege changes.',
        'Tracking or marketing cookies should remain opt-in only, if they are introduced at all.',
      ],
    },
  ],
  footerNote:
    'This notice is intentionally conservative because optional analytics and marketing cookies are not required for the beta portal.',
};

export const LEGAL_DISCLAIMER_DOCUMENT: LegalDocument = {
  eyebrow: 'Disclaimer',
  title: 'Legal Disclaimer',
  lastUpdated: 'March 31, 2026',
  intro: `${BRAND_NAME} publishes this site for general informational and business-development purposes. Please read the following limits before relying on any site content or submitting an enquiry.`,
  sections: [
    {
      heading: 'No legal advice',
      paragraphs: [
        'Content on this site is provided for general information only and should not be treated as legal advice for any specific matter, jurisdiction, or transaction.',
        'You should seek advice from qualified counsel before acting or refraining from action based on site content.',
      ],
    },
    {
      heading: 'No attorney-client relationship',
      paragraphs: [
        'Browsing the site, reading its materials, or sending a preliminary enquiry does not create an attorney-client relationship.',
        'An engagement only exists after the appropriate conflicts, onboarding, and formal engagement steps have been completed.',
      ],
    },
    {
      heading: 'Secure intake and document handling',
      paragraphs: [
        'Use authenticated portal workflows or another approved secure channel for documents and substantive matter materials.',
        'Public forms and public email should not be used for highly confidential, export-controlled, regulated, or otherwise sensitive documents.',
      ],
    },
    {
      heading: 'Jurisdiction and availability',
      paragraphs: [
        'Descriptions of experience, sectors, or coverage are informational and do not guarantee that any service is available in every location or that a specific lawyer is admitted in your jurisdiction.',
        'Any future portal functionality must enforce country, office, and matter-level access controls on the server side rather than relying on front-end visibility alone.',
      ],
    },
    {
      heading: 'Accuracy and updates',
      paragraphs: [
        'The site is maintained in good faith, but content may become outdated, incomplete, or superseded by law, regulation, market conditions, or internal business changes.',
        'This public front end should be reviewed whenever major practice content, intake flows, or portal architecture change.',
      ],
    },
  ],
  footerNote: `For clarification, contact ${CONTACT_EMAIL}. For security concerns, contact ${SECURITY_EMAIL}.`,
};

export const LEGAL_SEARCH_ENTRIES = [
  {
    id: 'legal:privacy',
    label: 'Privacy Policy',
    type: 'Legal' as const,
    route: '/privacy',
    subtitle: 'Legal',
    keywords: ['privacy', 'policy', 'data protection', 'portal', 'security'],
  },
  {
    id: 'legal:cookies',
    label: 'Cookie Notice',
    type: 'Legal' as const,
    route: '/cookies',
    subtitle: 'Legal',
    keywords: ['cookies', 'tracking', 'sessions', 'privacy'],
  },
  {
    id: 'legal:disclaimer',
    label: 'Legal Disclaimer',
    type: 'Legal' as const,
    route: '/legal-disclaimer',
    subtitle: 'Legal',
    keywords: ['disclaimer', 'no legal advice', 'attorney client relationship', 'confidentiality'],
  },
];
