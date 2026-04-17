import React from 'react';
import { Link } from 'react-router';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-[#FCFBF8] text-[#2C2B29] flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-[#8C8981] font-semibold">404</p>
        <h1 className="text-3xl mt-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          Page not found
        </h1>
        <p className="text-sm text-[#8C8981] mt-2">
          This admin route does not exist in the Phase 1 shell.
        </p>
        <Link
          className="inline-flex mt-6 px-4 py-2 rounded-lg bg-[#2C2B29] text-white text-sm font-medium hover:bg-[#4A4946] transition"
          to="/dashboard"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
};
