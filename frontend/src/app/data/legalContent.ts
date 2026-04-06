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
  intro: `${BRAND_NAME} currently operates as a public brochure site with a temporary Google Form for intake. This policy explains what data the current site handles, what is processed by third parties, and how the future portal will change those boundaries.`,
  sections: [
    {
      heading: 'What this site collects today',
      paragraphs: [
        'The current codebase does not include advertising pixels, analytics SDKs, or user account tracking. Browsing the public pages does, however, result in standard hosting and reverse-proxy request logs when the site is deployed.',
        'Those technical logs may include IP address, user agent, referrer, requested path, response status, and approximate request time for operational security, abuse prevention, and troubleshooting.',
      ],
    },
    {
      heading: 'Temporary intake via Google Forms',
      paragraphs: [
        'During the first release phase, client intake is routed to a Google Form instead of an internal dashboard. When you leave this site and submit that form, your responses are processed by Google under Google’s own terms and privacy controls.',
        'Do not submit privileged documents, government IDs, payment card data, health records, passwords, or other highly sensitive information through the temporary form. A secured document workflow will be introduced later with the Express-backed portal.',
      ],
    },
    {
      heading: 'How contact data is used',
      paragraphs: [
        'If you voluntarily contact the firm or submit the temporary intake form, the submitted details may be used to respond to your request, assess whether a follow-up conversation is appropriate, and coordinate next steps with the relevant practice team.',
        'Submitting an enquiry does not, by itself, create an attorney-client relationship.',
      ],
    },
    {
      heading: 'Cookies and local storage',
      paragraphs: [
        'The current public site does not intentionally set marketing or profiling cookies in the shipped front-end code. Essential hosting or third-party services may still use their own technical cookies when you interact with them after leaving the site.',
        'If a future authenticated portal introduces login sessions, preference storage, or anti-spam controls, this policy and the cookie notice will be updated before launch.',
      ],
    },
    {
      heading: 'Security and retention',
      paragraphs: [
        'Reasonable administrative and technical safeguards should be applied at the hosting, proxy, and application layers. For the current temporary intake phase, sensitive workflows should stay off the Google Form and be handled offline or through a secured channel.',
        'Operational logs and enquiry records should only be retained for as long as they are needed for security, compliance, or legitimate business follow-up.',
      ],
    },
    {
      heading: 'Contact and requests',
      paragraphs: [
        `For privacy or data-handling questions, contact ${CONTACT_EMAIL} or ${SECURITY_EMAIL}.`,
        'Any region-specific rights handling, retention schedules, or future portal account controls should be documented once the Express and MySQL stack is introduced.',
      ],
    },
  ],
  footerNote:
    'This document reflects the current brochure-site and temporary Google Form phase. It should be reviewed again before the authenticated portal goes live.',
};

export const COOKIE_POLICY_DOCUMENT: LegalDocument = {
  eyebrow: 'Cookies',
  title: 'Cookie Notice',
  lastUpdated: 'March 31, 2026',
  intro: `${BRAND_NAME} currently uses a minimal public front end. This notice explains the current cookie footprint and the expected changes once the future client portal is introduced.`,
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
        'If you follow a link to Google Forms or other third-party platforms, those services may set their own cookies and process information independently.',
        'Those cookies are governed by the third party, not by this site.',
      ],
    },
    {
      heading: 'Future portal changes',
      paragraphs: [
        'A future Express-backed client portal may require essential cookies or token-based session storage for login state, multi-factor verification, CSRF defense, and abuse prevention.',
        'If that happens, the site should publish a revised cookie notice before those features are enabled in production.',
      ],
      bullets: [
        'Security cookies should be marked HttpOnly, Secure, and SameSite as tightly as possible.',
        'Session lifetimes should be short and rotated after sign-in or privilege changes.',
        'Tracking or marketing cookies should remain opt-in only, if they are introduced at all.',
      ],
    },
  ],
  footerNote:
    'This notice is intentionally conservative because the authenticated portal and any optional analytics stack have not launched yet.',
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
      heading: 'Temporary intake warning',
      paragraphs: [
        'The current intake route uses a temporary Google Form in place of a secured dashboard. That form should not be used for highly confidential, privileged, export-controlled, regulated, or otherwise sensitive documents.',
        'If a matter requires confidential handling, request a secure channel before sending substantive materials.',
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
    keywords: ['privacy', 'policy', 'data protection', 'google form', 'security'],
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
