import { apiGet, apiPost } from "@/lib/api/client";
import type { AuditLogRecord } from "@/types/audit-log";

export async function fetchStaffAttendance(
  date: string
): Promise<AuditLogRecord[]> {
  const params = new URLSearchParams({ date });
  return apiGet<AuditLogRecord[]>(`/api/staff/me/attendance?${params}`);
}

export async function clockInApi(input: {
  branch: string;
  date?: string;
}): Promise<AuditLogRecord> {
  return apiPost<AuditLogRecord>("/api/staff/attendance", {
    ...input,
    action: "clock-in",
  });
}

export async function clockOutApi(input: {
  branch: string;
  date?: string;
}): Promise<AuditLogRecord> {
  return apiPost<AuditLogRecord>("/api/staff/attendance", {
    ...input,
    action: "clock-out",
  });
}

export type BranchStaffOnShiftMember = {
  staffId: string;
  staffName: string;
};

export async function fetchBranchStaffOnShift(input: {
  branch: string;
  date: string;
}): Promise<BranchStaffOnShiftMember[]> {
  const params = new URLSearchParams({
    branch: input.branch,
    date: input.date,
  });
  return apiGet<BranchStaffOnShiftMember[]>(
    `/api/staff/attendance/on-shift?${params}`
  );
}
