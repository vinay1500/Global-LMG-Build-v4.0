import React from 'react';
import { Scale } from 'lucide-react';
import { Link } from 'react-router';

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
                Pioneering the next era of
                <br />
                Global Legal Excellence
              </h4>
            </div>

            <h2
              className="text-4xl md:text-6xl font-medium leading-[1.1] tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Redefining standard practices through
              <br />
              Digital innovation and specialized
              <br />
              Intelligence to solve the world's most
              <br />
              Complex legal challenges today.
            </h2>

            <div className="max-w-xl">
              <p className="text-sm text-gray-500 leading-relaxed">
                Our collaborative framework integrates deep jurisdictional expertise with
                <br />
                Forward-thinking technological infrastructure to provide seamless results.
                <br />
                We bridge the gap between traditional law and future markets.
              </p>
              
              
              <Link
                to="/about"
                className="inline-flex items-center gap-2 mt-6 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors group"
              >
                READ MORE
                <div className="w-6 h-[2px] bg-blue-600 group-hover:w-10 transition-all duration-300" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
