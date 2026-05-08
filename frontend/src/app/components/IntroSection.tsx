import React from 'react';
import { Scale } from 'lucide-react';
import { Link } from 'react-router';
import { HOME_INTRO_CONTENT } from '../content/site/home';

export const IntroSection = () => {
  return (
    <section className="pt-32 pb-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-start">
          {/* Left Column: Logo */}
          <div className="flex-shrink-0 pt-2">
            <div className="w-16 h-16 bg-black flex items-center justify-center rounded-xl rotate-3 hover:rotate-0 transition-transform duration-300">
              <Scale className="text-white" size={32} />
            </div>
          </div>

          {/* Right Column: Text Content */}
          <div className="flex-grow max-w-4xl space-y-8">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-gray-400 leading-tight">
                {HOME_INTRO_CONTENT.eyebrowLines.map((line, index) => (
                  <React.Fragment key={line}>
                    {line}
                    {index < HOME_INTRO_CONTENT.eyebrowLines.length - 1 ? <br /> : null}
                  </React.Fragment>
                ))}
              </h4>
            </div>

            <h2
              className="text-4xl md:text-6xl font-medium leading-[1.1] tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {HOME_INTRO_CONTENT.titleLines.map((line, index) => (
                <React.Fragment key={line}>
                  {line}
                  {index < HOME_INTRO_CONTENT.titleLines.length - 1 ? <br /> : null}
                </React.Fragment>
              ))}
            </h2>

            <div className="max-w-xl">
              <p className="text-sm text-gray-500 leading-relaxed">
                {HOME_INTRO_CONTENT.bodyLines.map((line, index) => (
                  <React.Fragment key={line}>
                    {line}
                    {index < HOME_INTRO_CONTENT.bodyLines.length - 1 ? <br /> : null}
                  </React.Fragment>
                ))}
              </p>
              
              
              <Link
                to="/about"
                className="inline-flex items-center gap-2 mt-6 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors group"
              >
                {HOME_INTRO_CONTENT.ctaLabel}
                <div className="w-6 h-[2px] bg-blue-600 group-hover:w-10 transition-all duration-300" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
