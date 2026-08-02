import { AUDIT_LOG_UPDATED_EVENT } from "@/lib/audit-log/constants";
import { appendAuditLogRecord } from "@/lib/audit-log/storage";
import { getSession } from "@/lib/auth-storage";
import { resolveStaffFromSession } from "@/lib/staff/audit";
import type { AuditLogInput, AuditLogRecord } from "@/types/audit-log";
import type { Branch } from "@/types";

function notifyAuditLogUpdated(record: AuditLogRecord): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(AUDIT_LOG_UPDATED_EVENT, { detail: record })
  );
}

export function recordAuditEntry(input: AuditLogInput): AuditLogRecord | null {
  const session = getSession();
  const linkedStaff = resolveStaffFromSession();

  const userId = input.userId ?? linkedStaff?.id ?? session?.userId;
  const userName =
    input.userName ?? linkedStaff?.name ?? session?.displayName;
  const role = input.role ?? linkedStaff?.role ?? session?.role;
  const branch = (input.branch ??
    linkedStaff?.branch ??
    session?.branch) as Branch | undefined;

  if (!userId || !userName || !role || !branch) {
    return null;
  }

  const record: AuditLogRecord = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userId,
    userName,
    role,
    branch,
    action: input.action,
    module: input.module,
    recordId: input.recordId,
    oldValues: input.oldValues,
    newValues: input.newValues,
  };

  appendAuditLogRecord(record);
  notifyAuditLogUpdated(record);
  return record;
}
