import type { StaffModule } from "@/types/staff-role";
import type { UserRole } from "@/types/auth";
import { roleHasModuleAccess } from "@/lib/staff/permissions";

export type ServerPermission =
  | "manage_users"
  | "manage_roles"
  | "import_historical"
  | "view_audit_log"
  | "manage_branches";

const OWNER_PERMISSIONS: ServerPermission[] = [
  "manage_users",
  "manage_roles",
  "import_historical",
  "view_audit_log",
];

const BRANCH_MANAGER_PERMISSIONS: ServerPermission[] = ["manage_branches"];

export function roleHasServerPermission(
  role: UserRole,
  permission: ServerPermission
): boolean {
  if (role === "owner") return true;

  if (OWNER_PERMISSIONS.includes(permission)) {
    return false;
  }

  if (
    permission === "manage_branches" &&
    (role === "ceo" || role === "branch-manager")
  ) {
    return true;
  }

  return BRANCH_MANAGER_PERMISSIONS.includes(permission);
}

export function roleCanAccessApiModule(
  role: UserRole,
  module: StaffModule
): boolean {
  return roleHasModuleAccess(role, module);
}

const API_MODULE_PREFIXES: Array<[string, StaffModule]> = [
  ["/api/sales", "sales"],
  ["/api/customers", "sales"],
  ["/api/purchases", "purchasing"],
  ["/api/suppliers", "purchasing"],
  ["/api/expenses", "expenses"],
  ["/api/expense-categories", "expenses"],
  ["/api/staff-payments", "staff"],
  ["/api/staff", "staff"],
  ["/api/stock", "stock"],
  ["/api/branches", "branches"],
  ["/api/daily-operations", "operations"],
  ["/api/reports", "reports"],
  ["/api/users", "settings"],
  ["/api/roles", "settings"],
];

const OWNER_ONLY_PREFIXES = [
  "/api/users",
  "/api/roles",
  "/api/daily-operations/import",
  "/api/audit-log",
];

export function getApiModuleForPath(pathname: string): StaffModule | null {
  for (const [prefix, module] of API_MODULE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return module;
    }
  }

  return null;
}

export function isOwnerOnlyApiPath(pathname: string): boolean {
  return OWNER_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isCsrfExemptApiPath(pathname: string): boolean {
  return (
    pathname === "/api/health" ||
    pathname === "/api/ready" ||
    pathname === "/api/readiness" ||
    pathname === "/api/auth/session"
  );
}
