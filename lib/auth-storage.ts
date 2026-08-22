import {
  DEFAULT_OWNER_PASSWORD_HASH,
  hashPassword,
} from "@/lib/auth/password";
import { isUserRole, normalizeUserRole } from "@/lib/auth/validation";
import type { AppUser, AuthAuditRecord, AuthSession } from "@/types/auth";
import type { Branch } from "@/types";

const DEFAULT_CREATED_AT = "2024-01-01T00:00:00.000Z";

export const DEFAULT_OWNER_USER: AppUser = {
  id: "user-owner-default",
  username: "owner",
  displayName: "Owner",
  role: "owner",
  passwordHash: DEFAULT_OWNER_PASSWORD_HASH,
  branch: "main",
  active: true,
  createdAt: DEFAULT_CREATED_AT,
  updatedAt: DEFAULT_CREATED_AT,
};

function normalizeBranch(value: unknown): Branch {
  if (typeof value === "string" && value.trim()) {
    return value.trim().toLowerCase();
  }

  return "main";
}

function normalizeAppUser(value: unknown): AppUser | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const username =
    typeof raw.username === "string" ? raw.username.trim().toLowerCase() : "";
  const displayName =
    typeof raw.displayName === "string" ? raw.displayName.trim() : "";
  const passwordHash =
    typeof raw.passwordHash === "string" ? raw.passwordHash : "";

  if (!id || !username || !displayName || !passwordHash) return null;

  const role = normalizeUserRole(raw.role);
  if (!isUserRole(role)) return null;

  const now = new Date().toISOString();

  return {
    id,
    username,
    displayName,
    role,
    passwordHash,
    branch: normalizeBranch(raw.branch),
    active: raw.active !== false,
    staffId:
      typeof raw.staffId === "string" && raw.staffId.trim()
        ? raw.staffId.trim()
        : undefined,
    createdAt:
      typeof raw.createdAt === "string" && raw.createdAt.trim()
        ? raw.createdAt
        : now,
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt.trim()
        ? raw.updatedAt
        : now,
  };
}

export function normalizeUserList(value: unknown): AppUser[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeAppUser)
    .filter((user): user is AppUser => user !== null);
}

export function sortUsersByRole(users: AppUser[]): AppUser[] {
  const order: AppUser["role"][] = ["owner", "branch-manager", "cashier"];

  return [...users].sort((left, right) => {
    const leftIndex = order.indexOf(left.role);
    const rightIndex = order.indexOf(right.role);
    const roleCompare =
      (leftIndex === -1 ? order.length : leftIndex) -
      (rightIndex === -1 ? order.length : rightIndex);
    if (roleCompare !== 0) return roleCompare;
    return left.displayName.localeCompare(right.displayName);
  });
}

function normalizeAuthSession(value: unknown): AuthSession | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const userId = typeof raw.userId === "string" ? raw.userId.trim() : "";
  const username =
    typeof raw.username === "string" ? raw.username.trim().toLowerCase() : "";
  const displayName =
    typeof raw.displayName === "string" ? raw.displayName.trim() : "";

  if (!userId || !username || !displayName) return null;

  const role = normalizeUserRole(raw.role);
  if (!isUserRole(role)) return null;

  return {
    userId,
    username,
    displayName,
    role,
    branch: normalizeBranch(raw.branch),
    locked: raw.locked === true,
    loggedInAt:
      typeof raw.loggedInAt === "string" && raw.loggedInAt.trim()
        ? raw.loggedInAt
        : new Date().toISOString(),
  };
}

export function clearSession(): void {
  if (typeof window === "undefined") return;

  for (const key of [
    "sonic-os-session",
    "sonic-os-users",
    "sonic-os-auth-audit",
    "sonic-os-staff",
    "sonic-os-settings",
    "sonic-os-expense-templates",
    "sonic-os-day-closings",
    "sonic-os-audit-log",
    "sonic-os-staff-audit",
    "sonic-os-branches",
    "sonic-os-activity-log",
  ]) {
    localStorage.removeItem(key);
  }
}

export function createSessionFromUser(user: AppUser): AuthSession {
  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    branch: user.branch,
    locked: false,
    loggedInAt: new Date().toISOString(),
  };
}

export function hashUserPassword(password: string): string {
  return hashPassword(password);
}

export function getAuthAuditRecords(): AuthAuditRecord[] {
  return [];
}

export function recordUserAction(
  action: string,
  detail: string,
  context?: Pick<AuthSession, "userId" | "username" | "branch">
): AuthAuditRecord {
  return {
    id: crypto.randomUUID(),
    userId: context?.userId ?? "system",
    username: context?.username ?? "system",
    branch: context?.branch ?? "main",
    action,
    detail,
    timestamp: new Date().toISOString(),
  };
}
