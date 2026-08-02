export const DEFAULT_TABLE_PAGE_SIZE = 50;

export interface PaginatedSlice<T> {
  pageItems: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize = DEFAULT_TABLE_PAGE_SIZE
): PaginatedSlice<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    pageItems: items.slice(startIndex, endIndex),
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    startIndex: totalItems === 0 ? 0 : startIndex + 1,
    endIndex,
  };
}
