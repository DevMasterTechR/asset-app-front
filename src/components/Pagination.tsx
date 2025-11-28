import React from 'react';

export const DEFAULT_PAGE_SIZE = 5;

type Props = {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  limit: number;
  onLimitChange?: (l: number) => void;
  limits?: number[];
  className?: string;
};

export default function Pagination({ page, totalPages, onPageChange, limit, onLimitChange, limits = [5,10,15,20], className = '' }: Props) {
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className={`flex items-center justify-between ${className}`.trim()}>
      <div className="flex items-center gap-2">
        <button className="btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          ◀
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1 rounded ${p === page ? 'bg-primary text-white' : 'bg-muted/20'}`}
          >
            {p}
          </button>
        ))}
        <button className="btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          ▶
        </button>
      </div>

      {onLimitChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Por página:</span>
          <select value={String(limit)} onChange={(e) => onLimitChange(Number(e.target.value))} className="px-2 py-1 border rounded">
            {limits.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
