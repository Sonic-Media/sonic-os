import { createHash } from "crypto";
import { ApiError } from "@/lib/api/errors";
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

export interface ResetTargetGuardEnv {
  allowDestructiveOps: boolean;
  allowNeonTransactionalReset: boolean;
  allowNonLocalTransactionalReset: boolean;
  allowedDatabaseFingerprint?: string;
  blockedDatabaseNames: string[];
}

export interface ResetTargetAuthorization {
  authorized: boolean;
  fingerprint: string;
  hostCategory: "local" | "neon" | "remote";
  database: string;
  isProductionMode: boolean;
  code?: string;
  message?: string;
  requiredEnvVars?: string[];
}

export type ResetTargetEvaluation =
  | { ok: true; identity: SafeDatabaseIdentity }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);

function fingerprintHostDatabase(host: string, database: string): string {
  return createHash("sha256")
    .update(`${host}/${database}`)
    .digest("hex")
    .slice(0, 12);
}

export function readResetTargetGuardEnv(
  env: NodeJS.ProcessEnv = process.env
): ResetTargetGuardEnv {
  return {
    allowDestructiveOps:
      env.ALLOW_DESTRUCTIVE_OPS?.trim().toLowerCase() === "true",
    allowNeonTransactionalReset:
      env.ALLOW_NEON_TRANSACTIONAL_RESET?.trim().toLowerCase() === "true",
    allowNonLocalTransactionalReset:
      env.ALLOW_NONLOCAL_TRANSACTIONAL_RESET?.trim().toLowerCase() === "true",
    allowedDatabaseFingerprint:
      env.SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT?.trim() || undefined,
    blockedDatabaseNames: (env.SONIC_BLOCKED_RESET_DATABASES ??
      "sonic_os_prod,production")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  };
}

function hostCategory(
  identity: SafeDatabaseIdentity
): ResetTargetAuthorization["hostCategory"] {
  if (identity.isLocalHost) {
    return "local";
  }
  if (identity.isNeonHost) {
    return "neon";
  }
  return "remote";
}

function remoteRequiredEnvVars(identity: SafeDatabaseIdentity): string[] {
  const required = [
    "ALLOW_NONLOCAL_TRANSACTIONAL_RESET=true",
    "SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT=<this database fingerprint>",
  ];

  if (identity.isNeonHost) {
    required.unshift("ALLOW_NEON_TRANSACTIONAL_RESET=true");
  }

  return required;
}

export function describeDatabaseTarget(): SafeDatabaseIdentity {
  const diagnostics = getDatabaseUrlDiagnostics();
  const rawUrl = process.env.DATABASE_URL?.trim() ?? "";

  if (!diagnostics.configured || diagnostics.invalid) {
    throw new ApiError(
      diagnostics.parseError ??
        "DATABASE_URL is not configured. Cannot identify reset target.",
      { status: 503, code: "database_unavailable" }
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

export function evaluateTransactionalResetTarget(
  identity: SafeDatabaseIdentity,
  env: ResetTargetGuardEnv,
  options?: { allowNonLocal?: boolean }
): ResetTargetEvaluation {
  if (env.blockedDatabaseNames.includes(identity.database.toLowerCase())) {
    return {
      ok: false,
      status: 403,
      code: "reset_target_forbidden",
      message: `Shop reset is blocked for database "${identity.database}".`,
      details: {
        reason: "blocked_database_name",
        fingerprint: identity.fingerprint,
      },
    };
  }

  if (identity.isProductionMode && !env.allowDestructiveOps) {
    return {
      ok: false,
      status: 403,
      code: "reset_target_forbidden",
      message:
        "Shop reset is disabled in production mode. Set ALLOW_DESTRUCTIVE_OPS=true only for controlled maintenance windows.",
      details: {
        reason: "production_mode",
        fingerprint: identity.fingerprint,
      },
    };
  }

  if (identity.isLocalHost) {
    return { ok: true, identity };
  }

  const nonLocalAllowed =
    options?.allowNonLocal || env.allowNonLocalTransactionalReset;

  if (!nonLocalAllowed) {
    return {
      ok: false,
      status: 403,
      code: "reset_target_forbidden",
      message:
        "Shop reset requires explicit authorization for this non-local database. Configure Preview-only reset env vars and set SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT to this database fingerprint.",
      details: {
        reason: "non_local_not_authorized",
        fingerprint: identity.fingerprint,
        hostCategory: hostCategory(identity),
        requiredEnvVars: remoteRequiredEnvVars(identity),
      },
    };
  }

  if (identity.isNeonHost && !env.allowNeonTransactionalReset) {
    return {
      ok: false,
      status: 403,
      code: "reset_target_forbidden",
      message:
        "Shop reset requires ALLOW_NEON_TRANSACTIONAL_RESET=true for Neon databases, plus a matching SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT.",
      details: {
        reason: "neon_not_authorized",
        fingerprint: identity.fingerprint,
        requiredEnvVars: remoteRequiredEnvVars(identity),
      },
    };
  }

  if (!env.allowedDatabaseFingerprint) {
    return {
      ok: false,
      status: 403,
      code: "reset_target_forbidden",
      message:
        "Shop reset requires SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT for non-local databases. Set it to this database fingerprint on Preview only.",
      details: {
        reason: "fingerprint_required",
        fingerprint: identity.fingerprint,
        requiredEnvVars: remoteRequiredEnvVars(identity),
      },
    };
  }

  if (env.allowedDatabaseFingerprint !== identity.fingerprint) {
    return {
      ok: false,
      status: 403,
      code: "reset_target_forbidden",
      message:
        "Shop reset refused: configured database fingerprint does not match this deployment target.",
      details: {
        reason: "fingerprint_mismatch",
        fingerprint: identity.fingerprint,
      },
    };
  }

  return { ok: true, identity };
}

export function describeResetTargetAuthorization(
  env: NodeJS.ProcessEnv = process.env
): ResetTargetAuthorization {
  const identity = describeDatabaseTarget();
  const evaluation = evaluateTransactionalResetTarget(
    identity,
    readResetTargetGuardEnv(env)
  );

  const base: ResetTargetAuthorization = {
    authorized: evaluation.ok,
    fingerprint: identity.fingerprint,
    hostCategory: hostCategory(identity),
    database: identity.database,
    isProductionMode: identity.isProductionMode,
  };

  if (evaluation.ok) {
    return base;
  }

  return {
    ...base,
    code: evaluation.code,
    message: evaluation.message,
    requiredEnvVars: Array.isArray(evaluation.details?.requiredEnvVars)
      ? (evaluation.details.requiredEnvVars as string[])
      : undefined,
  };
}

function throwResetTargetGuardError(evaluation: Extract<ResetTargetEvaluation, { ok: false }>): never {
  throw new ApiError(evaluation.message, {
    status: evaluation.status,
    code: evaluation.code,
    details: evaluation.details,
  });
}

export function assertSafeTransactionalResetTarget(options?: {
  allowNonLocal?: boolean;
}): SafeDatabaseIdentity {
  const identity = describeDatabaseTarget();
  const evaluation = evaluateTransactionalResetTarget(
    identity,
    readResetTargetGuardEnv(),
    options
  );

  if (!evaluation.ok) {
    throwResetTargetGuardError(evaluation);
  }

  return identity;
}
