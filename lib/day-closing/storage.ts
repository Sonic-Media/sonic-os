import { getActiveOpenDayRecord as resolveActiveOpenDayRecord } from "@/lib/day-closing/business-date";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import type { Branch } from "@/types";
import type { DayClosingRecord, DayClosingStatus } from "@/types/day-closing";

/**
 * UI-only cache mirrored from PostgreSQL via DayClosingProvider.
 * NEVER use this module for server-side authorization or mutation gates.
 * Server authority lives in lib/server/services/day-closings-service.ts.
 */
let uiDayClosingsCache: DayClosingRecord[] = [];

export function setDayClosingsCache(records: DayClosingRecord[]): void {
  uiDayClosingsCache = records;
}

/** @deprecated Prefer explicit records from DayClosingProvider. UI cache only. */
export function getDayClosings(): DayClosingRecord[] {
  return uiDayClosingsCache;
}

export function isUiDayClosingsCachePopulated(): boolean {
  return uiDayClosingsCache.length > 0;
}

function matchesBranch(recordBranch: Branch, branch: Branch): boolean {
  return branchCodesReferToSameInventory(recordBranch, branch);
}

function normalizeBranchCode(value: unknown): Branch {
  return typeof value === "string" && value.trim()
    ? (value.trim().toLowerCase() as Branch)
    : ("main" as Branch);
}

function normalizeStatus(value: unknown): DayClosingStatus {
  if (value === "closed") return "closed";
  if (value === "close_requested") return "close_requested";
  return "open";
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
  records: DayClosingRecord[] = uiDayClosingsCache
): DayClosingRecord | undefined {
  return records.find(
    (record) =>
      matchesBranch(record.branch, branch) &&
      record.date === date &&
      record.status === "closed"
  );
}

/** Earliest open business day for the branch (Close Day date source). */
export function getActiveOpenDayRecord(
  branch: Branch,
  records: DayClosingRecord[] = uiDayClosingsCache
): DayClosingRecord | undefined {
  return resolveActiveOpenDayRecord(branch, records);
}

export function getOpenDayRecord(
  branch: Branch,
  date: string,
  records: DayClosingRecord[] = uiDayClosingsCache
): DayClosingRecord | undefined {
  return records.find(
    (record) =>
      matchesBranch(record.branch, branch) &&
      record.date === date &&
      record.status === "open" &&
      !!(record.openedAt || record.reopenedAt)
  );
}

export function getCloseRequestedRecord(
  branch: Branch,
  date: string,
  records: DayClosingRecord[] = uiDayClosingsCache
): DayClosingRecord | undefined {
  return records.find(
    (record) =>
      matchesBranch(record.branch, branch) &&
      record.date === date &&
      record.status === "close_requested" &&
      !!(record.openedAt || record.reopenedAt)
  );
}

export function getCloseRequestedRecords(
  records: DayClosingRecord[] = uiDayClosingsCache
): DayClosingRecord[] {
  return records.filter(
    (record) =>
      record.status === "close_requested" &&
      !!(record.openedAt || record.reopenedAt)
  );
}

export function isCloseRequestPending(
  branch: Branch,
  date: string,
  records: DayClosingRecord[] = uiDayClosingsCache
): boolean {
  return !!getCloseRequestedRecord(branch, date, records);
}

/** UI hint only — server gates must query PostgreSQL. */
export function isBranchDayOpened(
  branch: Branch,
  date: string,
  records: DayClosingRecord[] = uiDayClosingsCache
): boolean {
  const record = getOpenDayRecord(branch, date, records);
  if (!record) return false;
  return !!(record.openedAt || record.reopenedAt);
}

/** UI hint only — server gates must query PostgreSQL. */
export function needsShopOpening(
  branch: Branch,
  date: string,
  records: DayClosingRecord[] = uiDayClosingsCache
): boolean {
  return (
    !isBranchDayClosed(branch, date, records) &&
    !isBranchDayOpened(branch, date, records)
  );
}

/** UI hint only — server gates must query PostgreSQL. */
export function canRecordTodaysActivity(
  branch: Branch,
  date: string,
  records: DayClosingRecord[] = uiDayClosingsCache
): boolean {
  if (isBranchDayClosed(branch, date, records)) {
    return false;
  }

  const activeRecord = resolveActiveOpenDayRecord(branch, records);
  return (
    !!activeRecord &&
    (activeRecord.status === "open" || activeRecord.status === "close_requested")
  );
}

/** UI hint only — server gates must query PostgreSQL. */
export function isBranchDayClosed(
  branch: Branch,
  date: string,
  records: DayClosingRecord[] = uiDayClosingsCache
): boolean {
  return !!getClosedDayRecord(branch, date, records);
}

export function upsertDayClosingRecord(
  record: DayClosingRecord,
  records: DayClosingRecord[] = uiDayClosingsCache
): DayClosingRecord[] {
  return [
    record,
    ...records.filter(
      (item) =>
        item.id !== record.id &&
        !(
          matchesBranch(item.branch, record.branch) && item.date === record.date
        )
    ),
  ];
}

export const DAY_CLOSED_EDIT_MESSAGE =
  "This branch day is closed. Owner or Branch Manager must reopen before editing today's records.";

export const SHOP_NOT_OPENED_MESSAGE =
  "Start today's shift before recording today's activity.";
