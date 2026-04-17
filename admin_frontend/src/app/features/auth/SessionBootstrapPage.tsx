import React from 'react';

export const SessionBootstrapPage = () => {
  return (
    <div className="min-h-screen bg-[#FCFBF8] text-[#2C2B29] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#E6E4DD] border-t-[#C19A5B] animate-spin mx-auto" />
        <p className="mt-4 text-sm text-[#8C8981]">Restoring admin session...</p>
      </div>
    </div>
  );
};
