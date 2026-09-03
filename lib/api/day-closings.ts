import { apiGet, apiPost } from "@/lib/api/client";
import type { AuditLogRecord } from "@/types/audit-log";
import type { DayClosingRecord } from "@/types/day-closing";

export interface OpenWithShiftResult {
  dayClosing: DayClosingRecord;
  attendance: AuditLogRecord;
}

export async function fetchDayClosings(): Promise<DayClosingRecord[]> {
  return apiGet<DayClosingRecord[]>("/api/day-closings");
}

export async function closeDayApi(
  input: Omit<DayClosingRecord, "id" | "createdAt" | "updatedAt" | "status"> & {
    status?: DayClosingRecord["status"];
  }
): Promise<DayClosingRecord> {
  return apiPost<DayClosingRecord>("/api/day-closings", input);
}

export async function reopenDayApi(input: {
  branch: DayClosingRecord["branch"];
  date: string;
  reopenedBy?: string;
  reopenedByName?: string;
}): Promise<DayClosingRecord> {
  return apiPost<DayClosingRecord>("/api/day-closings", {
    ...input,
    action: "reopen",
  });
}

export async function openDayApi(input: {
  branch: DayClosingRecord["branch"];
  date: string;
  openedBy?: string;
  openedByName?: string;
}): Promise<DayClosingRecord> {
  return apiPost<DayClosingRecord>("/api/day-closings", {
    ...input,
    action: "open",
  });
}

export async function openWithShiftApi(input: {
  branch: DayClosingRecord["branch"];
  date: string;
  openedBy?: string;
  openedByName?: string;
}): Promise<OpenWithShiftResult> {
  return apiPost<OpenWithShiftResult>("/api/day-closings", {
    ...input,
    action: "open-with-shift",
  });
}
