import React from 'react';
import { Shield, BarChart3, Globe2, Scale, Building2, Landmark } from 'lucide-react';
import { ImageWithFallback } from './shared/ImageWithFallback';
import { selfHostedUnsplashImage } from '../utils/assets';

const practices = [
  { name: 'Antitrust & Competition', icon: Scale },
  { name: 'Banking & Finance', icon: Landmark },
  { name: 'Capital Markets', icon: BarChart3 },
  { name: 'Corporate / M&A', icon: Building2 },
  { name: 'Dispute Resolution', icon: Shield },
  { name: 'Tax', icon: Globe2 },
];

export const ExpertiseGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200 border border-gray-200">
      {practices.map((practice) => (
        <div
          key={practice.name}
          className="bg-white p-12 hover:bg-gray-50 transition-colors group cursor-pointer"
        >
          <practice.icon
            className="mb-6 text-gray-400 group-hover:text-black transition-colors"
            size={32}
            strokeWidth={1.5}
          />
          <h4 className="text-xl font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
            {practice.name}
          </h4>
          <p className="mt-4 text-sm text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
            Learn more about our {practice.name.toLowerCase()} capabilities.
          </p>
        </div>
      ))}
    </div>
  );
};

export const Expertise = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <h2 className="text-5xl mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
            Legal Expertise
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl font-light">
            We offer a full range of legal services across every major market and sector, helping
            clients navigate their most critical challenges.
          </p>
        </div>
        <ExpertiseGrid />
      </div>
      <GlobalReach image={selfHostedUnsplashImage('photo-1721598418579-6a3f001c4021')} />
    </section>
  );
};

export const GlobalReach = ({ image }: { image: string }) => (
  <section className="bg-black text-white py-24">
    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      <div className="space-y-8">
        <h2 className="text-5xl" style={{ fontFamily: "'Playfair Display', serif" }}>
          Global perspective, local depth.
        </h2>
        <p className="text-xl text-gray-400 font-light leading-relaxed">
          With offices in more than 40 countries, we are where our clients need us to be. Our global
          network allows us to provide seamless cross-border advice on the most complex legal
          matters.
        </p>
        <button className="text-white border-b border-white pb-1 font-semibold hover:opacity-70 transition-opacity">
          Explore our offices
        </button>
      </div>
      <div className="relative aspect-video lg:aspect-square overflow-hidden">
        
        <ImageWithFallback
          src={image}
          alt="Global Skyline"
          className="w-full h-full object-cover opacity-60 hover:opacity-80 transition-opacity duration-700"
        />
      </div>
    </div>
  </section>
);
