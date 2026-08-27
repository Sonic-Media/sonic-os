import { isProductionMode } from "@/lib/env/production-mode";
import { triggerDatabaseBackup } from "@/lib/server/backup/backup-service";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let schedulerStarted = false;
let schedulerTimer: ReturnType<typeof setInterval> | undefined;

function resolveDailyBackupIntervalMs(): number {
  const configured = process.env.BACKUP_INTERVAL_MS?.trim();
  if (configured) {
    const parsed = Number(configured);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return ONE_DAY_MS;
}

function shouldStartDailyBackupScheduler(): boolean {
  if (process.env.ENABLE_DAILY_BACKUP?.trim().toLowerCase() === "false") {
    return false;
  }

  if (process.env.ENABLE_DAILY_BACKUP?.trim().toLowerCase() === "true") {
    return true;
  }

  return isProductionMode();
}

async function runScheduledBackupSafely(): Promise<void> {
  try {
    const result = await triggerDatabaseBackup({ trigger: "scheduled" });
    console.info(
      `[sonic-os] Scheduled database backup completed (${result.filePath}).`
    );
  } catch (error) {
    console.error(
      "[sonic-os] Scheduled database backup failed:",
      error instanceof Error ? error.message : error
    );
  }
}

export function startDailyBackupScheduler(): void {
  if (schedulerStarted || !shouldStartDailyBackupScheduler()) {
    return;
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return;
  }

  schedulerStarted = true;
  const intervalMs = resolveDailyBackupIntervalMs();

  console.info(
    `[sonic-os] Daily backup scheduler enabled (interval=${intervalMs}ms).`
  );

  void runScheduledBackupSafely();

  schedulerTimer = setInterval(() => {
    void runScheduledBackupSafely();
  }, intervalMs);

  if (typeof schedulerTimer.unref === "function") {
    schedulerTimer.unref();
  }
}

export function stopDailyBackupScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = undefined;
  }
  schedulerStarted = false;
}
