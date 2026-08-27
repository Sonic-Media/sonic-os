import { recordAuditEntry } from "@/lib/audit-log/record";
import { AUDIT_LOG_UPDATED_EVENT } from "@/lib/audit-log/constants";
import { getClientSession } from "@/lib/client/session-registry";
import { fetchStaff } from "@/lib/api/staff";
import { getTodayISO } from "@/lib/dates";
import { migrateLegacyAuthRole } from "@/lib/staff/roles";
import type { Staff } from "@/types";
import type { AuditLogRecord } from "@/types/audit-log";
import type { StaffAuditInput, StaffAuditRecord } from "@/types/staff-audit";

let staffListCache: Staff[] = [];
let auditRecordCache: StaffAuditRecord[] = [];

export function setStaffAuditCache(records: StaffAuditRecord[]): void {
  auditRecordCache = records;
}

export function setStaffListCache(staff: Staff[]): void {
  staffListCache = staff;
}

function mapAuditLogToStaffAudit(record: AuditLogRecord): StaffAuditRecord {
  return {
    id: record.id,
    timestamp: record.timestamp,
    staffId: record.userId,
    staffName: record.userName,
    role: record.role as StaffAuditRecord["role"],
    branch: record.branch,
    action: record.action,
    module: record.module,
  };
}

export function syncStaffAuditCacheFromAuditLog(records: AuditLogRecord[]): void {
  auditRecordCache = records.map(mapAuditLogToStaffAudit);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUDIT_LOG_UPDATED_EVENT));
  }
}

export function mergeStaffAuditRecords(records: StaffAuditRecord[]): void {
  if (records.length === 0) return;

  const merged = new Map<string, StaffAuditRecord>();
  for (const record of auditRecordCache) {
    merged.set(record.id, record);
  }
  for (const record of records) {
    merged.set(record.id, record);
  }

  auditRecordCache = [...merged.values()].sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp)
  );
}

export function getStaffAuditRecords(): StaffAuditRecord[] {
  return auditRecordCache;
}

function buildStaffFromSession(): Staff | undefined {
  const session = getClientSession();
  if (!session?.staffId) return undefined;

  return {
    id: session.staffId,
    name: session.displayName,
    branch: session.branch,
    role: migrateLegacyAuthRole(session.role),
    status: "active",
    active: true,
    loginEnabled: true,
    userId: session.userId,
    dateJoined: getTodayISO(),
  };
}

export function resolveStaffFromSession(): Staff | undefined {
  const session = getClientSession();
  if (!session) return undefined;

  if (session.staffId) {
    const byId = staffListCache.find((member) => member.id === session.staffId);
    if (byId) return byId;
  }

  const byUserId = staffListCache.find((member) => member.userId === session.userId);
  if (byUserId) return byUserId;

  return buildStaffFromSession();
}

export function resolveStaffByUserId(userId: string): Staff | undefined {
  return staffListCache.find((member) => member.userId === userId);
}

export async function refreshStaffListCache(): Promise<void> {
  try {
    staffListCache = await fetchStaff();
  } catch {
    staffListCache = [];
  }
}

export function recordStaffAction(input: StaffAuditInput): StaffAuditRecord | null {
  let staffId = input.staffId;
  let staffName = input.staffName;
  let role = input.role;
  let branch = input.branch;

  if (!staffId) {
    const fromSession = resolveStaffFromSession();
    if (fromSession) {
      staffId = fromSession.id;
      staffName = fromSession.name;
      role = fromSession.role;
      branch = branch ?? fromSession.branch;
    }
  }

  if (!staffId || !staffName || !role || !branch) {
    const session = getClientSession();
    if (session?.staffId) {
      staffId = session.staffId;
      staffName = session.displayName;
      role = migrateLegacyAuthRole(session.role);
      branch = branch ?? session.branch;
    }
  }

  if (!staffId || !staffName || !role || !branch) {
    return null;
  }

  recordAuditEntry({
    userId: staffId,
    userName: staffName,
    role,
    branch,
    action: input.action,
    module: input.module,
    recordId: input.recordId,
    oldValues: input.oldValues,
    newValues: input.newValues,
  });

  const record: StaffAuditRecord = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    staffId,
    staffName,
    role,
    branch,
    action: input.action,
    module: input.module,
    detail: input.detail?.trim() || undefined,
  };

  auditRecordCache = [record, ...auditRecordCache].slice(0, 500);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(AUDIT_LOG_UPDATED_EVENT, { detail: record })
    );
  }

  return record;
}

export function getStaffAuditForProfile(staffId: string): StaffAuditRecord[] {
  return auditRecordCache
    .filter((record) => record.staffId === staffId)
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export function getGlobalStaffAuditLog(): StaffAuditRecord[] {
  return [...auditRecordCache].sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp)
  );
}
