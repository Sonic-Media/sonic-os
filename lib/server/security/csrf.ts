import { ApiError } from "@/lib/api/errors";
import { isCsrfExemptApiPath } from "@/lib/server/security/permissions";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function normalizeOrigin(value: string | null): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getExpectedOrigin(
  host: string | null,
  forwardedProto: string | null
): string | null {
  if (!host) return null;

  const proto =
    forwardedProto ?? (host.includes("localhost") ? "http" : "https");

  return `${proto}://${host}`;
}

export function assertCsrfProtection(
  request: Request,
  pathname: string
): void {
  validateCsrf({
    method: request.method.toUpperCase(),
    pathname,
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    host:
      request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
  });
}

export async function assertCsrfProtectionFromHeaders(
  pathname: string
): Promise<void> {
  const { headers } = await import("next/headers");
  const headerStore = await headers();

  validateCsrf({
    method: headerStore.get("x-sonic-method")?.toUpperCase() ?? "GET",
    pathname,
    origin: headerStore.get("origin"),
    referer: headerStore.get("referer"),
    host: headerStore.get("x-forwarded-host") ?? headerStore.get("host"),
    forwardedProto: headerStore.get("x-forwarded-proto"),
  });
}

function validateCsrf(input: {
  method: string;
  pathname: string;
  origin: string | null;
  referer: string | null;
  host: string | null;
  forwardedProto: string | null;
}): void {
  if (!MUTATING_METHODS.has(input.method)) {
    return;
  }

  if (isCsrfExemptApiPath(input.pathname)) {
    return;
  }

  const expectedOrigin = getExpectedOrigin(input.host, input.forwardedProto);
  if (!expectedOrigin) {
    return;
  }

  const origin = normalizeOrigin(input.origin);
  const refererOrigin = input.referer ? normalizeOrigin(input.referer) : null;

  if (origin && origin === expectedOrigin) {
    return;
  }

  if (refererOrigin && refererOrigin === expectedOrigin) {
    return;
  }

  if (!origin && !refererOrigin && process.env.NODE_ENV !== "production") {
    return;
  }

  throw new ApiError("Cross-site request blocked.", {
    status: 403,
    code: "csrf_blocked",
  });
}
