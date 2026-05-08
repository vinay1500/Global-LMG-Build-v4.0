import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';

export const AccessDeniedPage = () => {
  return (
    <div className="min-h-screen bg-[#FCFBF8] text-[#2C2B29] flex items-center justify-center px-6">
      <div className="w-full max-w-xl bg-white border border-[#E6E4DD] rounded-2xl shadow-xl p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-[#FDE8EC] text-[#d4183d] mx-auto flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-2xl mt-5" style={{ fontFamily: "'Playfair Display', serif" }}>
          Access Restricted
        </h1>
        <p className="text-sm text-[#8C8981] mt-2">
          Your admin role does not include permission for this workspace. Ask an ops admin to adjust
          your role in Settings, or return to a section available to your account.
        </p>
        <Link
          className="inline-flex mt-6 px-4 py-2 rounded-lg bg-[#2C2B29] text-white text-sm font-medium hover:bg-[#4A4946] transition"
          to="/login"
        >
          Return to sign in
        </Link>
      </div>
    </div>
  );
};
