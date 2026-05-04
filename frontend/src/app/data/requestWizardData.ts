export type UrgencyLevel = 'standard' | 'within-6hrs' | 'within-2hrs';
export type ConsultationMode = 'video' | 'phone' | 'in-person';

export interface RequestData {
  fullName: string;
  email: string;
  mobile: string;
  whatsappNumber: string;
  whatsappSame: boolean;
  services: string[];
  legalDomain: string;
  caseDetails: string;
  documents: File[];
  consultationMode: ConsultationMode;
  preferredDate: string;
  preferredTime: string;
  urgency: UrgencyLevel;
  pastLegalAction: boolean;
}

export interface RequestWizardService {
  id: string;
  name: string;
  description: string;
  icon: string;
  baseFee: number;
}

export interface LegalDomainOption {
  id: string;
  name: string;
  description: string;
}

export const REQUEST_WIZARD_SERVICES: RequestWizardService[] = [
  {
    id: 'get-counsel',
    name: 'Get Me a Counsel',
    description: 'Representation & Arguments',
    icon: 'Users',
    baseFee: 1000,
  },
  {
    id: 'document-review',
    name: 'Document Review and Compliance Check',
    description: 'Audit & Verification',
    icon: 'FileCheck',
    baseFee: 1000,
  },
  {
    id: 'legal-drafting',
    name: 'Legal Drafting',
    description: 'Contracts, Notices, Applications',
    icon: 'FileText',
    baseFee: 1000,
  },
  {
    id: 'case-assessment',
    name: 'Case Assessment and Strategy',
    description: 'Merit Analysis & Planning',
    icon: 'Target',
    baseFee: 1000,
  },
  {
    id: 'litigation-monitoring',
    name: 'Litigation Monitoring',
    description: 'Shadow Counsel & Case Tracking',
    icon: 'Eye',
    baseFee: 1000,
  },
  {
    id: 'liaison-support',
    name: 'Liaison and Field Support',
    description: 'Registry, Filing, Police Station',
    icon: 'Briefcase',
    baseFee: 1000,
  },
  {
    id: 'court-technology',
    name: 'Court Technology and Digital Support',
    description: 'Live Hearings, E-courts',
    icon: 'Monitor',
    baseFee: 1000,
  },
];

export const LEGAL_DOMAINS: LegalDomainOption[] = [
  { id: 'civil', name: 'Civil Law', description: 'Property, Contracts, Torts' },
  { id: 'criminal', name: 'Criminal Law', description: 'Defense, Prosecution' },
  { id: 'corporate', name: 'Corporate Law', description: 'Business, Compliance' },
  { id: 'family', name: 'Family Law', description: 'Divorce, Custody, Inheritance' },
  { id: 'property', name: 'Property Law', description: 'Real Estate, RERA' },
  { id: 'labor', name: 'Labor & Employment', description: 'Workplace, Labor Rights' },
  { id: 'tax', name: 'Tax Law', description: 'Income Tax, GST' },
  {
    id: 'intellectual-property',
    name: 'Intellectual Property',
    description: 'Patents, Trademarks',
  },
  { id: 'consumer', name: 'Consumer Law', description: 'Consumer Rights, Protection' },
  { id: 'other', name: 'Other', description: 'Other legal matters' },
];

export const TIME_SLOTS = [
  '09:00 AM - 09:45 AM',
  '10:00 AM - 10:45 AM',
  '11:00 AM - 11:45 AM',
  '12:00 PM - 12:45 PM',
  '02:00 PM - 02:45 PM',
  '03:00 PM - 03:45 PM',
  '04:00 PM - 04:45 PM',
  '05:00 PM - 05:45 PM',
];

const PRICING_TIERS = [
  { count: 1, fee: 1000 },
  { count: 2, fee: 1500 },
  { count: 3, fee: 2000 },
  { count: 4, fee: 2400 },
  { count: 5, fee: 2700 },
  { count: 6, fee: 2900 },
  { count: 7, fee: 3000 },
];

export const calculateFee = (serviceCount: number): number => {
  const tier = PRICING_TIERS.find((entry) => entry.count === serviceCount);
  return tier ? tier.fee : 0;
};
