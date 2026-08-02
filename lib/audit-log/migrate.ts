import { getStaffAuditRecords } from "@/lib/staff/audit";
import {
  getAuditLogRecords,
  normalizeAuditLogRecordList,
} from "@/lib/audit-log/storage";
import { AUDIT_LOG_STORAGE_KEY } from "@/lib/audit-log/constants";
import type { AuditLogRecord } from "@/types/audit-log";

export function migrateLegacyStaffAuditToSystemLog(): void {
  if (typeof window === "undefined") return;

  const existing = getAuditLogRecords();
  if (existing.length > 0) return;

  const legacyRecords = getStaffAuditRecords();
  if (legacyRecords.length === 0) return;

  const migrated: AuditLogRecord[] = legacyRecords
    .map((record) => ({
      id: record.id,
      timestamp: record.timestamp,
      userId: record.staffId,
      userName: record.staffName,
      role: record.role,
      branch: record.branch,
      action: record.action,
      module: record.module,
      newValues: record.detail ? { detail: record.detail } : undefined,
    }))
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));

  localStorage.setItem(
    AUDIT_LOG_STORAGE_KEY,
    JSON.stringify(normalizeAuditLogRecordList(migrated))
  );
}
