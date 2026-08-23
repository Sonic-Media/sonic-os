import { apiGet } from "@/lib/api/client";
import type { AuditLogRecord } from "@/types/audit-log";

export async function fetchStaffAttendance(
  date: string
): Promise<AuditLogRecord[]> {
  const params = new URLSearchParams({ date });
  return apiGet<AuditLogRecord[]>(`/api/staff/me/attendance?${params}`);
}
