import { getAppEnvironment, getEnvironmentProfile } from "@/lib/env";
import { isDatabaseConfigured, prisma } from "@/lib/db";

export interface ReadinessReport {
  status: "ready" | "not_ready";
  environment: string;
  checks: {
    databaseConfigured: boolean;
    databaseConnected: boolean;
    migrationsApplied: boolean;
  };
  timestamp: string;
}

export async function getReadinessReport(): Promise<ReadinessReport> {
  const appEnv = getAppEnvironment();
  const profile = getEnvironmentProfile(appEnv);
  const databaseConfigured = isDatabaseConfigured();

  let databaseConnected = false;
  let migrationsApplied = false;

  if (databaseConfigured) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;

      const migrationRows = await prisma.$queryRaw<
        { count: bigint }[]
      >`SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL`;

      migrationsApplied = Number(migrationRows[0]?.count ?? 0) > 0;
    } catch {
      databaseConnected = false;
      migrationsApplied = false;
    }
  }

  const checks = {
    databaseConfigured: profile.requiresDatabase ? databaseConfigured : true,
    databaseConnected: profile.requiresDatabase ? databaseConnected : true,
    migrationsApplied: profile.requiresDatabase ? migrationsApplied : true,
  };

  const ready = Object.values(checks).every(Boolean);

  return {
    status: ready ? "ready" : "not_ready",
    environment: appEnv,
    checks,
    timestamp: new Date().toISOString(),
  };
}

export function isReadinessReportReady(report: ReadinessReport): boolean {
  return report.status === "ready";
}
