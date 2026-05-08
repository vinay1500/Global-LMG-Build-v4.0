import React from 'react';
import { motion } from 'motion/react';
import { Globe, Shield, Users, Award } from 'lucide-react';
import { ImageWithFallback } from '../components/shared/ImageWithFallback';
import { Seo } from '../components/seo/Seo';
import { ABOUT_FEATURES, ABOUT_METRICS, ABOUT_PAGE_CONTENT } from '../content/site/about';
import { buildWebPageJsonLd } from '../seo/jsonLd';

const ABOUT_FEATURE_ICON_MAP = {
  award: Award,
  globe: Globe,
  shield: Shield,
  users: Users,
};

export const AboutPage = () => {
  return (
    <div className="pt-32 pb-24 bg-white">
      <Seo
        title="About"
        description={ABOUT_PAGE_CONTENT.intro}
        path="/about"
        image={ABOUT_PAGE_CONTENT.image}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ]}
        structuredData={buildWebPageJsonLd({
          title: 'About Global LMG',
          description: ABOUT_PAGE_CONTENT.intro,
          path: '/about',
          type: 'AboutPage',
        })}
      />
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mb-24"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-600 mb-6 block">
            {ABOUT_PAGE_CONTENT.eyebrow}
          </span>
          <h1
            className="text-6xl md:text-8xl mb-8"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {ABOUT_PAGE_CONTENT.title}
          </h1>
          <p className="text-xl text-gray-500 font-light leading-relaxed">
            {ABOUT_PAGE_CONTENT.intro}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-24 mb-32">
          <div className="aspect-[4/3] rounded-[3rem] overflow-hidden bg-gray-100">
            
            <ImageWithFallback
              src={ABOUT_PAGE_CONTENT.image}
              alt={ABOUT_PAGE_CONTENT.imageAlt}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center space-y-8">
            <h2 className="text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              {ABOUT_PAGE_CONTENT.sectionTitle}
            </h2>
            <p className="text-gray-500 leading-relaxed font-light">
              {ABOUT_PAGE_CONTENT.sectionBody}
            </p>
            <div className="grid grid-cols-2 gap-8 pt-8">
              
              {ABOUT_METRICS.map((metric) => (
                <div key={metric.label}>
                  <h4 className="text-4xl font-bold mb-2">{metric.value}</h4>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {ABOUT_FEATURES.map((item) => {
            const Icon = ABOUT_FEATURE_ICON_MAP[item.iconKey];

            return (
              <div key={item.title} className="p-10 bg-gray-50 rounded-[2.5rem] space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
                  <Icon size={24} />
                </div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-sm text-gray-500 font-light leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
