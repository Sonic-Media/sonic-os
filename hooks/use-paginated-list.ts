"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  paginateItems,
  type PaginatedSlice,
} from "@/lib/pagination";

export function usePaginatedList<T>(
  items: T[],
  pageSize = DEFAULT_TABLE_PAGE_SIZE
): PaginatedSlice<T> & {
  setPage: (page: number) => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
} {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [items, pageSize]);

  const slice = useMemo(
    () => paginateItems(items, page, pageSize),
    [items, page, pageSize]
  );

  useEffect(() => {
    if (page !== slice.page) {
      setPage(slice.page);
    }
  }, [page, slice.page]);

  return {
    ...slice,
    setPage,
    goToPreviousPage: () => setPage((current) => Math.max(1, current - 1)),
    goToNextPage: () =>
      setPage((current) => Math.min(slice.totalPages, current + 1)),
  };
}
