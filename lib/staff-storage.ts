import { BRANCH_IDS, DEFAULT_STAFF, STAFF_STORAGE_KEY } from "@/lib/constants";
import { normalizeBranchCode } from "@/lib/branch-storage";
import { isStaffRoleId } from "@/lib/staff/roles";
import type { Branch, Staff } from "@/types";
import type { StaffStatus } from "@/types/staff-role";

function normalizeStaffStatus(value: unknown, active: boolean): StaffStatus {
  if (value === "active" || value === "inactive") return value;
  return active ? "active" : "inactive";
}

function normalizeStaffMember(value: unknown): Staff | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const branch = normalizeBranchCode(raw.branch);
  const active = raw.active !== false;
  const status = normalizeStaffStatus(raw.status, active);
  const role = isStaffRoleId(raw.role) ? raw.role : "store-attendant";

  if (!id || !name) return null;

  return {
    id,
    name,
    branch,
    role,
    loginEnabled: raw.loginEnabled === true,
    status,
    userId:
      typeof raw.userId === "string" && raw.userId.trim()
        ? raw.userId.trim()
        : undefined,
    active: status === "active",
  };
}

export function normalizeStaffList(value: unknown): Staff[] {
  if (!Array.isArray(value)) {
    return DEFAULT_STAFF.map((member) => ({ ...member }));
  }

  const staff = value
    .map(normalizeStaffMember)
    .filter((member): member is Staff => member !== null);

  return staff.length > 0
    ? staff
    : DEFAULT_STAFF.map((member) => ({ ...member }));
}

export function getStaffList(): Staff[] {
  if (typeof window === "undefined") {
    return DEFAULT_STAFF.map((member) => ({ ...member }));
  }

  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (!raw) return DEFAULT_STAFF.map((member) => ({ ...member }));
    return normalizeStaffList(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_STAFF.map((member) => ({ ...member }));
  }
}

export function saveStaffList(staff: Staff[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staff));
}

export function linkStaffToUser(staffId: string, userId: string): Staff[] {
  const next = getStaffList().map((member) =>
    member.id === staffId
      ? {
          ...member,
          userId,
          loginEnabled: true,
        }
      : member
  );
  saveStaffList(next);
  return next;
}

export function unlinkStaffUser(staffId: string): Staff[] {
  const next = getStaffList().map((member) =>
    member.id === staffId
      ? {
          ...member,
          userId: undefined,
          loginEnabled: false,
        }
      : member
  );
  saveStaffList(next);
  return next;
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
