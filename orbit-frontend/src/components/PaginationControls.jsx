import React, { useMemo } from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const buildPageItems = (page, totalPages) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = new Set([1, 2, totalPages - 1, totalPages, page - 1, page, page + 1]);
  const sorted = Array.from(pages)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  const result = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) {
      result.push('ellipsis-' + value);
    }
    result.push(value);
  });

  return result;
};

export default function PaginationControls({
  page,
  totalPages,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowOptions = [10, 15, 20],
  className = '',
}) {
  const safeTotalPages = Math.max(1, Number(totalPages || 1));
  const safePage = Math.min(Math.max(1, Number(page || 1)), safeTotalPages);

  const pageItems = useMemo(() => buildPageItems(safePage, safeTotalPages), [safePage, safeTotalPages]);

  return (
    <div className={`mt-3 flex flex-wrap items-center justify-end gap-3 text-xs text-slate-300 ${className}`.trim()}>
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="whitespace-nowrap">Rows per page:</span>
        <Select value={String(rowsPerPage)} onValueChange={onRowsPerPageChange}>
          <SelectTrigger className="h-8 w-[90px] bg-slate-700 border-slate-600 text-white">
            <SelectValue placeholder="Rows" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-gray-300">
            {rowOptions.map((size) => (
              <SelectItem key={size} value={String(size)} className="text-white">
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 border-slate-600 text-white hover:bg-slate-700"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 border-slate-600 text-white hover:bg-slate-700"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pageItems.map((item) =>
          String(item).startsWith('ellipsis-') ? (
            <span key={item} className="px-2 text-slate-400">…</span>
          ) : (
            <Button
              key={item}
              size="sm"
              variant={Number(item) === safePage ? 'default' : 'outline'}
              className={
                Number(item) === safePage
                  ? 'h-8 min-w-8 bg-pink-500 text-white hover:bg-pink-600'
                  : 'h-8 min-w-8 border-slate-600 text-white hover:bg-slate-700'
              }
              onClick={() => onPageChange(Number(item))}
            >
              {item}
            </Button>
          )
        )}

        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 border-slate-600 text-white hover:bg-slate-700"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= safeTotalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 border-slate-600 text-white hover:bg-slate-700"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={safePage >= safeTotalPages}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
