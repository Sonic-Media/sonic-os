import { STAFF_AUDIT_STORAGE_KEY } from "@/lib/constants";
import { recordAuditEntry } from "@/lib/audit-log/record";
import { getSession } from "@/lib/auth-storage";
import { getStaffList } from "@/lib/staff-storage";
import type { Staff } from "@/types";
import type { StaffAuditInput, StaffAuditRecord } from "@/types/staff-audit";

const MAX_AUDIT_RECORDS = 500;

function normalizeStaffAuditRecord(value: unknown): StaffAuditRecord | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const timestamp = typeof raw.timestamp === "string" ? raw.timestamp.trim() : "";
  const staffId = typeof raw.staffId === "string" ? raw.staffId.trim() : "";
  const staffName = typeof raw.staffName === "string" ? raw.staffName.trim() : "";
  const role = typeof raw.role === "string" ? raw.role.trim() : "";
  const branch = typeof raw.branch === "string" ? raw.branch.trim() : "";
  const action = typeof raw.action === "string" ? raw.action.trim() : "";
  const module = typeof raw.module === "string" ? raw.module.trim() : "";

  if (!id || !timestamp || !staffId || !staffName || !role || !branch || !action || !module) {
    return null;
  }

  return {
    id,
    timestamp,
    staffId,
    staffName,
    role: role as StaffAuditRecord["role"],
    branch,
    action,
    module: module as StaffAuditRecord["module"],
    detail:
      typeof raw.detail === "string" && raw.detail.trim()
        ? raw.detail.trim()
        : undefined,
  };
}

export function getStaffAuditRecords(): StaffAuditRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STAFF_AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeStaffAuditRecord)
      .filter((record): record is StaffAuditRecord => record !== null);
  } catch {
    return [];
  }
}

export function saveStaffAuditRecords(records: StaffAuditRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STAFF_AUDIT_STORAGE_KEY, JSON.stringify(records));
}

export function resolveStaffFromSession(): Staff | undefined {
  const session = getSession();
  if (!session) return undefined;
  return getStaffList().find((member) => member.userId === session.userId);
}

export function resolveStaffByUserId(userId: string): Staff | undefined {
  return getStaffList().find((member) => member.userId === userId);
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
      branch = fromSession.branch;
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

  if (typeof window !== "undefined") {
    const next = [record, ...getStaffAuditRecords()].slice(0, MAX_AUDIT_RECORDS);
    saveStaffAuditRecords(next);
  }

  return record;
}

export function getStaffAuditForProfile(staffId: string): StaffAuditRecord[] {
  return getStaffAuditRecords()
    .filter((record) => record.staffId === staffId)
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export function getGlobalStaffAuditLog(): StaffAuditRecord[] {
  return [...getStaffAuditRecords()].sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp)
  );
}
