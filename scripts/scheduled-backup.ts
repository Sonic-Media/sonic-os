import "dotenv/config";

import { getBackupConfig } from "@/lib/backup/config";
import { runScheduledBackup } from "@/lib/backup/backup";

async function runOnce(): Promise<void> {
  const result = await runScheduledBackup();
  const outputFile = result.archivePath ?? result.sqlPath;

  console.log("[backup:schedule] Scheduled backup completed.");
  console.log(`[backup:schedule] Manifest: ${result.manifestPath}`);

  if (outputFile) {
    console.log(`[backup:schedule] File: ${outputFile}`);
  }
}

async function main() {
  const config = getBackupConfig();

  if (!config.scheduleIntervalMs) {
    await runOnce();
    return;
  }

  console.log(
    `[backup:schedule] Starting scheduler (interval=${config.scheduleIntervalMs}ms).`
  );

  await runOnce();

  setInterval(() => {
    runOnce().catch((error) => {
      console.error(
        error instanceof Error
          ? error.message
          : "[backup:schedule] Scheduled backup failed."
      );
    });
  }, config.scheduleIntervalMs);
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "[backup:schedule] Scheduler failed to start."
  );
  process.exit(1);
});
