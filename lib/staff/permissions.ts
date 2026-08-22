import type { StaffModule, StaffRoleId } from "@/types/staff-role";
import type { UserRole } from "@/types/auth";
import {
  getStaffRoleDefinition,
  migrateLegacyAuthRole,
} from "@/lib/staff/roles";

export function getModuleForPath(pathname: string): StaffModule | null {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/operations") || pathname.startsWith("/entry")) {
    return "operations";
  }
  if (pathname.startsWith("/sales")) return "sales";
  if (pathname.startsWith("/purchasing")) return "purchasing";
  if (pathname.startsWith("/expenses")) return "expenses";
  if (pathname.startsWith("/stock")) return "stock";
  if (pathname.startsWith("/branches")) return "branches";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/history")) return "history";
  if (pathname.startsWith("/staff")) return "staff";
  if (pathname.startsWith("/settings")) return "settings";
  return null;
}

function resolveStaffRole(role: UserRole): StaffRoleId | null {
  if (role === "owner") return null;
  return migrateLegacyAuthRole(role);
}

export function roleHasModuleAccess(role: UserRole, module: StaffModule): boolean {
  if (role === "owner") return true;

  const staffRole = resolveStaffRole(role);
  if (!staffRole) return false;

  const definition = getStaffRoleDefinition(staffRole);
  return definition?.modules.includes(module) ?? false;
}

export function getDefaultRouteForStaffRole(role: UserRole): string {
  if (role === "owner" || migrateLegacyAuthRole(role) === "branch-manager") {
    return "/";
  }

  return "/operations/today";
}
