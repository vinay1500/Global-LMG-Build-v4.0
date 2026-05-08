import React from 'react';
import { Shield, BarChart3, Globe2, Scale, Building2, Landmark } from 'lucide-react';
import { ImageWithFallback } from './shared/ImageWithFallback';
import { HOME_EXPERTISE_CONTENT } from '../content/site/home';

const PRACTICE_ICON_MAP = {
  'bar-chart': BarChart3,
  building: Building2,
  globe: Globe2,
  landmark: Landmark,
  scale: Scale,
  shield: Shield,
};

export const ExpertiseGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200 border border-gray-200">
      {HOME_EXPERTISE_CONTENT.practices.map((practice) => {
        const Icon = PRACTICE_ICON_MAP[practice.iconKey];

        return (
          <div
            key={practice.name}
            className="bg-white p-12 hover:bg-gray-50 transition-colors group cursor-pointer"
          >
            <Icon
              className="mb-6 text-gray-400 group-hover:text-black transition-colors"
              size={32}
              strokeWidth={1.5}
            />
            <h4 className="text-xl font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
              {practice.name}
            </h4>
            <p className="mt-4 text-sm text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
              {HOME_EXPERTISE_CONTENT.practiceHoverPrefix} {practice.name.toLowerCase()} capabilities.
            </p>
          </div>
        );
      })}
    </div>
  );
};

export const Expertise = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <h2 className="text-5xl mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
            {HOME_EXPERTISE_CONTENT.title}
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl font-light">
            {HOME_EXPERTISE_CONTENT.body}
          </p>
        </div>
        <ExpertiseGrid />
      </div>
      <GlobalReach image={HOME_EXPERTISE_CONTENT.globalReach.image} />
    </section>
  );
};

export const GlobalReach = ({ image }: { image: string }) => (
  <section className="bg-black text-white py-24">
    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      <div className="space-y-8">
        <h2 className="text-5xl" style={{ fontFamily: "'Playfair Display', serif" }}>
          {HOME_EXPERTISE_CONTENT.globalReach.title}
        </h2>
        <p className="text-xl text-gray-400 font-light leading-relaxed">
          {HOME_EXPERTISE_CONTENT.globalReach.body}
        </p>
        <button className="text-white border-b border-white pb-1 font-semibold hover:opacity-70 transition-opacity">
          {HOME_EXPERTISE_CONTENT.globalReach.ctaLabel}
        </button>
      </div>
      <div className="relative aspect-video lg:aspect-square overflow-hidden">
        
        <ImageWithFallback
          src={image}
          alt={HOME_EXPERTISE_CONTENT.globalReach.imageAlt}
          className="w-full h-full object-cover opacity-60 hover:opacity-80 transition-opacity duration-700"
        />
      </div>
    </div>
  </section>
);
