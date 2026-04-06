import React from 'react';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import { useNavigate } from 'react-router';
import { CLIENT_INTAKE_HREF } from '../config/launchLinks';
import { BRAND_WORDMARK, CONTACT_EMAIL, CONTACT_PHONE } from '../config/brand';
import { EXPERTISE_CATALOG } from '../data/expertiseCatalog';

export const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-black text-white pt-24 pb-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-16 mb-20">
          {/* Brand block keeps the primary trust signals and contact entry points together. */}
          <div className="space-y-8">
            <h2
              className="text-2xl font-bold tracking-tighter"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {BRAND_WORDMARK}
            </h2>
            <div className="space-y-4">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group"
              >
                <Mail size={18} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm">{CONTACT_EMAIL}</span>
              </a>
              <a
                href="tel:+15550001234"
                className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group"
              >
                <Phone size={18} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm">{CONTACT_PHONE}</span>
              </a>
              <div className="flex items-start gap-3 text-gray-400">
                <MapPin size={18} className="mt-1 group-hover:scale-110 transition-transform" />
                <span className="text-sm leading-relaxed">
                  125 Global Financial Center
                  <br />
                  London, EC2V 6BT
                  <br />
                  United Kingdom
                </span>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Official social profile links will be added after the final brand directory is
                approved.
              </p>
            </div>
          </div>

          {/* Link columns surface the highest-value navigation targets from the brochure site. */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-8">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">
                Expertise
              </h4>
              <ul className="space-y-4 text-sm text-gray-400">
                {EXPERTISE_CATALOG.slice(0, 5).map((item) => (
                  <li
                    key={item.categorySlug}
                    onClick={() => navigate(item.route)}
                    className="hover:text-blue-600 cursor-pointer transition-colors"
                  >
                    {item.category}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">
                Resources
              </h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li
                  onClick={() => navigate('/insights')}
                  className="hover:text-white cursor-pointer transition-colors"
                >
                  Legal Insights
                </li>
                <li
                  onClick={() => navigate('/market-reports')}
                  className="hover:text-white cursor-pointer transition-colors"
                >
                  Market Reports
                </li>
                <li
                  onClick={() => navigate('/careers')}
                  className="hover:text-white cursor-pointer transition-colors"
                >
                  Careers
                </li>
                <li
                  onClick={() => navigate('/newsroom')}
                  className="hover:text-white cursor-pointer transition-colors"
                >
                  Newsroom
                </li>
                <li
                  onClick={() => navigate('/pro-bono')}
                  className="hover:text-white cursor-pointer transition-colors"
                >
                  Pro Bono
                </li>
              </ul>
            </div>
          </div>

          {/* The coverage card reinforces the global-delivery message without needing a full map asset. */}
          <div className="relative h-full min-h-[300px] lg:min-h-0 group">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">
              Global Coverage
            </h4>
            <div className="relative w-full aspect-square bg-white/5 rounded-3xl overflow-hidden border border-white/10 group-hover:border-white/20 transition-all">
              <div className="absolute inset-0 p-8 flex items-center justify-center opacity-40 group-hover:opacity-60 transition-opacity">
                <Globe size={180} strokeWidth={0.5} className="text-blue-500 animate-pulse-slow" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <p className="text-xs font-bold uppercase tracking-widest mb-1">Our Network</p>
                <p className="text-[10px] text-gray-400">
                  Presence in 40+ countries across 5 continents.
                </p>
                
                
                <a
                  href={CLIENT_INTAKE_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="inline-block mt-4 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-white pb-1 hover:text-blue-400 transition-colors"
                >
                  Request Coverage Details
                </a>
              </div>
              <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,1)]" />
              <div className="absolute top-1/3 left-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full" />
              <div className="absolute top-1/2 left-2/3 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,1)]" />
              <div className="absolute top-2/3 left-1/4 w-1.5 h-1.5 bg-blue-400 rounded-full" />
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-gray-500">
          <div className="flex gap-8">
            <button
              type="button"
              onClick={() => navigate('/legal-disclaimer')}
              className="hover:text-white cursor-pointer transition-colors"
            >
              Legal Disclaimer
            </button>
            <button
              type="button"
              onClick={() => navigate('/privacy')}
              className="hover:text-white cursor-pointer transition-colors"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => navigate('/cookies')}
              className="hover:text-white cursor-pointer transition-colors"
            >
              Cookies
            </button>
          </div>
          <p>© 2026 {BRAND_WORDMARK}. ALL RIGHTS RESERVED.</p>
        </div>
      </div>
    </footer>
  );
};
