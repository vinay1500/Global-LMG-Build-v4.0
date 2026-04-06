import React from 'react';
import { useParams, useNavigate } from 'react-router';
import { INSIGHT_ARTICLES } from '../data/insights';
import { ArrowLeft, Clock, Calendar, Share2, Bookmark } from 'lucide-react';
import { ImageWithFallback } from '../components/shared/ImageWithFallback';
import { Seo } from '../components/seo/Seo';
import { SafeRichText } from '../components/shared/SafeRichText';
import { buildArticleJsonLd } from '../seo/jsonLd';
import { NotFoundPage } from './NotFoundPage';

export const InsightDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const blog = INSIGHT_ARTICLES.find((article) => article.id === id);

  if (!blog) {
    return (
      <NotFoundPage
        title="Insight not found"
        description="The requested insight article could not be found."
        backToPath="/insights"
        backToLabel="Back to Insights"
      />
    );
  }

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

  // Get related articles (excluding current)
  const relatedArticles = INSIGHT_ARTICLES.filter(
    (b) =>
      b.id !== id &&
      (b.category === blog.category || b.tags?.some((tag) => blog.tags?.includes(tag)))
  ).slice(0, 3);
  const publishedDate = new Date(blog.publishedDate);
  const publishedTime = Number.isNaN(publishedDate.getTime())
    ? undefined
    : publishedDate.toISOString();

  return (
    <div className="min-h-screen bg-white">
      <Seo
        title={blog.title}
        description={blog.excerpt}
        path={`/insights/${blog.id}`}
        type="article"
        image={blog.image}
        keywords={blog.tags}
        publishedTime={publishedTime}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Insights', path: '/insights' },
          { name: blog.title, path: `/insights/${blog.id}` },
        ]}
        structuredData={buildArticleJsonLd({
          title: blog.title,
          description: blog.excerpt,
          path: `/insights/${blog.id}`,
          image: blog.image,
          publishedTime,
          authorName: blog.author?.name,
          section: blog.category,
          keywords: blog.tags,
        })}
      />
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-6 pt-12">
        <button
          onClick={() => navigate('/insights')}
          className="flex items-center gap-2 text-sm font-medium hover:text-blue-600 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Insights
        </button>
      </div>

      {/* Article Header */}
      <article className="max-w-4xl mx-auto px-6 py-16">
        {/* Category and Type Badge */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {blog.category}
          </span>
          <span
            className={`${getTypeColor(blog.type)} text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider`}
          >
            {blog.type}
          </span>
        </div>

        {/* Title */}
        <h1
          className="text-5xl md:text-6xl mb-8 leading-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {blog.title}
        </h1>

        {/* Meta Information */}
        <div className="flex flex-wrap items-center gap-6 pb-8 mb-8 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={16} />
            <span>{blog.publishedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock size={16} />
            <span>{blog.readTime}</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Share2 size={18} />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Bookmark size={18} />
            </button>
          </div>
        </div>

        {/* Featured Image */}
        <div className="aspect-[16/9] overflow-hidden mb-12 bg-gray-100">
          <ImageWithFallback
            src={blog.image}
            alt={blog.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Article Content */}
            <SafeRichText
              className="prose prose-lg max-w-none mb-16"
              html={blog.content}
              style={{
                fontFamily: "'Inter', sans-serif",
                lineHeight: '1.8',
              }}
            />

            {/* References Section */}
            {blog.references && blog.references.length > 0 && (
              <div className="mb-16 p-8 bg-gray-50 rounded-2xl">
                <h3
                  className="text-2xl font-bold mb-6"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  References
                </h3>
                <ul className="space-y-3">
                  {blog.references.map((ref, idx) => (
                    <li
                      key={idx}
                      className="text-gray-700 pl-6 relative before:content-[''] before:absolute before:left-0 before:top-3 before:w-2 before:h-2 before:bg-blue-600 before:rounded-full"
                    >
                      {ref}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-16">
                {blog.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-8">
              {/* Author */}
              {blog.author && (
                <div className="p-6 bg-gray-50 rounded-2xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
                    Author
                  </h4>
                  <div className="flex items-start gap-4">
                    <ImageWithFallback
                      src={blog.author.image}
                      alt={blog.author.name}
                      className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                    />
                    <div>
                      <h5 className="font-bold mb-1">{blog.author.name}</h5>
                      <p className="text-sm text-gray-600">{blog.author.title}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Related People */}
              {blog.relatedPeople && blog.relatedPeople.length > 0 && (
                <div className="p-6 bg-gray-50 rounded-2xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
                    Related People
                  </h4>
                  <div className="space-y-4">
                    {blog.relatedPeople.map((person, idx) => (
                      <div key={idx} className="flex items-start gap-4">
                        <ImageWithFallback
                          src={person.image}
                          alt={person.name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                        <div>
                          <h5 className="font-bold text-sm mb-0.5">{person.name}</h5>
                          <p className="text-xs text-gray-600">{person.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6">
            <h2
              className="text-4xl md:text-5xl mb-12"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Related Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedArticles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => {
                    navigate(`/insights/${article.id}`);
                    window.scrollTo(0, 0);
                  }}
                  className="group cursor-pointer bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <ImageWithFallback
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {article.category}
                    </span>
                    <h3
                      className="text-xl mt-3 mb-3 leading-tight group-hover:text-blue-900 transition-colors line-clamp-2"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className={`w-[2px] h-4 ${getTypeColor(article.type)}`} />
                        <span className="text-xs font-bold uppercase tracking-widest">
                          {article.type}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{article.publishedDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
