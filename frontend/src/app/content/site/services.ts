// Edit public service catalog copy here. Admin request-pricing settings are separate and DB-backed.

export interface ServiceEntry {
  id: string;
  title: string;
  summary: string;
}

export const buildServicePath = (title: string) => `/services/${encodeURIComponent(title)}`;

export const SERVICE_CATALOG: ServiceEntry[] = [
  {
    id: 'get-me-a-counsel',
    title: 'Get me a Counsel',
    summary:
      'Coordination support for connecting clients with independently engaged counsel for hearings, disputes, and specialized legal workflows',
  },
  {
    id: 'document-review-and-compliance-check',
    title: 'Document review and compliance check',
    summary:
      'Comprehensive review of legal documents, contracts, and compliance verification to ensure regulatory adherence',
  },
  {
    id: 'legal-drafting',
    title: 'Legal Drafting',
    summary:
      'Professional drafting of contracts, agreements, notices, legal letters, and all documentation with precision and legal soundness',
  },
  {
    id: 'case-merit-assessment-and-case-strategy',
    title: 'Case Merit assessment and Case strategy',
    summary:
      "Detailed analysis of your case's strengths, weaknesses, winning probability, and strategic legal roadmap",
  },
  {
    id: 'litigation-monitoring-shadow-counsel',
    title: 'Litigation Monitoring - Shadow Counsel',
    summary:
      'Attend proceedings with your arguing counsel to ensure full understanding and provide strategic guidance throughout the case',
  },
  {
    id: 'liaison-and-field-support',
    title: 'Liaison and Field support',
    summary:
      'Registry work, filing, police station visits, settlement negotiations, and on-ground legal facilitation',
  },
  {
    id: 'court-technology-and-digital-support',
    title: 'Court technology and digital support',
    summary:
      'Advanced courtroom technology solutions, digital case management, and tech-enabled legal support services',
  },
];

export const SERVICE_DETAIL_CONTENT = {
  backLabel: 'Back to Home',
  capabilities: [
    {
      body: 'In-depth assessment of the legal landscape to identify risks and opportunities before they emerge.',
      title: 'Strategic Analysis',
    },
    {
      body: 'In-depth assessment of the legal landscape to identify risks and opportunities before they emerge.',
      title: 'Strategic Analysis',
    },
    {
      body: 'In-depth assessment of the legal landscape to identify risks and opportunities before they emerge.',
      title: 'Strategic Analysis',
    },
  ],
  capabilitiesTitle: 'Key Capabilities',
  defaultDescription:
    'Providing structured legal coordination and support tailored to your specific requirements. Our team keeps each matter organized with precision and practical clarity.',
  eyebrow: 'OUR SERVICES',
  highlights: [
    {
      body: 'Full adherence to applicable standards, workflows, and regulatory coordination requirements.',
      title: 'Compliance',
    },
    {
      body: 'Optimized workflows to support high-stakes outcomes within tight timelines.',
      title: 'Efficiency',
    },
  ],
  notFoundBackLabel: 'Back to Home',
  notFoundDescription: 'The requested service route could not be matched to a valid service entry.',
  notFoundTitle: 'Service not found',
  quotePrefix: 'Our approach to',
  quoteSuffix: 'is built on coordinated operational knowledge and practical technology-enabled workflows.',
} as const;

export const getServiceByRouteId = (routeId: string) => {
  const decodedRouteId = decodeURIComponent(routeId).trim();

  return SERVICE_CATALOG.find(
    (service) => service.title === decodedRouteId || service.id === decodedRouteId
  );
};
