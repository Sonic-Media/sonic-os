import { DAY_CLOSINGS_STORAGE_KEY } from "@/lib/constants";
import { normalizeBranchCode } from "@/lib/branch-storage";
import type { Branch } from "@/types";
import type { DayClosingRecord, DayClosingStatus } from "@/types/day-closing";

function normalizeStatus(value: unknown): DayClosingStatus {
  return value === "closed" ? "closed" : "open";
}

function normalizeDayClosingRecord(value: unknown): DayClosingRecord | null {
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

export function getDayClosings(): DayClosingRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(DAY_CLOSINGS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeDayClosingRecord)
      .filter((record): record is DayClosingRecord => record !== null);
  } catch {
    return [];
  }
}

export function saveDayClosings(records: DayClosingRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAY_CLOSINGS_STORAGE_KEY, JSON.stringify(records));
}

export function getClosedDayRecord(
  branch: Branch,
  date: string,
  records: DayClosingRecord[] = getDayClosings()
): DayClosingRecord | undefined {
  return records.find(
    (record) =>
      record.branch === branch &&
      record.date === date &&
      record.status === "closed"
  );
}

export function isBranchDayClosed(
  branch: Branch,
  date: string,
  records: DayClosingRecord[] = getDayClosings()
): boolean {
  return !!getClosedDayRecord(branch, date, records);
}

export function upsertDayClosingRecord(record: DayClosingRecord): DayClosingRecord[] {
  const next = [
    record,
    ...getDayClosings().filter((item) => item.id !== record.id),
  ];
  saveDayClosings(next);
  return next;
}

export const DAY_CLOSED_EDIT_MESSAGE =
  "This branch day is closed. Owner or CEO must reopen before editing today's records.";
