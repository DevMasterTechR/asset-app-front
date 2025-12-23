import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  return (
    <div className={`flex items-center gap-4 ${className}`.trim()}>
      <Button 
        variant="ghost" 
        size="sm"
        disabled={page <= 1} 
        onClick={() => onPageChange(page - 1)}
        className="h-6 w-6 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {onLimitChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Por página:</span>
          <select 
            value={String(limit)} 
            onChange={(e) => onLimitChange(Number(e.target.value))} 
            className="h-8 px-2 border rounded bg-background text-sm"
          >
            {limits.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      )}
      
      <Button 
        variant="ghost" 
        size="sm"
        disabled={page >= totalPages} 
        onClick={() => onPageChange(page + 1)}
        className="h-6 w-6 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
