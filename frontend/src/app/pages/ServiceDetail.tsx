import React from 'react';
import { useParams, Link } from 'react-router';
import { buildServicePath, getServiceByRouteId } from '../data/services';
import { ArrowLeft, CheckCircle2, ShieldCheck, Clock, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { BRAND_NAME } from '../config/brand';
import { NotFoundPage } from './NotFoundPage';
import { ImageWithFallback } from '../components/shared/ImageWithFallback';
import { Seo } from '../components/seo/Seo';
import { buildServiceJsonLd } from '../seo/jsonLd';
import { selfHostedUnsplashImage } from '../utils/assets';

export const ServiceDetail = () => {
  const { id } = useParams();
  const serviceInfo = id ? getServiceByRouteId(id) : undefined;

  if (!serviceInfo) {
    return (
      <NotFoundPage
        title="Service not found"
        description="The requested service route could not be matched to a valid service entry."
        backToPath="/"
        backToLabel="Back to Home"
      />
    );
  }

  const trimmedTitle = serviceInfo.title;
  const seoDescription =
    serviceInfo.summary ||
    'Providing world-class legal solutions tailored to your specific requirements. Our team ensures precision and strategic clarity in every matter.';
  const canonicalPath = buildServicePath(trimmedTitle);

  return (
    <div className="pt-32 pb-24 min-h-screen bg-white">
      <Seo
        title={trimmedTitle}
        description={seoDescription}
        path={canonicalPath}
        image={selfHostedUnsplashImage('photo-1505664194779-8beaceb93744')}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: trimmedTitle, path: canonicalPath },
        ]}
        structuredData={buildServiceJsonLd({
          name: trimmedTitle,
          description: seoDescription,
          path: canonicalPath,
        })}
      />
      <div className="max-w-7xl mx-auto px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-12"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-600">
              OUR SERVICES
            </span>
            <h1
              className="text-5xl md:text-7xl leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {trimmedTitle}
            </h1>
            <p className="text-xl text-gray-500 font-light leading-relaxed">
              {serviceInfo.summary ||
                'Providing world-class legal solutions tailored to your specific requirements. Our team of experts ensures precision and strategic clarity in every matter.'}
            </p>

            <div className="pt-8 grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="font-bold text-sm uppercase tracking-widest">Compliance</h4>
                <p className="text-xs text-gray-500">
                  Full adherence to global legal standards and regulatory frameworks.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                  <Clock size={20} />
                </div>
                <h4 className="font-bold text-sm uppercase tracking-widest">Efficiency</h4>
                <p className="text-xs text-gray-500">
                  Optimized workflows to deliver high-stakes results within tight timelines.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-[4/5] bg-gray-100 rounded-[2rem] overflow-hidden">
              
              <ImageWithFallback
                src={selfHostedUnsplashImage('photo-1505664194779-8beaceb93744')}
                alt={trimmedTitle}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-10 -left-10 bg-black text-white p-10 rounded-3xl max-w-xs shadow-2xl">
              <Zap className="text-blue-400 mb-4" />
              <p className="text-sm font-light leading-relaxed">
                "Our approach to {trimmedTitle.toLowerCase()} is built on decades of institutional
                knowledge and cutting-edge legal technology."
              </p>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {BRAND_NAME} Advisory Team
              </p>
            </div>
          </motion.div>
        </div>

        <div className="mt-40 border-t border-gray-100 pt-24">
          <h2
            className="text-3xl font-bold mb-12"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Key Capabilities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-blue-600" />
                  <h3 className="font-bold">Strategic Analysis</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed font-light">
                  In-depth assessment of the legal landscape to identify risks and opportunities
                  before they emerge.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
