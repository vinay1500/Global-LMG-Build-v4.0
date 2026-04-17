import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, secondaryAction }) => {
  return (
    <div className="group flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in duration-700">
      <div className="relative mb-8 flex items-center justify-center">
        {/* Abstract geometric background */}
        <div className="absolute w-32 h-32 bg-[#F4F1EA] rounded-full opacity-60 mix-blend-multiply blur-xl group-hover:bg-[#E6E4DD] transition-colors duration-1000"></div>
        <div className="absolute w-24 h-24 bg-[#E6E4DD]/50 rounded-full rotate-45 transform transition-all duration-1000 group-hover:rotate-180 group-hover:scale-110"></div>
        <div className="absolute w-24 h-24 border border-[#C19A5B]/30 rounded-full scale-125 transition-transform duration-1000 group-hover:scale-150 group-hover:-rotate-90"></div>
        <div className="absolute w-32 h-32 border border-[#5A7C96]/20 rounded-full scale-150 -translate-x-2 translate-y-2 transition-transform duration-1000 group-hover:translate-x-2 group-hover:-translate-y-2 group-hover:scale-125"></div>
        
        {/* Foreground Icon Card */}
        <div className="relative z-10 w-16 h-16 bg-white border border-[#E6E4DD] rounded-2xl shadow-sm flex items-center justify-center transform -rotate-3 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
          <Icon className="w-8 h-8 text-[#C19A5B] transition-colors duration-500 group-hover:text-[#2C2B29]" strokeWidth={1.5} />
        </div>
      </div>
      
      <h3 className="text-2xl font-medium text-[#2C2B29] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>{title}</h3>
      <p className="text-sm text-[#8C8981] max-w-md mb-8 leading-relaxed">{description}</p>
      
      {(action || secondaryAction) && (
        <div className="flex items-center justify-center gap-4">
          {action && (
            <button onClick={action.onClick} className="px-6 py-2.5 bg-[#2C2B29] text-white rounded-lg shadow-sm text-sm font-medium hover:bg-[#4A4946] transition focus:outline-none focus:ring-2 focus:ring-[#C19A5B] focus:ring-offset-2">
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button onClick={secondaryAction.onClick} className="px-6 py-2.5 bg-white border border-[#E6E4DD] text-[#2C2B29] rounded-lg shadow-sm text-sm font-medium hover:bg-[#F4F1EA] transition focus:outline-none focus:ring-2 focus:ring-[#E6E4DD] focus:ring-offset-2">
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
