import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Tag, Search, ArrowRight } from 'lucide-react';
import { ImageWithFallback } from '../components/shared/ImageWithFallback';
import { Seo } from '../components/seo/Seo';
import { BRAND_NAME, PRESS_EMAIL, CONTACT_PHONE } from '../config/brand';
import {
  NEWSROOM_ITEMS,
  NEWSROOM_TYPE_COLORS,
  NEWSROOM_TYPES,
  type NewsroomFilterType,
  type NewsroomItemType,
} from '../data/newsroom';
import { buildWebPageJsonLd } from '../seo/jsonLd';



export const Newsroom = () => {
  const [selectedType, setSelectedType] = useState<NewsroomFilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNews = NEWSROOM_ITEMS.filter((item) => {
    const typeMatch = selectedType === 'All' || item.type === selectedType;
    const searchMatch =
      searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return typeMatch && searchMatch;
  });

  const featuredNews = filteredNews.filter((item) => item.featured);
  const regularNews = filteredNews.filter((item) => !item.featured);

  const getTypeColor = (type: NewsroomItemType) => NEWSROOM_TYPE_COLORS[type];

  return (
    <div className="pt-32 pb-24 bg-white">
      <Seo
        title="Newsroom"
        description={`Stay up to date with announcements, awards, events, and media updates from ${BRAND_NAME}.`}
        path="/newsroom"
        image={NEWSROOM_ITEMS[0]?.image}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Newsroom', path: '/newsroom' },
        ]}
        keywords={['newsroom', 'press releases', 'firm news', BRAND_NAME]}
        structuredData={buildWebPageJsonLd({
          title: 'Newsroom',
          description: `Stay up to date with announcements, awards, events, and media updates from ${BRAND_NAME}.`,
          path: '/newsroom',
          type: 'CollectionPage',
        })}
      />
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-600 mb-6 block">
            LATEST UPDATES
          </span>
          <h1
            className="text-6xl md:text-8xl mb-8"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Newsroom
          </h1>
          <p className="text-xl text-gray-500 font-light leading-relaxed max-w-3xl">
            Stay up to date with the latest news, announcements, and achievements from {BRAND_NAME}.
          </p>
        </motion.div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-6 mb-16">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-5 rounded-full border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {NEWSROOM_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  selectedType === type
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Featured News */}
        {featuredNews.length > 0 && (
          <div className="mb-24">
            <h2
              className="text-2xl font-bold mb-8"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Featured
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featuredNews.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[16/10] rounded-3xl overflow-hidden mb-6 bg-gray-100">
                    <ImageWithFallback
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading={i === 0 ? 'eager' : 'lazy'}
                      fetchPriority={i === 0 ? 'high' : undefined}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute top-6 left-6">
                      <span
                        className={`px-4 py-2 ${getTypeColor(item.type)} text-white text-[10px] font-bold uppercase tracking-widest rounded-full`}
                      >
                        {item.type}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold">
                      <Calendar size={14} />
                      {item.date}
                    </div>
                    <h3
                      className="text-2xl font-bold group-hover:text-blue-600 transition-colors"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 font-light leading-relaxed">
                      {item.excerpt}
                    </p>
                    <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 transition-colors pt-2">
                      Read More
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Regular News */}
        {regularNews.length > 0 && (
          <div>
            <h2
              className="text-2xl font-bold mb-8"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              All News
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {regularNews.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-gray-100">
                    <ImageWithFallback
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-4 left-4">
                      <span
                        className={`px-3 py-1.5 ${getTypeColor(item.type)} text-white text-[9px] font-bold uppercase tracking-widest rounded-full`}
                      >
                        {item.type}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold">
                      <Calendar size={12} />
                      {item.date}
                    </div>
                    <h3 className="text-lg font-bold group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 font-light leading-relaxed line-clamp-2">
                      {item.excerpt}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {filteredNews.length === 0 && (
          <div className="text-center py-24">
            <p className="text-xl text-gray-400 font-light">
              No news items found matching your criteria.
            </p>
          </div>
        )}

        {/* Media Contact */}
        <div className="mt-32 p-16 bg-gray-50 rounded-[3rem]">
          <div className="max-w-2xl mx-auto text-center">
            <h2
              className="text-3xl md:text-4xl mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Media Inquiries
            </h2>
            <p className="text-lg text-gray-600 font-light mb-8">
              For press inquiries and media relations, please contact our communications team.
            </p>
            <div className="space-y-2 text-gray-600">
              <p className="font-semibold">{PRESS_EMAIL}</p>
              <p className="text-sm">{CONTACT_PHONE}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
