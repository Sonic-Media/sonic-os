import { BRANCH_IDS } from "@/lib/constants";
import { normalizeBranchCode } from "@/lib/branch-storage";
import { getTodayISO } from "@/lib/dates";
import { isStaffRoleId } from "@/lib/staff/roles";
import type { Branch, Staff } from "@/types";
import type { StaffStatus } from "@/types/staff-role";

function normalizeStaffStatus(value: unknown, active: boolean): StaffStatus {
  if (value === "active" || value === "inactive") return value;
  return active ? "active" : "inactive";
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeOptionalAmount(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return value;
}

function normalizeStaffMember(value: unknown): Staff | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const branch = normalizeBranchCode(raw.branch);
  const active = raw.active !== false;
  const status = normalizeStaffStatus(raw.status, active);
  const role = isStaffRoleId(raw.role) ? raw.role : "cashier";
  const dateJoined =
    typeof raw.dateJoined === "string" && raw.dateJoined.trim()
      ? raw.dateJoined.trim()
      : getTodayISO();

  if (!id || !name) return null;

  return {
    id,
    name,
    username: normalizeOptionalString(raw.username),
    branch,
    role,
    loginEnabled: raw.loginEnabled === true,
    status,
    userId:
      typeof raw.userId === "string" && raw.userId.trim()
        ? raw.userId.trim()
        : undefined,
    active: status === "active",
    phone: normalizeOptionalString(raw.phone),
    email: normalizeOptionalString(raw.email),
    dailyWage: normalizeOptionalAmount(raw.dailyWage),
    monthlySalary: normalizeOptionalAmount(raw.monthlySalary),
    dateJoined,
    emergencyContact: normalizeOptionalString(raw.emergencyContact),
    notes: normalizeOptionalString(raw.notes),
  };
}

export function normalizeStaffList(value: unknown): Staff[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeStaffMember)
    .filter((member): member is Staff => member !== null);
}

export function buildStaffLookup(staff: Staff[]): Map<string, Staff> {
  return new Map(staff.map((member) => [member.id, member]));
}

export function getActiveStaffForBranch(staff: Staff[], branch: Branch): Staff[] {
  return staff.filter(
    (member) => member.active && member.status === "active" && member.branch === branch
  );
}

export function resolveStaffDisplayName(
  staffId: string,
  staffName: string,
  lookup: Map<string, Staff>
): string {
  if (staffId) {
    const member = lookup.get(staffId);
    if (member) return member.name;
    if (staffName.trim()) return staffName.trim();
    return "Unknown Staff";
  }

  return staffName.trim() || "—";
}

export function sortStaffByName(staff: Staff[]): Staff[] {
  return [...staff].sort((a, b) => {
    const branchCompare = BRANCH_IDS.indexOf(a.branch) - BRANCH_IDS.indexOf(b.branch);
    if (branchCompare !== 0) return branchCompare;
    return a.name.localeCompare(b.name);
  });
}

export function getStaffWithoutLogin(staff: Staff[]): Staff[] {
  return staff.filter((member) => !member.userId && member.status === "active");
}
