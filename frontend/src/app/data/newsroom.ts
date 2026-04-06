import { BRAND_NAME } from '../config/brand';
import { selfHostedUnsplashImage } from '../utils/assets';

export const NEWSROOM_TYPES = ['All', 'Press Release', 'Award', 'Firm News', 'Event'] as const;

export type NewsroomFilterType = (typeof NEWSROOM_TYPES)[number];
export type NewsroomItemType = Exclude<NewsroomFilterType, 'All'>;

export interface NewsroomItem {
  id: number;
  type: NewsroomItemType;
  date: string;
  title: string;
  excerpt: string;
  image: string;
  featured: boolean;
}

export const NEWSROOM_TYPE_COLORS: Record<NewsroomItemType, string> = {
  Award: 'bg-yellow-600',
  Event: 'bg-purple-600',
  'Firm News': 'bg-green-600',
  'Press Release': 'bg-blue-600',
};

export const NEWSROOM_ITEMS: NewsroomItem[] = [
  {
    id: 1,
    type: 'Press Release',
    date: 'March 8, 2026',
    title: `${BRAND_NAME} Advises on $2.4B Cross-Border Acquisition`,
    excerpt:
      'Our team successfully advised a leading technology company on its landmark acquisition of a European software firm.',
    image: selfHostedUnsplashImage('photo-1486406146926-c627a92ad1ab'),
    featured: true,
  },
  {
    id: 2,
    type: 'Award',
    date: 'March 5, 2026',
    title: `${BRAND_NAME} Named "Law Firm of the Year" for M&A`,
    excerpt:
      'Recognized for outstanding achievement in cross-border mergers and acquisitions across multiple jurisdictions.',
    image: selfHostedUnsplashImage('photo-1559827260-dc66d52bef19'),
    featured: true,
  },
  {
    id: 3,
    type: 'Firm News',
    date: 'March 1, 2026',
    title: 'New Partners Appointed Across Global Offices',
    excerpt:
      'We are proud to announce the promotion of 12 new partners across our Corporate, Finance, and Technology practices.',
    image: selfHostedUnsplashImage('photo-1521737711867-e3b97375f902'),
    featured: false,
  },
  {
    id: 4,
    type: 'Press Release',
    date: 'February 28, 2026',
    title: `${BRAND_NAME} Expands Asia-Pacific Presence`,
    excerpt:
      'Opening of new office in Singapore strengthens our capability to serve clients in the fastest-growing region.',
    image: selfHostedUnsplashImage('photo-1486406146926-c627a92ad1ab'),
    featured: false,
  },
  {
    id: 5,
    type: 'Event',
    date: 'February 25, 2026',
    title: 'Annual Legal Innovation Summit 2026',
    excerpt:
      'Join us for our flagship event exploring the intersection of law, technology, and business transformation.',
    image: selfHostedUnsplashImage('photo-1540575467063-178a50c2df87'),
    featured: false,
  },
  {
    id: 6,
    type: 'Award',
    date: 'February 20, 2026',
    title: 'Top Rankings in Legal 500 and Chambers',
    excerpt: `${BRAND_NAME} receives top-tier rankings across multiple practice areas in the latest industry guides.`,
    image: selfHostedUnsplashImage('photo-1567427017947-545c5f8d16ad'),
    featured: false,
  },
  {
    id: 7,
    type: 'Firm News',
    date: 'February 15, 2026',
    title: 'Launch of ESG Advisory Practice',
    excerpt:
      'New dedicated team to help clients navigate environmental, social, and governance challenges.',
    image: selfHostedUnsplashImage('photo-1497435334941-8c899ee9e8e9'),
    featured: false,
  },
  {
    id: 8,
    type: 'Press Release',
    date: 'February 10, 2026',
    title: `${BRAND_NAME} Advises on Major IPO`,
    excerpt:
      'Successfully guided a fintech unicorn through its $1.8B initial public offering on multiple exchanges.',
    image: selfHostedUnsplashImage('photo-1611974789855-9c2a0a7236a3'),
    featured: false,
  },
];
