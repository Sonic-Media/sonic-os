import { BRANCHES } from "@/lib/constants";
import { formatEntryTime, isInPeriod } from "@/lib/dates";
import { parseAmount } from "@/lib/amounts";
import { createDefaultExpenses, prepareExpensesForSave } from "@/lib/expenses";
import type {
  Branch,
  BranchEntryStatus,
  BranchProgress,
  Entry,
  EntryFormData,
  EntryStatus,
  HistoryBranchFilter,
  HistorySortOrder,
  ReportPeriod,
} from "@/types";

export function entryToForm(entry: Entry): EntryFormData {
  return {
    date: entry.date,
    branch: entry.branch,
    sales: String(entry.sales),
    expenses: entry.expenses.length ? entry.expenses : createDefaultExpenses(),
    staffName: entry.staffName,
    notes: entry.notes,
  };
}

export function formToEntry(
  form: EntryFormData,
  options?: {
    id?: string;
    status?: EntryStatus;
    existing?: Entry;
  }
): Entry {
  const now = new Date();
  const existing = options?.existing;

  return {
    id: options?.id ?? existing?.id ?? crypto.randomUUID(),
    date: form.date,
    time: existing?.time ?? formatEntryTime(now),
    timestamp: existing?.timestamp ?? Math.floor(now.getTime() / 1000),
    branch: form.branch,
    sales: parseAmount(form.sales),
    expenses: prepareExpensesForSave(form.expenses),
    staffName: form.staffName.trim(),
    notes: form.notes.trim(),
    createdAt: existing?.createdAt ?? now.toISOString(),
    status: options?.status ?? existing?.status ?? "draft",
  };
}

function isCompletedEntry(entry: Entry): boolean {
  return entry.status === "completed";
}

export function filterCompletedEntries(entries: Entry[]): Entry[] {
  return entries.filter(isCompletedEntry);
}

export function findCompletedEntryForBranchDate(
  entries: Entry[],
  branch: Branch,
  date: string,
  excludeId?: string
): Entry | undefined {
  return entries.find(
    (entry) =>
      entry.status === "completed" &&
      entry.branch === branch &&
      entry.date === date &&
      entry.id !== excludeId
  );
}

export function findDraftForBranchDate(
  entries: Entry[],
  branch: Branch,
  date: string
): Entry | undefined {
  return findMostRecentEntryForDate(entries, date, "draft", branch);
}

export function findMostRecentEntryForDate(
  entries: Entry[],
  date: string,
  status: EntryStatus,
  branch?: Branch
): Entry | undefined {
  return entries
    .filter(
      (entry) =>
        entry.status === status &&
        entry.date === date &&
        (branch === undefined || entry.branch === branch)
    )
    .sort((a, b) => b.timestamp - a.timestamp)[0];
}

export function getBranchEntryHref(item: BranchProgress): string {
  if (item.status === "completed" && item.entryId) {
    return `/entry/${item.entryId}`;
  }
  if (item.status === "draft" && item.entryId) {
    return `/entry/${item.entryId}/edit`;
  }
  return `/entry/new?branch=${item.branch}`;
}

export function getTodayBranchProgress(
  entries: Entry[],
  date: string
): BranchProgress[] {
  return BRANCHES.map(({ id, name }) => {
    const draft = findDraftForBranchDate(entries, id, date);
    const completed = findCompletedEntryForBranchDate(entries, id, date);
    const status: BranchEntryStatus = completed
      ? "completed"
      : draft
        ? "draft"
        : "pending";

    return {
      branch: id,
      name,
      status,
      completed: status === "completed",
      entryId: (completed ?? draft)?.id,
    };
  });
}

export function filterEntriesByPeriod(
  entries: Entry[],
  period: ReportPeriod,
  ref = new Date()
): Entry[] {
  return entries.filter((e) => isInPeriod(e.date, period, ref));
}

export function filterEntriesByDate(entries: Entry[], date: string): Entry[] {
  return entries.filter((e) => e.date === date);
}

function filterEntriesByBranch(entries: Entry[], branch: Branch): Entry[] {
  return entries.filter((e) => e.branch === branch);
}

export function sortEntries(
  entries: Entry[],
  order: HistorySortOrder
): Entry[] {
  const sorted = [...entries].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.timestamp - a.timestamp;
  });
  return order === "newest" ? sorted : sorted.reverse();
}

export function filterHistoryEntries(
  entries: Entry[],
  options: { date?: string; branch?: HistoryBranchFilter }
): Entry[] {
  let result = entries;
  if (options.date) {
    result = filterEntriesByDate(result, options.date);
  }
  if (options.branch && options.branch !== "all") {
    result = filterEntriesByBranch(result, options.branch);
  }
  return result;
}

export function getBranchName(branch: Branch): string {
  return BRANCHES.find((b) => b.id === branch)?.name ?? branch;
}

export function parseBranch(value: string | null): Branch {
  return value === "kansanga" ? "kansanga" : "salaama";
}
