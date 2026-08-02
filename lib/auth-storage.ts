import {
  AUTH_AUDIT_STORAGE_KEY,
  DEFAULT_BRANCH_CODE,
  SESSION_STORAGE_KEY,
  USERS_STORAGE_KEY,
} from "@/lib/constants";
import {
  DEFAULT_OWNER_PASSWORD_HASH,
  hashPassword,
} from "@/lib/auth/password";
import { isUserRole, normalizeUserRole } from "@/lib/auth/validation";
import type { AppUser, AuthSession } from "@/types/auth";
import type { Branch } from "@/types";

const MAX_AUDIT_RECORDS = 200;

const DEFAULT_CREATED_AT = "2024-01-01T00:00:00.000Z";

export const DEFAULT_OWNER_USER: AppUser = {
  id: "user-owner-default",
  username: "owner",
  displayName: "Owner",
  role: "owner",
  passwordHash: DEFAULT_OWNER_PASSWORD_HASH,
  branch: DEFAULT_BRANCH_CODE,
  active: true,
  createdAt: DEFAULT_CREATED_AT,
  updatedAt: DEFAULT_CREATED_AT,
};

function normalizeBranch(value: unknown): Branch {
  if (typeof value === "string" && value.trim()) {
    return value.trim().toLowerCase();
  }

  return DEFAULT_BRANCH_CODE;
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
    return [{ ...DEFAULT_OWNER_USER }];
  }

  const users = value
    .map(normalizeAppUser)
    .filter((user): user is AppUser => user !== null);

  if (users.length === 0) {
    return [{ ...DEFAULT_OWNER_USER }];
  }

  if (!users.some((user) => user.role === "owner")) {
    return [{ ...DEFAULT_OWNER_USER }, ...users];
  }

  return users;
}

export function getUsers(): AppUser[] {
  if (typeof window === "undefined") {
    return [{ ...DEFAULT_OWNER_USER }];
  }

  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      const defaults = [{ ...DEFAULT_OWNER_USER }];
      saveUsers(defaults);
      return defaults;
    }

    return normalizeUserList(JSON.parse(raw) as unknown);
  } catch {
    return [{ ...DEFAULT_OWNER_USER }];
  }
}

export function saveUsers(users: AppUser[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function sortUsersByRole(users: AppUser[]): AppUser[] {
  const order: AppUser["role"][] = [
    "owner",
    "ceo",
    "manager",
    "accountant",
    "cashier",
    "salesperson",
    "technician",
    "store-attendant",
  ];

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

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return normalizeAuthSession(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
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

export function getAuthAuditRecords(): import("@/types/auth").AuthAuditRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(AUTH_AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((record): record is import("@/types/auth").AuthAuditRecord => {
      if (!record || typeof record !== "object") return false;
      const item = record as import("@/types/auth").AuthAuditRecord;
      return (
        typeof item.id === "string" &&
        typeof item.userId === "string" &&
        typeof item.username === "string" &&
        typeof item.branch === "string" &&
        typeof item.action === "string" &&
        typeof item.detail === "string" &&
        typeof item.timestamp === "string"
      );
    });
  } catch {
    return [];
  }
}

export function recordUserAction(
  action: string,
  detail: string,
  context?: Pick<AuthSession, "userId" | "username" | "branch">
): import("@/types/auth").AuthAuditRecord {
  const session = context ?? getSession();
  const record: import("@/types/auth").AuthAuditRecord = {
    id: crypto.randomUUID(),
    userId: session?.userId ?? "system",
    username: session?.username ?? "system",
    branch: session?.branch ?? DEFAULT_BRANCH_CODE,
    action,
    detail,
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const next = [record, ...getAuthAuditRecords()].slice(0, MAX_AUDIT_RECORDS);
    localStorage.setItem(AUTH_AUDIT_STORAGE_KEY, JSON.stringify(next));
  }

  return record;
}
