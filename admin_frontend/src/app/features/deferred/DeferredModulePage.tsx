import React from 'react';
import { Clock3 } from 'lucide-react';

type DeferredModulePageProps = {
  description: string;
  title: string;
};

export const DeferredModulePage: React.FC<DeferredModulePageProps> = ({
  description,
  title,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 bg-[#F4F1EA] rounded-full flex items-center justify-center mb-4 border border-[#E6E4DD]">
        <Clock3 className="w-8 h-8 text-[#A8A69F]" />
      </div>
      <h2 className="text-xl font-medium text-[#2C2B29] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
        {title}
      </h2>
      <p className="text-sm text-[#8C8981] max-w-xl">{description}</p>
    </div>
  );
};
