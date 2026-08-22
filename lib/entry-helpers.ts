import {
  formatEntryTime,
  getPreviousPeriodReference,
  getTodayISO,
  isInPeriod,
} from "@/lib/dates";
import { parseAmount } from "@/lib/amounts";
import { DEFAULT_BRANCH_CODE } from "@/lib/constants";
import { prepareExpensesForSave } from "@/lib/expenses";
import {
  legacyStaffFields,
  resolveCurrentStaffAction,
} from "@/lib/staff/session";
import type { StaffActionRecord } from "@/types/staff-session";
import type {
  Branch,
  BranchConfig,
  BranchEntryStatus,
  BranchProgress,
  Entry,
  EntryFormData,
  EntryStatus,
  HistorySortOrder,
  ReportPeriod,
} from "@/types";

export function entryToForm(entry: Entry): EntryFormData {
  const netCash = entry.sales - entry.expenses.reduce((sum, e) => sum + e.amount, 0);
  const allocation = entry.savingsAllocation ?? netCash;

  return {
    date: entry.date,
    branch: entry.branch,
    sales: String(entry.sales),
    expenses: entry.expenses.map((expense) => ({ ...expense })),
    staffId: entry.staffId ?? entry.createdBy?.staffId ?? "",
    notes: entry.notes,
    savingsAllocation: String(allocation),
  };
}

export function formToEntry(
  form: EntryFormData,
  options?: {
    id?: string;
    status?: EntryStatus;
    existing?: Entry;
    staffName?: string;
    createdBy?: StaffActionRecord;
  }
): Entry {
  const now = new Date();
  const existing = options?.existing;
  const createdBy =
    options?.createdBy ??
    existing?.createdBy ??
    resolveCurrentStaffAction(form.branch);
  const legacy = legacyStaffFields(createdBy);
  const staffId =
    legacy.staffId ?? existing?.staffId ?? (form.staffId || undefined);
  const staffName =
    options?.staffName?.trim() ??
    legacy.staffName ??
    existing?.staffName ??
    "";

  return {
    id: options?.id ?? existing?.id ?? crypto.randomUUID(),
    date: form.date,
    time: existing?.time ?? formatEntryTime(now),
    timestamp: existing?.timestamp ?? Math.floor(now.getTime() / 1000),
    branch: form.branch,
    sales: parseAmount(form.sales),
    expenses: prepareExpensesForSave(form.expenses),
    staffId,
    staffName: staffName || undefined,
    createdBy,
    notes: form.notes.trim(),
    savingsAllocation: parseAmount(form.savingsAllocation),
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

export function getBranchEntryHref(_item: BranchProgress): string {
  return "/operations/today";
}

export function getTodayBranchProgress(
  entries: Entry[],
  date: string,
  branches: BranchConfig[]
): BranchProgress[] {
  return branches.map(({ id, name }) => {
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

export function filterEntriesByPreviousPeriod(
  entries: Entry[],
  period: ReportPeriod,
  ref = new Date()
): Entry[] {
  return filterEntriesByPeriod(
    entries,
    period,
    getPreviousPeriodReference(ref, period)
  );
}

export function filterEntriesByDate(entries: Entry[], date: string): Entry[] {
  return entries.filter((e) => e.date === date);
}


export function duplicateEntryAsTodayDraft(source: Entry): Entry {
  const now = new Date();

  return {
    id: crypto.randomUUID(),
    date: getTodayISO(),
    time: formatEntryTime(now),
    timestamp: Math.floor(now.getTime() / 1000),
    branch: source.branch,
    sales: source.sales,
    expenses: source.expenses.map((expense) => ({
      ...expense,
      id: expense.id.startsWith("common-") ? expense.id : crypto.randomUUID(),
    })),
    staffId: source.staffId,
    staffName: source.staffName,
    notes: source.notes,
    createdAt: now.toISOString(),
    status: "draft",
  };
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


export function parseBranch(value: string | null): Branch {
  if (value === "main") return "main";
  return DEFAULT_BRANCH_CODE;
}
