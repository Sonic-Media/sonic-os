import { AUDIT_LOG_UPDATED_EVENT } from "@/lib/audit-log/constants";
import { createSystemAuditLogEntry } from "@/lib/api/system-audit-log";
import { getClientSession } from "@/lib/client/session-registry";
import type { AuditLogInput, AuditLogRecord } from "@/types/audit-log";
import type { Branch } from "@/types";

function notifyAuditLogUpdated(record: AuditLogRecord): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(AUDIT_LOG_UPDATED_EVENT, { detail: record })
  );
}

export function recordAuditEntry(input: AuditLogInput): AuditLogRecord | null {
  const session = getClientSession();

  const userId = input.userId ?? session?.userId;
  const userName = input.userName ?? session?.displayName;
  const role = input.role ?? session?.role;
  const branch = (input.branch ?? session?.branch) as Branch | undefined;

  if (!userId || !userName || !role || !branch) {
    return null;
  }

  const payload: AuditLogInput = {
    ...input,
    userId,
    userName,
    role,
    branch,
  };

  void createSystemAuditLogEntry(payload)
    .then((record) => {
      notifyAuditLogUpdated(record);
    })
    .catch((error) => {
      console.error("[audit-log] failed to persist entry:", error);
    });

  return {
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
}
