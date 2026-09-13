import { createHash } from "crypto";
import { getDatabaseUrlDiagnostics } from "@/lib/db/connection";
import { isProductionMode } from "@/lib/env/production-mode";

export interface SafeDatabaseIdentity {
  host: string;
  port: string;
  database: string;
  user: string;
  schema: string;
  fingerprint: string;
  isLocalHost: boolean;
  isNeonHost: boolean;
  appEnv: string;
  appMode: string;
  isProductionMode: boolean;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);

function fingerprintHostDatabase(host: string, database: string): string {
  return createHash("sha256")
    .update(`${host}/${database}`)
    .digest("hex")
    .slice(0, 12);
}

export function describeDatabaseTarget(): SafeDatabaseIdentity {
  const diagnostics = getDatabaseUrlDiagnostics();
  const rawUrl = process.env.DATABASE_URL?.trim() ?? "";

  if (!diagnostics.configured || diagnostics.invalid) {
    throw new Error(
      diagnostics.parseError ??
        "DATABASE_URL is not configured. Cannot identify reset target."
    );
  }

  const host = diagnostics.host ?? "unknown";
  const database = diagnostics.database ?? "unknown";

  return {
    host,
    port: diagnostics.port ?? "5432",
    database,
    user: diagnostics.user ?? "unknown",
    schema: diagnostics.schema ?? "public",
    fingerprint: fingerprintHostDatabase(host, database),
    isLocalHost: LOCAL_HOSTS.has(host),
    isNeonHost: /neon/i.test(rawUrl) || host.includes("neon.tech"),
    appEnv: process.env.APP_ENV?.trim() || "(unset)",
    appMode: process.env.APP_MODE?.trim() || "(unset)",
    isProductionMode: isProductionMode(),
  };
}

export function assertSafeTransactionalResetTarget(options?: {
  allowNonLocal?: boolean;
}): SafeDatabaseIdentity {
  const identity = describeDatabaseTarget();

  if (identity.isProductionMode) {
    const destructiveAllowed =
      process.env.ALLOW_DESTRUCTIVE_OPS?.trim().toLowerCase() === "true";
    if (!destructiveAllowed) {
      throw new Error(
        "Refusing reset: APP_ENV/APP_MODE indicates production and ALLOW_DESTRUCTIVE_OPS is not true."
      );
    }
  }

  if (identity.isNeonHost) {
    const neonOverride =
      process.env.ALLOW_NEON_TRANSACTIONAL_RESET?.trim().toLowerCase() ===
      "true";
    if (!neonOverride) {
      throw new Error(
        "Refusing reset: DATABASE_URL points at Neon. This may be production. Set ALLOW_NEON_TRANSACTIONAL_RESET=true only after confirming the target is a non-production database."
      );
    }
  }

  if (!identity.isLocalHost) {
    const nonLocalAllowed =
      options?.allowNonLocal ||
      process.env.ALLOW_NONLOCAL_TRANSACTIONAL_RESET?.trim().toLowerCase() ===
        "true";

    if (!nonLocalAllowed) {
      throw new Error(
        `Refusing reset: target host "${identity.host}" is not local. Set ALLOW_NONLOCAL_TRANSACTIONAL_RESET=true only after confirming this is not production.`
      );
    }

    const allowedFingerprint =
      process.env.SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT?.trim();
    if (
      allowedFingerprint &&
      allowedFingerprint !== identity.fingerprint
    ) {
      throw new Error(
        "Refusing reset: database fingerprint does not match SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT."
      );
    }
  }

  const blockedDatabaseNames = new Set(
    (process.env.SONIC_BLOCKED_RESET_DATABASES ?? "sonic_os_prod,production")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );

  if (blockedDatabaseNames.has(identity.database.toLowerCase())) {
    throw new Error(
      `Refusing reset: database name "${identity.database}" is blocked by SONIC_BLOCKED_RESET_DATABASES.`
    );
  }

  return identity;
}
