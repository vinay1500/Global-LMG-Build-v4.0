import { matchesSlugOrTitle, slugify } from '../utils/slug';

export interface CareerCategory {
  slug: string;
  title: string;
  description: string;
  iconKey: 'graduation-cap' | 'briefcase' | 'users';
  color: string;
  heroTitle: string;
  heroDescription: string;
}

export interface CareerOpening {
  slug: string;
  title: string;
  categorySlug: string;
  categoryTitle: string;
  location: string;
  type: string;
  postedLabel: string;
  department: string;
  description: string;
  responsibilities: string[];
  qualifications: string[];
}

export const CAREER_CATEGORIES: CareerCategory[] = [
  {
    slug: 'interns',
    title: 'Interns',
    description:
      'Start your legal journey with structured internships that build strong drafting, research, and matter-management foundations.',
    iconKey: 'graduation-cap',
    color: 'bg-blue-50 text-blue-600',
    heroTitle: 'Internship opportunities',
    heroDescription:
      'Structured entry points for students and early-career professionals who want meaningful legal exposure and close mentorship.',
  },
  {
    slug: 'advocates',
    title: 'Advocates',
    description:
      'Join experienced lawyers handling advisory, drafting, disputes, and complex cross-border client work.',
    iconKey: 'briefcase',
    color: 'bg-green-50 text-green-600',
    heroTitle: 'Experienced legal roles',
    heroDescription:
      'Opportunities for advocates and associates who can combine deep legal skill with commercial judgment and client ownership.',
  },
  {
    slug: 'other-hirings',
    title: 'Other Hirings',
    description:
      'Explore roles in legal operations, paralegal support, research, and law-adjacent business functions.',
    iconKey: 'users',
    color: 'bg-purple-50 text-purple-600',
    heroTitle: 'Operational and specialist roles',
    heroDescription:
      'Support the Global LMG team through technology, documentation, research, and workflow excellence across the platform.',
  },
];

export const CAREER_OPENINGS: CareerOpening[] = [
  {
    slug: slugify('Legal Intern Program'),
    title: 'Legal Intern Program',
    categorySlug: 'interns',
    categoryTitle: 'Interns',
    location: 'Multiple Locations',
    type: 'Internship',
    postedLabel: '2 days ago',
    department: 'Internship Program',
    description:
      'Join our comprehensive internship program and gain hands-on experience across research, drafting, matter support, and client coordination.',
    responsibilities: [
      'Assist with legal research, note preparation, and matter summaries.',
      'Support drafting reviews for notices, agreements, and internal documentation.',
      'Help case teams organize filings, chronology, and hearing preparation materials.',
      'Work closely with mentors across advisory and dispute teams.',
    ],
    qualifications: [
      'Currently pursuing a law degree.',
      'Strong academic record and written communication.',
      'Excellent research discipline and attention to detail.',
      'Comfort working in a fast-moving collaborative team.',
    ],
  },
  {
    slug: slugify('Senior Associate - Corporate M&A'),
    title: 'Senior Associate - Corporate M&A',
    categorySlug: 'advocates',
    categoryTitle: 'Advocates',
    location: 'London, UK',
    type: 'Full-time',
    postedLabel: '5 days ago',
    department: 'Corporate Advisory',
    description:
      'Lead complex cross-border M&A transactions for growth-stage and enterprise clients while working closely with founders, operators, and counterpart counsel.',
    responsibilities: [
      'Run transaction workstreams across diligence, drafting, negotiation, and closing.',
      'Coordinate internal specialists and external counsel across multiple jurisdictions.',
      'Prepare strategic risk notes for clients and internal matter teams.',
      'Mentor junior lawyers and improve drafting quality across the practice.',
    ],
    qualifications: [
      '5+ years of M&A experience.',
      'Top-tier transactional drafting and negotiation background.',
      'Qualified solicitor or equivalent practicing credential.',
      'Strong client communication and matter ownership.',
    ],
  },
  {
    slug: slugify('Banking & Finance Lawyer'),
    title: 'Banking & Finance Lawyer',
    categorySlug: 'advocates',
    categoryTitle: 'Advocates',
    location: 'New York, USA',
    type: 'Full-time',
    postedLabel: '1 week ago',
    department: 'Banking & Finance',
    description:
      'Advise on structured finance, syndicated lending, regulatory risk, and financing documentation for domestic and cross-border matters.',
    responsibilities: [
      'Draft and negotiate loan, security, and intercreditor documents.',
      'Support lender and borrower-side financing transactions.',
      'Monitor regulatory changes relevant to financing structures.',
      'Partner with clients on timing, closing readiness, and transaction execution.',
    ],
    qualifications: [
      '3+ years of banking and finance experience.',
      'US bar admission.',
      'Strong drafting, issue-spotting, and client-management skills.',
      'Comfort with time-sensitive transaction management.',
    ],
  },
  {
    slug: slugify('Dispute Resolution Partner'),
    title: 'Dispute Resolution Partner',
    categorySlug: 'advocates',
    categoryTitle: 'Advocates',
    location: 'Singapore',
    type: 'Full-time',
    postedLabel: '9 days ago',
    department: 'Disputes',
    description:
      'Build and lead our Asia-Pacific disputes practice across arbitration, commercial litigation, and strategic investigations.',
    responsibilities: [
      'Lead high-value disputes and shape regional practice strategy.',
      'Develop client relationships and cross-border referral networks.',
      'Mentor lawyers and establish strong drafting and hearing standards.',
      'Drive business development across arbitration and commercial disputes.',
    ],
    qualifications: [
      '10+ years of litigation or arbitration experience.',
      'Demonstrated business-development track record.',
      'Strong advocacy and strategic matter leadership.',
      'Experience managing teams across complex disputes.',
    ],
  },
  {
    slug: slugify('Legal Technology Specialist'),
    title: 'Legal Technology Specialist',
    categorySlug: 'other-hirings',
    categoryTitle: 'Other Hirings',
    location: 'Remote',
    type: 'Full-time',
    postedLabel: '3 days ago',
    department: 'Legal Operations',
    description:
      'Drive innovation in legal tech, implement workflow tooling, and improve knowledge systems used by the legal and client-service teams.',
    responsibilities: [
      'Evaluate and implement tools for drafting, search, intake, and workflow tracking.',
      'Translate legal-team pain points into practical systems improvements.',
      'Support reporting, documentation, and process optimization initiatives.',
      'Work closely with engineering and operations stakeholders.',
    ],
    qualifications: [
      'Experience in legal operations or legal technology.',
      'Strong systems thinking and implementation ability.',
      'Comfort with documentation, training, and change management.',
      'Clear written and stakeholder communication.',
    ],
  },
  {
    slug: slugify('Paralegal - Capital Markets'),
    title: 'Paralegal - Capital Markets',
    categorySlug: 'other-hirings',
    categoryTitle: 'Other Hirings',
    location: 'London, UK',
    type: 'Full-time',
    postedLabel: '6 days ago',
    department: 'Capital Markets',
    description:
      'Support our capital markets team with execution checklists, transaction documents, regulatory filings, and matter coordination.',
    responsibilities: [
      'Maintain closing sets, checklists, and transaction records.',
      'Support filing, signature, and document-assembly workflows.',
      'Track matter timelines and communicate with internal stakeholders.',
      'Assist lawyers with research and document formatting quality control.',
    ],
    qualifications: [
      'Paralegal certification or equivalent experience.',
      'Exposure to capital markets or transactional legal work.',
      'Strong organizational discipline and follow-through.',
      'Detail-oriented drafting and document-management skills.',
    ],
  },
];

export const getCareerCategoryById = (value: string) => {
  return CAREER_CATEGORIES.find((category) =>
    matchesSlugOrTitle(value, category.slug, category.title)
  );
};

export const getCareerOpeningById = (value: string) => {
  return CAREER_OPENINGS.find((opening) => matchesSlugOrTitle(value, opening.slug, opening.title));
};

export const getCareerOpeningsForCategory = (categorySlug: string) => {
  return CAREER_OPENINGS.filter((opening) =>
    matchesSlugOrTitle(categorySlug, opening.categorySlug, opening.categoryTitle)
  );
};
