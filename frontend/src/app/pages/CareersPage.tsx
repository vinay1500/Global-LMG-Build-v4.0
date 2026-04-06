import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Briefcase, Users, MapPin, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ImageWithFallback } from '../components/shared/ImageWithFallback';
import { Seo } from '../components/seo/Seo';
import { BRAND_NAME } from '../config/brand';
import { CLIENT_INTAKE_HREF } from '../config/launchLinks';
import { CAREER_CATEGORIES, CAREER_OPENINGS } from '../data/careers';
import { buildWebPageJsonLd } from '../seo/jsonLd';
import { selfHostedUnsplashImage } from '../utils/assets';

 
 
const CAREER_ICON_MAP = {
  'graduation-cap': GraduationCap,
  briefcase: Briefcase,
  users: Users,
};

export const CareersPage = () => {
  const navigate = useNavigate();

 
  return (
    <div className="pt-32 pb-24 bg-white">
      <Seo
        title="Careers"
        description={`Explore legal, internship, and legal-operations opportunities at ${BRAND_NAME} across multiple jurisdictions.`}
        path="/careers"
        image={selfHostedUnsplashImage('photo-1521737711867-e3b97375f902')}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Careers', path: '/careers' },
        ]}
        structuredData={buildWebPageJsonLd({
          title: `Careers at ${BRAND_NAME}`,
          description: `Explore legal, internship, and legal-operations opportunities at ${BRAND_NAME} across multiple jurisdictions.`,
          path: '/careers',
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
            JOIN OUR TEAM
          </span>
          <h1
            className="text-6xl md:text-8xl mb-8"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Careers at
            <br />
            {BRAND_NAME}
          </h1>
          <p className="text-xl text-gray-500 font-light leading-relaxed">
            We are always looking for exceptional talent to join our global network. Whether you are
            a student, a seasoned advocate, or a professional in legal operations, discover your
            next move with us.
          </p>
        </motion.div>

        {/* Hero Image */}
        <div className="mb-32 aspect-[21/9] rounded-[3rem] overflow-hidden bg-gray-100">
          <ImageWithFallback
            src={selfHostedUnsplashImage('photo-1521737711867-e3b97375f902')}
            alt={`Careers at ${BRAND_NAME}`}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Why Join Us */}
        <div className="mb-32">
          <h2
            className="text-4xl md:text-5xl mb-16"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Why {BRAND_NAME}?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'World-Class Training',
                desc: 'Comprehensive development programs and mentorship from industry leaders.',
              },
              {
                title: 'Global Opportunities',
                desc: 'Work across borders with clients and colleagues in 40+ countries.',
              },
              {
                title: 'Innovation Culture',
                desc: 'Be at the forefront of legal technology and innovative service delivery.',
              },
              {
                title: 'Work-Life Balance',
                desc: 'Flexible arrangements and support for your wellbeing and personal growth.',
              },
              {
                title: 'Diverse & Inclusive',
                desc: 'A workplace that celebrates diversity and fosters belonging for all.',
              },
              {
                title: 'Competitive Packages',
                desc: 'Industry-leading compensation and comprehensive benefits.',
              },
            ].map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-8 bg-gray-50 rounded-2xl"
              >
                <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                <p className="text-sm text-gray-600 font-light leading-relaxed">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Career Categories */}
        <div className="mb-32">
          <h2
            className="text-4xl md:text-5xl mb-16"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Explore Opportunities
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CAREER_CATEGORIES.map((category, idx) => {
              const Icon = CAREER_ICON_MAP[category.iconKey];

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -8 }}
                  onClick={() => navigate(`/careers/${category.slug}`)}
                  className="p-10 border border-gray-100 rounded-3xl hover:shadow-2xl hover:shadow-black/5 transition-all group cursor-pointer"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl ${category.color} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}
                  >
                    <Icon size={28} />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{category.title}</h3>
                  <p className="text-sm text-gray-500 font-light leading-relaxed mb-6">
                    {category.description}
                  </p>
                  <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 transition-colors">
                    Explore Roles
                    <ArrowRight size={14} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Current Openings */}
        <div className="mb-32">
          <h2
            className="text-4xl md:text-5xl mb-16"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Current Openings
          </h2>

          <div className="space-y-6">
            {CAREER_OPENINGS.map((job, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/careers/${job.slug}`)}
                className="group p-8 border border-gray-200 rounded-2xl hover:border-blue-600 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider rounded-full">
                        {job.categoryTitle}
                      </span>
                      <span className="text-xs text-gray-400 font-semibold">{job.type}</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-2 group-hover:text-blue-600 transition-colors">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-2">
                        <MapPin size={14} />
                        {job.location}
                      </span>
                    </div>
                    <p className="text-gray-600 font-light leading-relaxed mb-4">
                      {job.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {job.qualifications.map((req, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                        >
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 group-hover:bg-blue-600 transition-colors flex-shrink-0">
                    <ArrowRight
                      size={20}
                      className="text-gray-600 group-hover:text-white transition-colors"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="p-16 bg-black text-white rounded-[3rem] text-center">
          <h2
            className="text-4xl md:text-5xl mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Don't See the Right Role?
          </h2>
          <p className="text-xl text-gray-400 font-light mb-8 max-w-2xl mx-auto">
            We're always interested in hearing from talented professionals. Send us your resume and
            we'll keep you in mind for future opportunities.
          </p>
          
          <a
            href={CLIENT_INTAKE_HREF}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            className="px-12 py-5 bg-white text-black text-xs font-bold uppercase tracking-[0.2em] hover:bg-gray-200 transition-colors inline-flex items-center gap-3"
          >
            Submit Your Resume
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </div>
  );
};
