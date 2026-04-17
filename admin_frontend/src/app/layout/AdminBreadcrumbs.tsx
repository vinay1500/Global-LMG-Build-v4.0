import React from 'react';
import { ChevronRight, Columns3, Home } from 'lucide-react';
import { useLocation } from 'react-router';
import { ADMIN_NAV_ITEMS } from '../config/navigation';

type AdminBreadcrumbsProps = {
  onToggleContextPanel: () => void;
  rightPanelOpen: boolean;
};

export const AdminBreadcrumbs: React.FC<AdminBreadcrumbsProps> = ({
  onToggleContextPanel,
  rightPanelOpen,
}) => {
  const location = useLocation();

  const activeItem =
    ADMIN_NAV_ITEMS.find((item) => location.pathname === item.path) ||
    ADMIN_NAV_ITEMS.find((item) => location.pathname.startsWith(`${item.path}/`));

  const label = location.pathname.includes('/clients/')
    ? 'Client Details'
    : location.pathname.includes('/matters/')
      ? 'Matter Details'
      : activeItem?.label || 'Dashboard';

  return (
    <div className="h-12 bg-[#FCFBF8] border-b border-[#E6E4DD] flex items-center justify-between px-4 sm:px-6 lg:px-8 hidden md:flex">
      <div className="flex items-center gap-2 text-sm text-[#8C8981]">
        <Home className="w-3.5 h-3.5" />
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-medium text-[#2C2B29]">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className={`p-1.5 rounded-md transition ${
            rightPanelOpen
              ? 'bg-[#E6E4DD] text-[#2C2B29]'
              : 'text-[#8C8981] hover:text-[#2C2B29] hover:bg-[#E6E4DD]/50'
          }`}
          onClick={onToggleContextPanel}
          title="Toggle Context Panel"
          type="button"
        >
          <Columns3 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
