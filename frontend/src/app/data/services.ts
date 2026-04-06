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
      'Expert legal representation for arguments, high-stakes litigation, and specialized counsel for your specific legal needs',
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

export const getServiceByRouteId = (routeId: string) => {
  const decodedRouteId = decodeURIComponent(routeId).trim();

  return SERVICE_CATALOG.find(
    (service) => service.title === decodedRouteId || service.id === decodedRouteId
  );
};
