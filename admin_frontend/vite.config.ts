import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const reactRoot = path.resolve(__dirname, './node_modules/react');
const reactDomRoot = path.resolve(__dirname, './node_modules/react-dom');

const SECURITY_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

export default defineConfig({
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  plugins: [react({ fastRefresh: false }), tailwindcss()],
  preview: {
    headers: SECURITY_HEADERS,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      react: reactRoot,
      'react-dom': reactDomRoot,
      'react/jsx-dev-runtime': path.resolve(reactRoot, './jsx-dev-runtime.js'),
      'react/jsx-runtime': path.resolve(reactRoot, './jsx-runtime.js'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    headers: SECURITY_HEADERS,
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
    },
  },
});
