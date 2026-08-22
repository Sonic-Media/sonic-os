import { apiGet, apiPost } from "@/lib/api/client";
import type { AuditLogInput, AuditLogRecord } from "@/types/audit-log";

export async function fetchSystemAuditLog(): Promise<AuditLogRecord[]> {
  return apiGet<AuditLogRecord[]>("/api/system-audit-log");
}

export async function createSystemAuditLogEntry(
  input: AuditLogInput
): Promise<AuditLogRecord> {
  return apiPost<AuditLogRecord>("/api/system-audit-log", input);
}
