import { ApiError } from "@/lib/api/errors";
import type { AuthSession } from "@/types/auth";
import type { StaffModule } from "@/types/staff-role";
import {
  roleCanAccessApiModule,
  roleHasServerPermission,
  type ServerPermission,
} from "@/lib/server/security/permissions";

export function requireOwner(session: AuthSession): void {
  if (session.role !== "owner") {
    throw new ApiError("Owner access required.", {
      status: 403,
      code: "forbidden",
    });
  }
}

export function requireRole(
  session: AuthSession,
  roles: AuthSession["role"] | AuthSession["role"][]
): void {
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(session.role)) {
    throw new ApiError("You do not have permission to perform this action.", {
      status: 403,
      code: "forbidden",
    });
  }
}

export function requirePermission(
  session: AuthSession,
  permission: ServerPermission
): void {
  if (!roleHasServerPermission(session.role, permission)) {
    throw new ApiError("You do not have permission to perform this action.", {
      status: 403,
      code: "forbidden",
    });
  }
}

export function requireModuleAccess(
  session: AuthSession,
  module: StaffModule
): void {
  if (!roleCanAccessApiModule(session.role, module)) {
    throw new ApiError("You do not have access to this module.", {
      status: 403,
      code: "forbidden",
    });
  }
}
