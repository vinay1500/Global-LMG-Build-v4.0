import React from 'react';
import { Link } from 'react-router';
import { ImageWithFallback } from './shared/ImageWithFallback';
import { selfHostedUnsplashImage } from '../utils/assets';

interface InsightCardProps {
  category: string;
  title: string;
  date: string;
  image?: string;
}

export const InsightCard = ({ category, title, date, image }: InsightCardProps) => {
  return (
    <div className="group cursor-pointer">
      {image && (
        <div className="aspect-[16/9] overflow-hidden mb-6">
          
          <ImageWithFallback
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{category}</span>
        <h3
          className="text-2xl font-semibold leading-tight group-hover:underline decoration-1 underline-offset-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {title}
        </h3>
        <p className="text-sm text-gray-400">{date}</p>
      </div>
    </div>
  );
};

export const Insights = () => {
  const insights = [
    {
      category: 'Market Report',
      title: 'Global M&A Trends: A Shift Towards Energy Transition',
      date: 'Feb 10, 2026',
      image: selfHostedUnsplashImage('photo-1739502759976-1849f579549d'),
    },
    {
      category: 'Analysis',
      title: 'The Future of Digital Assets in European Markets',
      date: 'Feb 08, 2026',
      image: selfHostedUnsplashImage('photo-1718873030311-665e717830f3'),
    },
    {
      category: 'Briefing',
      title: 'Cross-border Regulatory Compliance in the AI Era',
      date: 'Feb 05, 2026',
      image: selfHostedUnsplashImage('photo-1620712943543-bcc4628c7215'),
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader title="Insights" linkText="View all insights" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {insights.map((insight, index) => (
            <InsightCard key={index} {...insight} />
          ))}
        </div>
      </div>
    </section>
  );
};

export const SectionHeader = ({ title, linkText }: { title: string; linkText?: string }) => (
  <div className="flex items-end justify-between mb-12 border-b border-gray-200 pb-4">
    <h2 className="text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>
      {title}
    </h2>
    {linkText && (
      <>
        
        
        <Link
          to="/insights"
          className="text-sm font-semibold hover:underline flex items-center gap-2"
        >
          {linkText}
          <span className="text-xl leading-none">→</span>
        </Link>
      </>
    )}
  </div>
);
