import "dotenv/config";

import { createDatabaseBackup } from "@/lib/backup/backup";

async function main() {
  const result = await createDatabaseBackup();
  const outputFile = result.archivePath ?? result.sqlPath;

  console.log("[backup] Database backup completed.");
  console.log(`[backup] Manifest: ${result.manifestPath}`);

  if (outputFile) {
    console.log(`[backup] File: ${outputFile}`);
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "[backup] Backup failed."
  );
  process.exit(1);
});
