import { z } from "zod";
import { resolveRuntimeBackupDir } from "@/lib/backup/runtime";

const backupConfigSchema = z.object({
  backupDir: z.string().min(1),
  compress: z.boolean(),
  pgDumpPath: z.string().min(1),
  psqlPath: z.string().min(1),
  scheduleIntervalMs: z.number().int().positive().optional(),
});

export type BackupConfig = z.infer<typeof backupConfigSchema>;

function resolveBackupDir(): string {
  return resolveRuntimeBackupDir();
}

function resolveScheduleIntervalMs(): number | undefined {
  const raw = process.env.BACKUP_INTERVAL_MS?.trim();
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `BACKUP_INTERVAL_MS must be a positive integer (received "${raw}").`
    );
  }

  return parsed;
}

export function getBackupConfig(): BackupConfig {
  const compressRaw = process.env.BACKUP_COMPRESS?.trim().toLowerCase();

  return backupConfigSchema.parse({
    backupDir: resolveBackupDir(),
    compress: compressRaw === "false" ? false : true,
    pgDumpPath: process.env.PG_DUMP_PATH?.trim() || "pg_dump",
    psqlPath: process.env.PSQL_PATH?.trim() || "psql",
    scheduleIntervalMs: resolveScheduleIntervalMs(),
  });
}

export function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database backup and restore.");
  }

  return databaseUrl;
}
