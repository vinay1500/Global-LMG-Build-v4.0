import React from 'react';
import type { PaginationMeta } from '../../lib/api/contracts';

interface PaginationControlsProps {
  isLoading?: boolean;
  onOffsetChange: (offset: number) => void;
  pagination?: PaginationMeta;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  isLoading = false,
  onOffsetChange,
  pagination,
}) => {
  if (!pagination || pagination.total <= pagination.limit) {
    return null;
  }

  const start = pagination.total === 0 ? 0 : pagination.offset + 1;
  const end = Math.min(pagination.offset + pagination.limit, pagination.total);
  const previousOffset = Math.max(0, pagination.offset - pagination.limit);
  const nextOffset = pagination.offset + pagination.limit;

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-[#E6E4DD] bg-white px-4 py-3 text-sm text-[#5E5A52] sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {start}-{end} of {pagination.total}
      </span>
      <div className="flex items-center gap-2">
        <button
          className="rounded-md border border-[#D8D3C7] px-3 py-2 font-medium text-[#2C2B29] transition hover:bg-[#F4F1EA] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading || pagination.offset === 0}
          onClick={() => onOffsetChange(previousOffset)}
          type="button"
        >
          Previous
        </button>
        <button
          className="rounded-md border border-[#D8D3C7] px-3 py-2 font-medium text-[#2C2B29] transition hover:bg-[#F4F1EA] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading || !pagination.hasMore}
          onClick={() => onOffsetChange(nextOffset)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
};
