import { BRAND_NAME, CONTACT_EMAIL, SECURITY_EMAIL } from '../../config/brand';

// Edit public legal-policy copy here. Keep no-law-firm/no-direct-legal-advice language intact.

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
        'Where configured, the platform may use an approximate country signal from request infrastructure, such as a reverse-proxy country header, only to prefill or fallback pricing currency when no billing address is available. The platform stores the country/source used for pricing, not precise IP geolocation details.',
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

export const TERMS_OF_SERVICE_DOCUMENT: LegalDocument = {
  eyebrow: 'Terms',
  title: 'Terms of Service',
  lastUpdated: 'May 7, 2026',
  intro: `${BRAND_NAME} provides an intermediary platform for legal workflow coordination, lawyer-matching support, document exchange, billing, communications, and related client support. These terms require final CA/legal approval before public launch.`,
  sections: [
    {
      heading: 'Review status',
      paragraphs: [
        'These Terms of Service must be reviewed and approved by qualified legal counsel before being treated as final production terms.',
        'If any wording conflicts with an executed engagement letter, platform order, invoice, or written agreement approved by Global LMG, the approved written agreement should control to the extent stated in that agreement.',
      ],
    },
    {
      heading: 'Intermediary platform role',
      paragraphs: [
        `${BRAND_NAME} is an intermediary legal consultancy, lawyer-matching, coordination, and support platform. ${BRAND_NAME} is not a law firm and does not itself provide direct legal advice, legal representation, or advocacy services.`,
        'Where independent lawyers, counsel, field partners, or other professionals are introduced or coordinated through the platform, their professional services are provided by those independent professionals under their own professional duties, engagement terms, and applicable regulations.',
      ],
    },
    {
      heading: 'Use of the platform',
      paragraphs: [
        'The public site and client portal may be used for enquiries, intake, coordination, document exchange, scheduling, reminders, billing, payment records, and operational support.',
        'Users must provide accurate account, contact, billing, request, and matter information, and must not upload unlawful, malicious, misleading, or unauthorized content.',
      ],
    },
    {
      heading: 'No direct legal advice from Global LMG',
      paragraphs: [
        'Public-site content, portal workflows, dashboards, automated summaries, invoice descriptions, and platform notifications are provided for coordination and operational support only.',
        'Clients should rely on advice from qualified independent counsel for legal decisions, jurisdiction-specific questions, strategy, filings, pleadings, appearances, and similar legal work.',
      ],
    },
    {
      heading: 'Accounts and security',
      paragraphs: [
        'Users are responsible for maintaining the confidentiality of their account credentials and for promptly notifying Global LMG of suspected unauthorized access.',
        'Global LMG may apply security controls such as session cookies, CSRF protection, malware scanning, rate limits, audit logs, and access reviews to protect platform users and records.',
      ],
    },
    {
      heading: 'Fees, invoices, and third-party costs',
      paragraphs: [
        'Platform fees, coordination fees, consultation mode fees, urgency fees, taxes, and any third-party or out-of-pocket costs should be reviewed on the applicable quote, invoice, or written confirmation before payment.',
        'Travel, transportation, filing, government, professional, payment-gateway, and other third-party costs may be separate from Global LMG platform fees unless expressly stated otherwise.',
      ],
    },
    {
      heading: 'Documents and communications',
      paragraphs: [
        'Users should upload documents only through authenticated portal workflows or another approved secure channel. Public forms and ordinary email should not be used for highly sensitive materials unless separately approved.',
        'Global LMG may keep operational records, audit events, security events, messages, document metadata, invoices, and logs as needed for platform operation, compliance, dispute handling, and security review.',
      ],
    },
    {
      heading: 'Changes, suspension, and availability',
      paragraphs: [
        'Platform features, availability, pricing configuration, provider integrations, and document-processing workflows may change as the product evolves.',
        'Global LMG may restrict or suspend access where needed for security, misuse prevention, non-payment, compliance review, or operational integrity, subject to legal review of final policy wording.',
      ],
    },
  ],
  footerNote:
    'CA/legal review required: approve final Terms of Service, acceptance flow, governing law, dispute resolution, limitation-of-liability, payment, cancellation, refund, data-retention, and third-party professional-services wording before public launch.',
};

export const REFUND_CANCELLATION_POLICY_DOCUMENT: LegalDocument = {
  eyebrow: 'Refunds',
  title: 'Refund and Cancellation Policy',
  lastUpdated: 'May 7, 2026',
  intro: `${BRAND_NAME} uses this policy to explain refund, cancellation, and rescheduling expectations. Final legal and tax approval is required before public launch.`,
  sections: [
    {
      heading: 'Review status',
      paragraphs: [
        'Final refund eligibility, timelines, tax treatment, and payment-gateway handling must be approved by CA/legal reviewers before launch.',
        'Any approved engagement letter, invoice terms, written order, or legally required refund right may override this policy where applicable.',
      ],
    },
    {
      heading: 'Platform and coordination fees',
      paragraphs: [
        'Refund eligibility for platform fees, coordination fees, consultation mode fees, urgency fees, and support fees should be assessed based on the status of work, scheduling commitments, third-party costs, and applicable law.',
        'If a request has already involved scheduling, coordination, document review, professional matching, field activity, or other work, a full refund may not be available unless required by law or approved by Global LMG under final policy rules.',
      ],
    },
    {
      heading: 'Independent professional and third-party costs',
      paragraphs: [
        'Fees, retainers, disbursements, government charges, filing fees, travel costs, payment-gateway fees, and independent professional charges may be governed by separate terms and may be non-refundable once incurred.',
        'Transportation and travel costs for in-person coordination or field support are expected to be extra and borne by the client unless a final approved policy states otherwise.',
      ],
    },
    {
      heading: 'Cancellations and rescheduling',
      paragraphs: [
        'Clients should request cancellation or rescheduling as early as possible through the client portal or another approved support channel.',
        'Cancellation windows, rescheduling limits, no-show treatment, urgent-request treatment, and in-person-support treatment require final legal and operational approval.',
      ],
    },
    {
      heading: 'Taxes and invoice adjustments',
      paragraphs: [
        'Refunds may require invoice adjustments, credit notes, tax reversals, or other accounting treatment depending on the invoice status, payment status, GST/tax rules, and applicable law.',
        'CA review is required for GST, SAC, reverse-charge, exempt, and cross-border refund handling before production use.',
      ],
    },
    {
      heading: 'How to request a refund or cancellation',
      paragraphs: [
        `Clients may contact ${CONTACT_EMAIL} or use the authenticated portal where available. Requests should include the invoice number, matter or request reference, scheduled event details if applicable, and a brief explanation.`,
        'Global LMG should record refund decisions, cancellation decisions, and payment changes in the billing ledger and audit history.',
      ],
    },
  ],
  footerNote:
    'CA/legal review required: approve final refund eligibility, cancellation windows, urgent-request treatment, travel-cost treatment, tax/credit-note workflow, and payment-gateway fee wording before public launch.',
};

export const LEGAL_DISCLAIMER_DOCUMENT: LegalDocument = {
  eyebrow: 'Disclaimer',
  title: 'Legal Disclaimer',
  lastUpdated: 'March 31, 2026',
  intro: `${BRAND_NAME} publishes this site for general informational and business-development purposes. Please read the following limits before relying on any site content or submitting an enquiry.`,
  sections: [
    {
      heading: 'Global LMG role',
      paragraphs: [
        `${BRAND_NAME} is an intermediary legal consultancy, lawyer-matching, coordination, and support platform. ${BRAND_NAME} is not a law firm and does not provide direct legal advice, legal representation, or advocacy services.`,
        'Independent lawyers, counsel, field partners, or other professionals may provide their own professional services under their own duties, engagement terms, and applicable regulations.',
      ],
    },
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
    id: 'legal:terms',
    label: 'Terms of Service',
    type: 'Legal' as const,
    route: '/terms',
    subtitle: 'Legal',
    keywords: ['terms', 'service', 'platform', 'account', 'legal review'],
  },
  {
    id: 'legal:refunds',
    label: 'Refund and Cancellation Policy',
    type: 'Legal' as const,
    route: '/refund-cancellation',
    subtitle: 'Legal',
    keywords: ['refund', 'cancellation', 'reschedule', 'payment', 'policy'],
  },
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
