import { defineConfig, loadEnv, type Plugin } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { buildRobotsTxt, buildSitemapXml } from './src/app/seo/sitemap';

const SECURITY_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

const createSeoAssetPlugin = (publicSiteUrl: string): Plugin => ({
  name: 'global-lmg-seo-assets',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'robots.txt',
      source: buildRobotsTxt(publicSiteUrl),
    });
    this.emitFile({
      type: 'asset',
      fileName: 'sitemap.xml',
      source: buildSitemapXml(publicSiteUrl),
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const publicSiteUrl = env.VITE_PUBLIC_SITE_URL || 'https://www.globallmg.org';

  return {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }

            if (id.includes('jspdf')) {
              return 'pdf';
            }

            if (id.includes('/react-dom/') || id.includes('/react/')) {
              return 'react-core';
            }

            if (id.includes('react-slick') || id.includes('slick-carousel')) {
              return 'carousel';
            }

            if (id.includes('@radix-ui') || id.includes('cmdk')) {
              return 'ui-kit';
            }

            if (id.includes('motion')) {
              return 'motion';
            }

            if (id.includes('lucide-react')) {
              return 'icons';
            }

            if (id.includes('react-router')) {
              return 'router';
            }

            return undefined;
          },
        },
      },
    },
    plugins: [
      react({ fastRefresh: false }),
      tailwindcss(),
      createSeoAssetPlugin(publicSiteUrl),
    ],
    preview: {
      headers: SECURITY_HEADERS,
    },
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      headers: SECURITY_HEADERS,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
  };
});
