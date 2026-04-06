import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { INSIGHT_ARTICLES, INSIGHT_CATEGORIES, INSIGHT_TYPES } from '../data/insights';
import { ChevronDown } from 'lucide-react';
import { ImageWithFallback } from '../components/shared/ImageWithFallback';
import { Seo } from '../components/seo/Seo';
import { buildWebPageJsonLd } from '../seo/jsonLd';

export const InsightsPage = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
 
  const filteredBlogs = INSIGHT_ARTICLES.filter((blog) => {
    const categoryMatch = selectedCategory === 'All' || blog.category === selectedCategory;
    const typeMatch = selectedType === 'All' || blog.type === selectedType;
    return categoryMatch && typeMatch;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Client News':
        return 'bg-blue-600';
      case 'Article':
        return 'bg-pink-600';
      case 'Blog':
        return 'bg-green-600';
      case 'Podcast':
        return 'bg-purple-600';
      case 'Opinion':
        return 'bg-orange-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Seo
        title="Insights"
        description="Stay informed with legal developments, industry trends, and regulatory analysis from Global LMG."
        path="/insights"
        image={INSIGHT_ARTICLES[0]?.image}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Insights', path: '/insights' },
        ]}
        keywords={['legal insights', 'regulatory updates', 'market analysis', 'Global LMG']}
        structuredData={buildWebPageJsonLd({
          title: 'News and Insights',
          description:
            'Stay informed with legal developments, industry trends, and regulatory analysis from Global LMG.',
          path: '/insights',
          type: 'CollectionPage',
        })}
      />
      {/* Hero Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <h1
            className="text-6xl md:text-8xl mb-8"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            News and Insights
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl font-light leading-relaxed">
            Stay informed with our latest thinking on legal developments, industry trends, and
            regulatory changes affecting businesses worldwide.
          </p>
        </div>
      </section>

      {/* Filters Section */}
      <section className="py-12 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap gap-4">
            {/* Expertise Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-full pl-6 pr-12 py-3 text-sm font-medium hover:border-gray-400 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="All">Expertise: All</option>
                {INSIGHT_CATEGORIES.filter((cat) => cat !== 'All').map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
                size={18}
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-full pl-6 pr-12 py-3 text-sm font-medium hover:border-gray-400 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="All">Type: All</option>
                {INSIGHT_TYPES.filter((type) => type !== 'All').map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
                size={18}
              />
            </div>

            

            {/* Results Count */}
            <div className="ml-auto flex items-center text-sm text-gray-600">
              {filteredBlogs.length} {filteredBlogs.length === 1 ? 'result' : 'results'}
            </div>
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {filteredBlogs.map((blog) => (
              <article
                key={blog.id}
                onClick={() => navigate(`/insights/${blog.id}`)}
                className="group cursor-pointer"
              >
                {/* Image */}
                <div className="aspect-[4/3] overflow-hidden mb-6 bg-gray-100">
                  <ImageWithFallback
                    src={blog.image}
                    alt={blog.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>

                {/* Content */}
                <div className="space-y-4">
                  {/* Category */}
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {blog.category}
                  </span>

                  {/* Title */}
                  <h3
                    className="text-2xl leading-tight group-hover:text-blue-900 transition-colors"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {blog.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-gray-600 leading-relaxed font-light line-clamp-2">
                    {blog.excerpt}
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className={`w-[2px] h-4 ${getTypeColor(blog.type)}`} />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        {blog.type}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{blog.publishedDate}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* No Results */}
          {filteredBlogs.length === 0 && (
            <div className="text-center py-20">
              <p className="text-xl text-gray-500">No insights found matching your filters.</p>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedType('All');
                }}
                className="mt-6 px-6 py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
