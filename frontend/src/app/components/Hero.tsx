import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { HOME_HERO_CONTENT } from '../content/site/home';
import { useAuth } from '../contexts/useAuth';
import { ImageWithFallback } from './shared/ImageWithFallback';

interface HeroProps {
  image: string;
}

export const Hero = ({ image }: HeroProps) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative h-[85vh] flex items-center overflow-hidden pt-20">
      <div className="absolute inset-0 z-0">
        
        <ImageWithFallback
          src={image}
          alt={HOME_HERO_CONTENT.alt}
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="sync"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full text-white">
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <h1
            className="text-5xl md:text-8xl mb-8 leading-[1.1] tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {HOME_HERO_CONTENT.titleLines.map((line) => (
              <React.Fragment key={line}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </h1>
          <p
            className="text-xl md:text-2xl mb-10 opacity-90 max-w-2xl font-light"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {HOME_HERO_CONTENT.body}
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/about')}
              className="px-8 py-4 bg-white text-black font-semibold rounded-none hover:bg-gray-100 transition-colors"
            >
              {isAuthenticated ? HOME_HERO_CONTENT.authenticatedCtaLabel : HOME_HERO_CONTENT.guestCtaLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
