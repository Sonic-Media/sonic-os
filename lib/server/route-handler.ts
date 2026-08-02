import { headers } from "next/headers";
import { jsonError } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { isDatabaseConfigured } from "@/lib/db";
import {
  requireModuleAccess,
  requireOwner,
  requirePermission,
} from "@/lib/server/security/authorization";
import { assertCsrfProtection, assertCsrfProtectionFromHeaders } from "@/lib/server/security/csrf";
import {
  getApiModuleForPath,
  isOwnerOnlyApiPath,
  type ServerPermission,
} from "@/lib/server/security/permissions";
import {
  createRequestId,
  logRequestComplete,
  logServerError,
  toPublicErrorMessage,
} from "@/lib/server/security/logging";
import { requireSession } from "@/lib/server/session";
import type { AuthSession } from "@/types/auth";
import type { StaffModule } from "@/types/staff-role";

export function ensureDatabaseConfigured() {
  if (!isDatabaseConfigured()) {
    throw new ApiError("Database is not configured.", {
      status: 503,
      code: "database_unavailable",
    });
  }
}

export interface SecureRouteOptions {
  requireAuth?: boolean;
  permission?: ServerPermission;
  module?: StaffModule;
  ownerOnly?: boolean;
  request?: Request;
  skipCsrf?: boolean;
  skipAccessControl?: boolean;
}

async function resolveRequestPathFromContext(request?: Request): Promise<string> {
  if (request) {
    return new URL(request.url).pathname;
  }

  const headerStore = await headers();
  return headerStore.get("x-sonic-pathname") ?? "";
}

function enforceAccessControl(
  session: AuthSession,
  pathname: string,
  options?: SecureRouteOptions
): void {
  if (options?.skipAccessControl) {
    return;
  }

  if (options?.ownerOnly || (pathname && isOwnerOnlyApiPath(pathname))) {
    requireOwner(session);
    return;
  }

  if (options?.permission) {
    requirePermission(session, options.permission);
  }

  const module = options?.module ?? (pathname ? getApiModuleForPath(pathname) : null);
  if (module) {
    requireModuleAccess(session, module);
  }
}

export async function withDatabase<T>(
  handler: () => Promise<T>,
  options?: SecureRouteOptions
): Promise<T> {
  ensureDatabaseConfigured();

  const pathname = await resolveRequestPathFromContext(options?.request);

  if (options?.request && !options.skipCsrf) {
    assertCsrfProtection(options.request, pathname);
  } else if (!options?.skipCsrf && pathname.startsWith("/api/")) {
    await assertCsrfProtectionFromHeaders(pathname);
  }

  if (options?.requireAuth !== false) {
    const session = await requireSession();
    enforceAccessControl(session, pathname, options);
  }

  return handler();
}

export function handleRouteError(
  error: unknown,
  context?: { requestId?: string; method?: string; pathname?: string }
) {
  const publicError = toPublicErrorMessage(error);

  logServerError({
    requestId: context?.requestId ?? createRequestId(),
    method: context?.method ?? "unknown",
    pathname: context?.pathname ?? "unknown",
    status: publicError.status,
    code: publicError.code,
    message: publicError.message,
    stack: error instanceof Error ? error.stack : undefined,
  });

  return jsonError(error, context);
}

export function logApiRequest(context: {
  requestId?: string;
  method: string;
  pathname: string;
  status: number;
  durationMs: number;
  userId?: string;
  username?: string;
}): void {
  logRequestComplete({
    requestId: context.requestId ?? createRequestId(),
    method: context.method,
    pathname: context.pathname,
    status: context.status,
    durationMs: context.durationMs,
    userId: context.userId,
    username: context.username,
  });
}
