import { getAppEnvironment, getEnvironmentProfile } from "@/lib/env";
import {
  checkDatabaseConnection,
  type DatabaseConnectionCheck,
} from "@/lib/db";
import {
  BootstrapFailedError,
  ensureApplicationInitialized,
  getApplicationBootstrapReport,
} from "@/lib/server/bootstrap";
import { verifyMigrationsVerifiedStage } from "@/lib/server/bootstrap/verify";

export interface ReadinessReport {
  status: "ready" | "not_ready";
  environment: string;
  checks: {
    databaseConfigured: boolean;
    databaseConnected: boolean;
    migrationsApplied: boolean;
    bootstrapComplete: boolean;
  };
  database?: {
    host: string | null;
    port: string | null;
    database: string | null;
    sslmode: string | null;
    normalizedFromEnv: boolean;
    error: string | null;
  };
  bootstrap?: {
    failedStage: string | null;
    error: string | null;
  };
  timestamp: string;
}

function buildDatabaseReport(
  connection: DatabaseConnectionCheck
): ReadinessReport["database"] {
  return {
    host: connection.diagnostics.host ?? null,
    port: connection.diagnostics.port ?? null,
    database: connection.diagnostics.database ?? null,
    sslmode: connection.diagnostics.sslmode ?? null,
    normalizedFromEnv: connection.diagnostics.normalizedFromEnv ?? false,
    error: connection.error,
  };
}

export async function getReadinessReport(): Promise<ReadinessReport> {
  const appEnv = getAppEnvironment();
  const profile = getEnvironmentProfile(appEnv);
  const connection = await checkDatabaseConnection();
  const databaseConfigured = connection.diagnostics.configured;

  let databaseConnected = connection.connected;
  let migrationsApplied = false;
  let bootstrapComplete = false;
  let bootstrapFailure: ReadinessReport["bootstrap"];

  if (databaseConnected) {
    try {
      migrationsApplied = await verifyMigrationsVerifiedStage();

      try {
        await ensureApplicationInitialized();
        bootstrapComplete = true;
      } catch (error) {
        bootstrapComplete = false;

        if (error instanceof BootstrapFailedError) {
          bootstrapFailure = {
            failedStage: error.stage,
            error: error.message,
          };
        } else {
          const report = await getApplicationBootstrapReport();
          bootstrapFailure = {
            failedStage: report.failedStage,
            error:
              report.error ??
              (error instanceof Error ? error.message : "Bootstrap failed."),
          };
        }
      }
    } catch (error) {
      migrationsApplied = false;
      bootstrapComplete = false;
      bootstrapFailure = {
        failedStage: "migrations_verified",
        error:
          error instanceof Error
            ? error.message
            : "Migration verification failed.",
      };
    }
  } else if (connection.error) {
    console.error("[readiness] database connection failed:", connection.error);
  }

  const checks = {
    databaseConfigured: profile.requiresDatabase ? databaseConfigured : true,
    databaseConnected: profile.requiresDatabase ? databaseConnected : true,
    migrationsApplied: profile.requiresDatabase ? migrationsApplied : true,
    bootstrapComplete: profile.requiresDatabase ? bootstrapComplete : true,
  };

  const ready = Object.values(checks).every(Boolean);

  return {
    status: ready ? "ready" : "not_ready",
    environment: appEnv,
    checks,
    database: buildDatabaseReport(connection),
    bootstrap: bootstrapFailure,
    timestamp: new Date().toISOString(),
  };
}

export function isReadinessReportReady(report: ReadinessReport): boolean {
  return report.status === "ready";
}
