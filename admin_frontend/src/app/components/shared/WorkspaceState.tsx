import React from 'react';

type WorkspaceStateProps = {
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  title: string;
};

export const WorkspaceState: React.FC<WorkspaceStateProps> = ({
  actionLabel,
  description,
  onAction,
  title,
}) => {
  return (
    <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm p-8">
      <div className="max-w-xl">
        <p className="text-xs uppercase tracking-[0.24em] text-[#8C8981] font-semibold mb-3">Admin Workspace</p>
        <h2
          className="text-2xl text-[#2C2B29] mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {title}
        </h2>
        <p className="text-sm text-[#5A7C96]">{description}</p>
        {actionLabel && onAction ? (
          <button
            className="mt-5 px-4 py-2 text-sm font-medium bg-[#2C2B29] text-white rounded-lg hover:bg-[#4A4946] transition"
            onClick={onAction}
            type="button"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
};
