import { getAppEnvironment, getEnvironmentProfile } from "@/lib/env";
import { isDatabaseConfigured, verifyDatabaseConnection } from "@/lib/db";
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
  bootstrap?: {
    failedStage: string | null;
    error: string | null;
  };
  timestamp: string;
}

export async function getReadinessReport(): Promise<ReadinessReport> {
  const appEnv = getAppEnvironment();
  const profile = getEnvironmentProfile(appEnv);
  const databaseConfigured = isDatabaseConfigured();

  let databaseConnected = false;
  let migrationsApplied = false;
  let bootstrapComplete = false;
  let bootstrapFailure: ReadinessReport["bootstrap"];

  if (databaseConfigured) {
    try {
      await verifyDatabaseConnection();
      databaseConnected = true;
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
      databaseConnected = false;
      migrationsApplied = false;
      bootstrapComplete = false;
      console.error("[readiness] database check failed:", error);
    }
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
    bootstrap: bootstrapFailure,
    timestamp: new Date().toISOString(),
  };
}

export function isReadinessReportReady(report: ReadinessReport): boolean {
  return report.status === "ready";
}
