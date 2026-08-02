"use client";

import { Button } from "@/components/shared/ui/button";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function TablePagination({
  page,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPrevious,
  onNext,
}: TablePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between border-t border-zinc-800/80 px-5 py-3 text-sm text-zinc-400">
      <span>
        Showing {startIndex.toLocaleString("en-UG")}–{endIndex.toLocaleString("en-UG")} of{" "}
        {totalItems.toLocaleString("en-UG")}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          className="h-9 px-3"
          onClick={onPrevious}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <span className="tabular-nums text-zinc-500">
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="ghost"
          className="h-9 px-3"
          onClick={onNext}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
