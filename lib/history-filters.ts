import { calculateExpenses } from "@/lib/amounts";
import { filterEntriesByStaff } from "@/lib/staff-reports";
import type {
  Entry,
  HistoryFilterCriteria,
} from "@/types";

type HistoryEntryFilter = (
  entries: Entry[],
  criteria: HistoryFilterCriteria
) => Entry[];

function filterByDate(
  entries: Entry[],
  criteria: HistoryFilterCriteria
): Entry[] {
  if (!criteria.date) return entries;
  return entries.filter((entry) => entry.date === criteria.date);
}

function filterByBranch(
  entries: Entry[],
  criteria: HistoryFilterCriteria
): Entry[] {
  if (!criteria.branch || criteria.branch === "all") return entries;
  return entries.filter((entry) => entry.branch === criteria.branch);
}

function filterByStaff(
  entries: Entry[],
  criteria: HistoryFilterCriteria
): Entry[] {
  if (!criteria.staff || criteria.staff === "all") return entries;
  return filterEntriesByStaff(entries, criteria.staff);
}

function filterByStatus(
  entries: Entry[],
  criteria: HistoryFilterCriteria
): Entry[] {
  if (!criteria.status || criteria.status === "all") return entries;
  return entries.filter((entry) => entry.status === criteria.status);
}

function filterBySearch(
  entries: Entry[],
  criteria: HistoryFilterCriteria
): Entry[] {
  const query = criteria.search?.trim().toLowerCase();
  if (!query) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.notes,
      entry.staffName,
      entry.sales.toString(),
      calculateExpenses(entry).toString(),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function filterByAmountRange(
  entries: Entry[],
  criteria: HistoryFilterCriteria
): Entry[] {
  const { minSales, maxSales, minExpenses, maxExpenses } = criteria;
  const hasSalesRange = minSales !== undefined || maxSales !== undefined;
  const hasExpenseRange = minExpenses !== undefined || maxExpenses !== undefined;

  if (!hasSalesRange && !hasExpenseRange) return entries;

  return entries.filter((entry) => {
    const expenses = calculateExpenses(entry);

    if (hasSalesRange) {
      if (minSales !== undefined && entry.sales < minSales) return false;
      if (maxSales !== undefined && entry.sales > maxSales) return false;
    }

    if (hasExpenseRange) {
      if (minExpenses !== undefined && expenses < minExpenses) return false;
      if (maxExpenses !== undefined && expenses > maxExpenses) return false;
    }

    return true;
  });
}

const HISTORY_ENTRY_FILTERS: HistoryEntryFilter[] = [
  filterByDate,
  filterByBranch,
  filterByStaff,
  filterByStatus,
  filterBySearch,
  filterByAmountRange,
];

export function applyHistoryFilters(
  entries: Entry[],
  criteria: HistoryFilterCriteria
): Entry[] {
  return HISTORY_ENTRY_FILTERS.reduce(
    (result, filter) => filter(result, criteria),
    entries
  );
}

export function createDefaultHistoryFilterCriteria(): HistoryFilterCriteria {
  return {
    branch: "all",
    staff: "all",
    status: "all",
  };
}
