import { AUDIT_LOG_STORAGE_KEY, MAX_AUDIT_LOG_RECORDS } from "@/lib/audit-log/constants";
import { normalizeBranchCode } from "@/lib/branch-storage";
import type { AuditLogRecord } from "@/types/audit-log";
import type { AuditModule } from "@/types/audit-log";

function normalizeOptionalObject(
  value: unknown
): Record<string, unknown> | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

export function normalizeAuditLogRecord(value: unknown): AuditLogRecord | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const timestamp = typeof raw.timestamp === "string" ? raw.timestamp.trim() : "";
  const userId = typeof raw.userId === "string" ? raw.userId.trim() : "";
  const userName = typeof raw.userName === "string" ? raw.userName.trim() : "";
  const role = typeof raw.role === "string" ? raw.role.trim() : "";
  const branch = typeof raw.branch === "string" ? raw.branch.trim() : "";
  const action = typeof raw.action === "string" ? raw.action.trim() : "";
  const module = typeof raw.module === "string" ? raw.module.trim() : "";

  if (!id || !timestamp || !userId || !userName || !role || !branch || !action || !module) {
    return null;
  }

  const recordId =
    typeof raw.recordId === "string" && raw.recordId.trim()
      ? raw.recordId.trim()
      : undefined;

  return {
    id,
    timestamp,
    userId,
    userName,
    role,
    branch: normalizeBranchCode(branch),
    action,
    module: module as AuditModule,
    recordId,
    oldValues: normalizeOptionalObject(raw.oldValues),
    newValues: normalizeOptionalObject(raw.newValues),
  };
}

export function normalizeAuditLogRecordList(value: unknown): AuditLogRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeAuditLogRecord)
    .filter((record): record is AuditLogRecord => record !== null);
}

export function getAuditLogRecords(): AuditLogRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    if (!raw) return [];
    return normalizeAuditLogRecordList(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function appendAuditLogRecord(record: AuditLogRecord): void {
  if (typeof window === "undefined") return;

  const next = [record, ...getAuditLogRecords()].slice(0, MAX_AUDIT_LOG_RECORDS);
  localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(next));
}
