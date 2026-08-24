import "dotenv/config";

import { createDatabaseBackup } from "@/lib/backup/backup";
import {
  getProductionInitializationPreview,
  runProductionInitialization,
} from "@/lib/server/production-reset";

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function printCounts(label: string, counts: Record<string, number>) {
  console.log(`\n${label}`);
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table}: ${count}`);
  }
}

async function main() {
  const confirmed = hasFlag("--yes") || hasFlag("-y");

  if (!confirmed) {
    console.error(
      "Production initialization requires explicit confirmation. Re-run with --yes."
    );
    process.exit(1);
  }

  const preview = await getProductionInitializationPreview();
  printCounts("Tables to clear", preview.cleared);
  printCounts("Tables to preserve", preview.preserved);

  console.log("\n[production-init] Creating PostgreSQL backup...");
  const backup = await createDatabaseBackup();
  const backupPath = backup.archivePath ?? backup.sqlPath;

  if (!backupPath) {
    throw new Error("Backup completed without an output file.");
  }

  console.log("[production-init] Backup completed successfully.");
  console.log(`[production-init] Manifest: ${backup.manifestPath}`);
  console.log(`[production-init] File: ${backupPath}`);

  console.log(
    "\n[production-init] Removing development, demo, certification, and imported test data..."
  );
  const report = await runProductionInitialization();

  printCounts("Records deleted", report.deleted);
  printCounts("Records preserved", report.preserved);

  console.log("\n[production-init] Verification");
  console.log(
    `  Status: ${report.verification.passed ? "PASSED" : "FAILED"}`
  );
  console.log(
    `  Operational records remaining: ${report.verification.operationalRecordCount}`
  );
  console.log(`  Products remaining: ${report.verification.productCount}`);

  if (report.verification.retainedBranch) {
    console.log(
      `  Active branch: ${report.verification.retainedBranch.name} (${report.verification.retainedBranch.code})`
    );
  }

  console.log(
    `  Product categories: ${report.verification.retainedProductCategories}`
  );
  console.log(
    `  Expense categories: ${report.verification.retainedExpenseCategories}`
  );
  console.log(
    `  Settings: ${report.verification.retainedSettings ? "present" : "missing"}`
  );

  console.log("  Users:");
  for (const user of report.verification.retainedUsers) {
    console.log(
      `    - ${user.displayName} (${user.username}) · ${user.role} · auth ${user.canAuthenticate ? "ready" : "blocked"}`
    );
  }

  console.log("  Staff:");
  for (const member of report.verification.retainedStaff) {
    console.log(`    - ${member.name} · ${member.role} · ${member.branch}`);
  }

  if (report.verification.errors.length > 0) {
    console.log("  Errors:");
    for (const error of report.verification.errors) {
      console.log(`    - ${error}`);
    }
  }

  if (!report.verification.passed) {
    process.exit(1);
  }

  console.log(
    "\n[production-init] Sonic OS is clean and ready for first-day production testing."
  );
  console.log(`[production-init] Backup preserved at: ${backupPath}`);
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "[production-init] Initialization failed."
  );
  process.exit(1);
});
