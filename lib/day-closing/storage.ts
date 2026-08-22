import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import type { Branch } from "@/types";
import type { DayClosingRecord, DayClosingStatus } from "@/types/day-closing";

function matchesBranch(recordBranch: Branch, branch: Branch): boolean {
  return branchCodesReferToSameInventory(recordBranch, branch);
}

let cachedClosings: DayClosingRecord[] = [];

export function setDayClosingsCache(records: DayClosingRecord[]): void {
  cachedClosings = records;
}

export function getDayClosings(): DayClosingRecord[] {
  return cachedClosings;
}

function normalizeBranchCode(value: unknown): Branch {
  return typeof value === "string" && value.trim()
    ? (value.trim().toLowerCase() as Branch)
    : ("main" as Branch);
}

function normalizeStatus(value: unknown): DayClosingStatus {
  return value === "closed" ? "closed" : "open";
}

export function normalizeDayClosingRecord(value: unknown): DayClosingRecord | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const date = typeof raw.date === "string" ? raw.date.trim() : "";
  const branch = normalizeBranchCode(raw.branch);
  const status = normalizeStatus(raw.status);
  const metrics = raw.metrics;
  const summary = raw.summary;

  if (!id || !date || !branch || !metrics || !summary) return null;

  return raw as unknown as DayClosingRecord;
}

export function getClosedDayRecord(
  branch: Branch,
  date: string,
  records: DayClosingRecord[] = cachedClosings
): DayClosingRecord | undefined {
  return records.find(
    (record) =>
      matchesBranch(record.branch, branch) &&
      record.date === date &&
      record.status === "closed"
  );
}

export function getOpenDayRecord(
  branch: Branch,
  date: string,
  records: DayClosingRecord[] = cachedClosings
): DayClosingRecord | undefined {
  return records.find(
    (record) =>
      matchesBranch(record.branch, branch) &&
      record.date === date &&
      record.status === "open"
  );
}

export function isBranchDayOpened(
  branch: Branch,
  date: string,
  records: DayClosingRecord[] = cachedClosings
): boolean {
  const record = getOpenDayRecord(branch, date, records);
  if (!record) return false;
  return !!(record.openedAt || record.reopenedAt);
}

export function needsShopOpening(
  branch: Branch,
  date: string,
  records: DayClosingRecord[] = cachedClosings
): boolean {
  return (
    !isBranchDayClosed(branch, date, records) &&
    !isBranchDayOpened(branch, date, records)
  );
}

export function canRecordTodaysActivity(
  branch: Branch,
  date: string,
  records: DayClosingRecord[] = cachedClosings
): boolean {
  return (
    isBranchDayOpened(branch, date, records) &&
    !isBranchDayClosed(branch, date, records)
  );
}

export function isBranchDayClosed(
  branch: Branch,
  date: string,
  records: DayClosingRecord[] = cachedClosings
): boolean {
  return !!getClosedDayRecord(branch, date, records);
}

export function upsertDayClosingRecord(
  record: DayClosingRecord,
  records: DayClosingRecord[] = cachedClosings
): DayClosingRecord[] {
  return [record, ...records.filter((item) => item.id !== record.id)];
}

export const DAY_CLOSED_EDIT_MESSAGE =
  "This branch day is closed. Owner or Branch Manager must reopen before editing today's records.";

export const SHOP_NOT_OPENED_MESSAGE =
  "Start today's shift before recording today's activity.";
