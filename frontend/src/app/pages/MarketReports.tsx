import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, FileText, Download, Calendar, ArrowRight } from 'lucide-react';
import { ImageWithFallback } from '../components/shared/ImageWithFallback';
import { Seo } from '../components/seo/Seo';
import {
  MARKET_REPORTS,
  MARKET_REPORTS_PAGE_CONTENT,
  MARKET_REPORT_STATS,
} from '../data/marketReports';
import { buildWebPageJsonLd } from '../seo/jsonLd';



export const MarketReports = () => {
  return (
    <div className="pt-32 pb-24 bg-white">
      <Seo
        title={MARKET_REPORTS_PAGE_CONTENT.title}
        description={MARKET_REPORTS_PAGE_CONTENT.intro}
        path="/market-reports"
        image={MARKET_REPORTS[0]?.image}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Market Reports', path: '/market-reports' },
        ]}
        keywords={['market reports', 'legal research', 'regulatory analysis', 'Global LMG']}
        structuredData={buildWebPageJsonLd({
          title: MARKET_REPORTS_PAGE_CONTENT.title,
          description: MARKET_REPORTS_PAGE_CONTENT.intro,
          path: '/market-reports',
          type: 'CollectionPage',
        })}
      />
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mb-24"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-600 mb-6 block">
            {MARKET_REPORTS_PAGE_CONTENT.eyebrow}
          </span>
          <h1
            className="text-6xl md:text-8xl mb-8"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {MARKET_REPORTS_PAGE_CONTENT.title}
          </h1>
          <p className="text-xl text-gray-500 font-light leading-relaxed">
            {MARKET_REPORTS_PAGE_CONTENT.intro}
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          
          {MARKET_REPORT_STATS.map((stat, i) => {
            const Icon = [FileText, TrendingUp, Calendar][i] ?? FileText;

            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-10 bg-gray-50 rounded-[2.5rem] space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
                  <Icon size={24} />
                </div>
                <h3 className="text-4xl font-bold">{stat.value}</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Reports Grid */}
        <div className="space-y-12">
          <h2 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            {MARKET_REPORTS_PAGE_CONTENT.sectionTitle}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {MARKET_REPORTS.map((report, i) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[4/3] rounded-3xl overflow-hidden mb-6 bg-gray-100">
                  <ImageWithFallback
                    src={report.image}
                    alt={report.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-6 left-6">
                    <span className="px-4 py-2 bg-white/90 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest rounded-full">
                      {report.category}
                    </span>
                  </div>
                  <div className="absolute bottom-6 right-6">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight size={18} className="text-black" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-xs text-gray-400 font-semibold">
                    <span className="flex items-center gap-2">
                      <Calendar size={14} />
                      {report.date}
                    </span>
                    <span className="flex items-center gap-2">
                      <FileText size={14} />
                      {report.pages} pages
                    </span>
                  </div>
                  <h3 className="text-xl font-bold group-hover:text-blue-600 transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-sm text-gray-500 font-light leading-relaxed">
                    {report.subtitle}
                  </p>
                  <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 transition-colors pt-2">
                    <Download size={14} />
                    Download Report
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-32 p-16 bg-black text-white rounded-[3rem] text-center">
          <h2
            className="text-4xl md:text-5xl mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {MARKET_REPORTS_PAGE_CONTENT.ctaTitle}
          </h2>
          <p className="text-xl text-gray-400 font-light mb-8 max-w-2xl mx-auto">
            {MARKET_REPORTS_PAGE_CONTENT.ctaDescription}
          </p>
          <button className="px-12 py-5 bg-white text-black text-xs font-bold uppercase tracking-[0.2em] hover:bg-gray-200 transition-colors inline-flex items-center gap-3">
            Subscribe Now
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
