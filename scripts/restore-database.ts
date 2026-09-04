import "dotenv/config";

import { resolveBackupInputPath } from "@/lib/backup/paths";
import { restoreDatabaseBackup } from "@/lib/backup/backup";

function readCliArgs(): { inputPath: string; confirmed: boolean } {
  const args = process.argv.slice(2);
  let inputPath = "";
  let confirmed = false;

  for (const arg of args) {
    if (arg === "--yes" || arg === "-y") {
      confirmed = true;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (!inputPath) {
      inputPath = arg;
    }
  }

  if (!inputPath) {
    throw new Error(
      "Usage: npm run db:restore -- <backup-file.sql|backup-file.sql.gz|backup-file.json|backup-file.json.gz> [--yes]"
    );
  }

  return { inputPath, confirmed };
}

async function main() {
  const { inputPath, confirmed } = readCliArgs();
  const resolvedInput = resolveBackupInputPath(inputPath);

  if (!confirmed) {
    throw new Error(
      "Restore is destructive and replaces current database contents. Re-run with --yes to confirm."
    );
  }

  console.log(`[restore] Restoring database from ${resolvedInput}...`);
  await restoreDatabaseBackup({ inputPath: resolvedInput });
  console.log("[restore] Database restore completed.");
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "[restore] Restore failed."
  );
  process.exit(1);
});
