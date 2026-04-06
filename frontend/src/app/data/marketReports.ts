import { selfHostedUnsplashImage } from '../utils/assets';

export interface MarketReportStat {
  value: string;
  label: string;
}

export interface MarketReport {
  id: number;
  title: string;
  subtitle: string;
  category: string;
  date: string;
  pages: number;
  image: string;
}

export const MARKET_REPORTS_PAGE_CONTENT = {
  eyebrow: 'RESEARCH & ANALYSIS',
  title: 'Market Reports',
  intro:
    'In-depth analysis and insights into legal trends, market dynamics, and regulatory developments shaping global business.',
  sectionTitle: 'Latest Reports',
  ctaTitle: 'Subscribe to Market Reports',
  ctaDescription: 'Receive our latest research and analysis directly in your inbox.',
} as const;

export const MARKET_REPORT_STATS: MarketReportStat[] = [
  {
    value: '120+',
    label: 'Published Reports',
  },
  {
    value: '40+',
    label: 'Industry Sectors',
  },
  {
    value: 'Quarterly',
    label: 'Update Frequency',
  },
];

export const MARKET_REPORTS: MarketReport[] = [
  {
    id: 1,
    title: 'Global M&A Market Outlook 2026',
    subtitle: 'Navigating cross-border transactions in a changing regulatory landscape',
    category: 'Corporate & M&A',
    date: 'March 2026',
    pages: 48,
    image: selfHostedUnsplashImage('photo-1460925895917-afdab827c52f'),
  },
  {
    id: 2,
    title: 'Banking & Finance Sector Review',
    subtitle: 'Key trends in lending, regulatory frameworks, and fintech innovation',
    category: 'Banking & Finance',
    date: 'February 2026',
    pages: 62,
    image: selfHostedUnsplashImage('photo-1551288049-bebda4e38f71'),
  },
  {
    id: 3,
    title: 'Capital Markets Quarterly Update',
    subtitle: 'IPO activity, securities regulation, and market trends',
    category: 'Capital Markets',
    date: 'January 2026',
    pages: 36,
    image: selfHostedUnsplashImage('photo-1590283603385-17ffb3a7f29f'),
  },
  {
    id: 4,
    title: 'ESG & Sustainability Report',
    subtitle: 'Corporate governance, environmental compliance, and social responsibility',
    category: 'Regulatory',
    date: 'December 2025',
    pages: 54,
    image: selfHostedUnsplashImage('photo-1497435334941-8c899ee9e8e9'),
  },
  {
    id: 5,
    title: 'Technology & Digital Assets',
    subtitle: 'Blockchain, cryptocurrency regulation, and AI governance',
    category: 'Technology',
    date: 'November 2025',
    pages: 42,
    image: selfHostedUnsplashImage('photo-1639762681485-074b7f938ba0'),
  },
  {
    id: 6,
    title: 'Dispute Resolution Insights',
    subtitle: 'Arbitration trends, litigation strategies, and alternative dispute resolution',
    category: 'Dispute Resolution',
    date: 'October 2025',
    pages: 38,
    image: selfHostedUnsplashImage('photo-1589829545856-d10d557cf95f'),
  },
];
