import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type BackupEngine = "pg_dump" | "json";

export function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.VERCEL_ENV
  );
}

export function resolveRuntimeBackupDir(): string {
  const configured = process.env.BACKUP_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }

  if (isServerlessRuntime()) {
    return path.join("/tmp", "sonic-os-backups");
  }

  return path.resolve(process.cwd(), "backups");
}

export function ensureBackupDirectory(backupDir: string): void {
  try {
    fs.mkdirSync(backupDir, { recursive: true });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown filesystem error";
    throw new Error(
      `Cannot create backup directory "${backupDir}": ${detail}`
    );
  }

  try {
    fs.accessSync(backupDir, fs.constants.W_OK);
  } catch {
    throw new Error(`Permission denied writing to backup directory "${backupDir}".`);
  }
}

export function isPgDumpAvailable(pgDumpPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(pgDumpPath, ["--version"], {
      stdio: "ignore",
    });

    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export async function resolveBackupEngine(
  pgDumpPath: string
): Promise<BackupEngine> {
  const forced = process.env.BACKUP_ENGINE?.trim().toLowerCase();
  if (forced === "json") {
    return "json";
  }
  if (forced === "pg_dump") {
    return "pg_dump";
  }

  if (isServerlessRuntime()) {
    return "json";
  }

  if (await isPgDumpAvailable(pgDumpPath)) {
    return "pg_dump";
  }

  return "json";
}
