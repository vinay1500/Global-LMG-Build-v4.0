import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initSentry, Sentry } from './lib/sentry';
import '../styles/index.css';

initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<div role="alert">Something went wrong.</div>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
