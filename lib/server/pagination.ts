const DEFAULT_LIST_LIMIT = 500;
const MAX_LIST_LIMIT = 2000;

export interface ParsedPagination {
  take: number;
  skip: number;
}

export function parsePagination(
  searchParams: URLSearchParams,
  options?: { defaultLimit?: number; maxLimit?: number }
): ParsedPagination {
  const defaultLimit = options?.defaultLimit ?? DEFAULT_LIST_LIMIT;
  const maxLimit = options?.maxLimit ?? MAX_LIST_LIMIT;

  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");

  let take = defaultLimit;
  if (limitRaw !== null && limitRaw.trim() !== "") {
    const parsed = Number(limitRaw);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error("limit must be a positive integer.");
    }
    take = Math.min(parsed, maxLimit);
  }

  let skip = 0;
  if (offsetRaw !== null && offsetRaw.trim() !== "") {
    const parsed = Number(offsetRaw);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error("offset must be a non-negative integer.");
    }
    skip = parsed;
  }

  return { take, skip };
}
