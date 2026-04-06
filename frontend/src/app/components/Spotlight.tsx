import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ImageWithFallback } from './shared/ImageWithFallback';
import { INSIGHT_ARTICLES } from '../data/insights';

export const Spotlight = () => {
  const navigate = useNavigate();

  // Surface a focused editorial highlight instead of sending every insight to the homepage.
  const topBlogs = INSIGHT_ARTICLES.slice(0, 3);
  const [featuredBlog, ...remainingBlogs] = topBlogs;

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
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <h2
            className="text-5xl md:text-7xl leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Spotlight on our news and
            <br />
            insights
          </h2>
          <button
            onClick={() => navigate('/insights')}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-700 hover:text-green-800 transition-colors"
          >
            VIEW ALL NEWS AND INSIGHTS
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          {/* Left: Featured Large Card */}
          {featuredBlog && (
            <div
              className="group cursor-pointer"
              onClick={() => navigate(`/insights/${featuredBlog.id}`)}
            >
              <div className="aspect-[4/3] overflow-hidden mb-8">
                <ImageWithFallback
                  src={featuredBlog.image}
                  alt={featuredBlog.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="space-y-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {featuredBlog.category}
                </span>
                <h3
                  className="text-3xl md:text-4xl leading-snug group-hover:text-blue-900 transition-colors"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {featuredBlog.title}
                </h3>
                <div className="flex items-center gap-6 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className={`w-[2px] h-4 ${getTypeColor(featuredBlog.type)}`} />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {featuredBlog.type}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{featuredBlog.publishedDate}</span>
                </div>
              </div>
            </div>
          )}

          {/* Right: Two Smaller Cards */}
          <div className="flex flex-col gap-12">
            {remainingBlogs.map((blog) => (
              <div
                key={blog.id}
                className="flex flex-col md:flex-row gap-8 group cursor-pointer"
                onClick={() => navigate(`/insights/${blog.id}`)}
              >
                <div className="w-full md:w-1/2 aspect-[4/3] overflow-hidden">
                  <ImageWithFallback
                    src={blog.image}
                    alt={blog.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="w-full md:w-1/2 space-y-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {blog.category}
                  </span>
                  <h3
                    className="text-xl leading-tight group-hover:text-blue-900 transition-colors"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {blog.title}
                  </h3>
                  <div className="flex items-center gap-6 pt-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-[2px] h-4 ${getTypeColor(blog.type)}`} />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        {blog.type}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{blog.publishedDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
