import React from 'react';
import { motion } from 'motion/react';
import type { LegalDocument } from '../../data/legalContent';

interface LegalDocumentPageProps {
  document: LegalDocument;
}

export const LegalDocumentPage = ({ document }: LegalDocumentPageProps) => {
  return (
    <div className="pt-32 pb-24 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mb-16"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-600 mb-6 block">
            {document.eyebrow}
          </span>
          <h1
            className="text-5xl md:text-7xl mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {document.title}
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-8">
            Last updated {document.lastUpdated}
          </p>
          <p className="text-xl text-gray-500 font-light leading-relaxed">{document.intro}</p>
        </motion.div>

        <div className="space-y-10">
          {document.sections.map((section) => (
            <section
              key={section.heading}
              className="p-8 md:p-10 rounded-[2rem] bg-gray-50 border border-gray-100"
            >
              <h2
                className="text-2xl md:text-3xl mb-6"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {section.heading}
              </h2>
              <div className="space-y-4">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-gray-600 leading-relaxed font-light">
                    {paragraph}
                  </p>
                ))}
              </div>
              {section.bullets && (
                <ul className="mt-6 space-y-3 text-gray-600 font-light leading-relaxed list-disc pl-6">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {document.footerNote && (
          <div className="mt-12 p-8 rounded-[2rem] bg-black text-white">
            <p className="text-sm md:text-base font-light leading-relaxed">{document.footerNote}</p>
          </div>
        )}
      </div>
    </div>
  );
};
