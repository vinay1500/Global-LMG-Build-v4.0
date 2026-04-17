import React from 'react';
import { Bell, Menu, Plus, Scale, Search, Shield, X } from 'lucide-react';
import type { AdminSessionUser } from '../lib/api/contracts';

type AdminTopbarProps = {
  currentUser: AdminSessionUser | null;
  onOpenSearch: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
};

export const AdminTopbar: React.FC<AdminTopbarProps> = ({
  currentUser,
  onOpenSearch,
  onToggleSidebar,
  sidebarOpen,
}) => {
  const initials = currentUser?.displayName?.slice(0, 1)?.toUpperCase() || 'A';

  return (
    <header className="sticky top-0 z-30 bg-[#F4F1EA] border-b border-[#E6E4DD] h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          className="lg:hidden p-2 -ml-2 text-[#8C8981] hover:text-[#2C2B29] hover:bg-[#E6E4DD] rounded-lg transition"
          onClick={onToggleSidebar}
          type="button"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2C2B29] rounded flex items-center justify-center shadow-sm">
            <Scale className="w-4.5 h-4.5 text-[#C19A5B]" />
          </div>
          <span
            className="font-bold text-xl tracking-tight text-[#2C2B29]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            LegalConnect
          </span>
          <span className="hidden sm:inline-block ml-2 px-2 py-0.5 bg-[#E6E4DD] text-[#4A4946] text-[10px] font-bold uppercase tracking-widest rounded">
            Admin
          </span>
        </div>
      </div>

      <div className="flex-1 max-w-xl mx-8 hidden md:block">
        <button className="relative w-full flex items-center text-left" onClick={onOpenSearch} type="button">
          <Search className="w-4 h-4 text-[#8C8981] absolute left-3 top-1/2 -translate-y-1/2" />
          <div className="pl-9 pr-4 py-2 text-sm bg-white border border-[#E6E4DD] rounded-lg w-full text-[#A8A69F] hover:border-[#C19A5B] transition-colors cursor-text shadow-sm">
            Global search clients, matters, documents...
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <span className="text-[10px] text-[#A8A69F] border border-[#E6E4DD] rounded px-1.5 py-0.5 bg-[#FCFBF8]">
              ⌘K
            </span>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <button
          className="md:hidden p-2 text-[#8C8981] hover:text-[#2C2B29] hover:bg-[#E6E4DD] rounded-full transition"
          onClick={onOpenSearch}
          type="button"
        >
          <Search className="w-5 h-5" />
        </button>
        <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#2C2B29] bg-white border border-[#E6E4DD] rounded-lg hover:bg-[#FCFBF8] transition shadow-sm">
          <Plus className="w-4 h-4" /> New Action
        </button>
        <div className="h-6 w-px bg-[#E6E4DD] hidden sm:block" />
        <button className="p-2 text-[#8C8981] hover:text-[#2C2B29] hover:bg-[#E6E4DD] rounded-full transition relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C19A5B] rounded-full border-2 border-[#F4F1EA]" />
        </button>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-[#2C2B29]">
              {currentUser?.displayName || 'Admin User'}
            </p>
            <p className="text-[11px] text-[#8C8981]">{currentUser?.email || 'Session bootstrap pending'}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#2C2B29] flex items-center justify-center text-[#F4F1EA] shadow-sm">
            {currentUser ? initials : <Shield className="w-4 h-4" />}
          </div>
        </div>
      </div>
    </header>
  );
};
