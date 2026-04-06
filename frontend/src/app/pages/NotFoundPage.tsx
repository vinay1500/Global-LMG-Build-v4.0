import React from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Seo } from '../components/seo/Seo';

interface NotFoundPageProps {
  title?: string;
  description?: string;
  backToPath?: string;
  backToLabel?: string;
}

export const NotFoundPage = ({
  title = 'Page not found',
  description = 'The page you are looking for does not exist or may have moved.',
  backToPath = '/',
  backToLabel = 'Back to Home',
}: NotFoundPageProps) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-24 bg-white">
      <Seo title={title} description={description} robots="noindex, nofollow" />
      <div className="max-w-2xl text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-600 block mb-4">
          404
        </span>
        <h1
          className="text-5xl md:text-6xl mb-6"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {title}
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed mb-10">{description}</p>
        <Link
          to={backToPath}
          className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          {backToLabel}
        </Link>
      </div>
    </div>
  );
};
