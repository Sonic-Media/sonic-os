import "dotenv/config";

import { createDatabaseBackup } from "@/lib/backup/backup";
import { PRODUCTION_CONFIRM_RESET } from "@/lib/data-protection/constants";
import {
  isProductionMode,
  requireDestructiveOpsAllowed,
  requireProductionConfirmationToken,
} from "@/lib/env/production-mode";
import {
  getProductionResetPreview,
  runProductionReset,
} from "@/lib/server/production-reset";

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function readConfirmationFlag(): string | undefined {
  const inline = process.argv.find((arg) => arg.startsWith("--confirmation="));
  if (inline) {
    return inline.slice("--confirmation=".length);
  }

  const index = process.argv.indexOf("--confirmation");
  if (index >= 0) {
    return process.argv[index + 1];
  }

  return undefined;
}

function printCounts(label: string, counts: Record<string, number>) {
  console.log(`\n${label}`);
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table}: ${count}`);
  }
}

async function main() {
  const confirmed = hasFlag("--yes") || hasFlag("-y");
  const skipBackup = hasFlag("--skip-backup");
  const resetOnly = hasFlag("--reset-only");
  const confirmation = readConfirmationFlag();

  if (!confirmed) {
    console.error(
      "Production reset requires explicit confirmation. Re-run with --yes."
    );
    console.error(
      "Prefer `npm run db:safe-reset` for the final pre-production transactional wipe."
    );
    process.exit(1);
  }

  try {
    requireDestructiveOpsAllowed("Production reset");
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Reset blocked in production mode."
    );
    process.exit(1);
  }

  if (isProductionMode()) {
    try {
      requireProductionConfirmationToken(
        confirmation,
        PRODUCTION_CONFIRM_RESET
      );
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : "Confirmation required."
      );
      process.exit(1);
    }
  }

  if (!resetOnly) {
    const preview = await getProductionResetPreview();
    printCounts("Operational data to remove", preview.operational);
    printCounts("Master data to retain", preview.retained);
  }

  let backupPath: string | undefined;

  if (!skipBackup && !resetOnly) {
    console.log("\n[production-reset] Creating PostgreSQL backup...");
    const backup = await createDatabaseBackup();
    backupPath = backup.archivePath ?? backup.sqlPath;

    if (!backupPath) {
      throw new Error("Backup completed without an output file.");
    }

    console.log("[production-reset] Backup completed successfully.");
    console.log(`[production-reset] Manifest: ${backup.manifestPath}`);
    console.log(`[production-reset] File: ${backupPath}`);
  }

  console.log("\n[production-reset] Removing operational and test data...");
  const report = await runProductionReset();

  printCounts("Records deleted", report.deleted);
  printCounts("Records retained", report.retained);
  console.log(`\nProducts reset to opening stock state: ${report.productsReset}`);

  console.log("\n[production-reset] Verification");
  console.log(
    `  Status: ${report.verification.passed ? "PASSED" : "FAILED"}`
  );

  if (report.verification.retainedBranch) {
    console.log(
      `  Branch: ${report.verification.retainedBranch.name} (${report.verification.retainedBranch.code})`
    );
  }

  console.log(`  Products: ${report.verification.retainedProducts}`);
  console.log(`  Categories: ${report.verification.retainedCategories}`);
  console.log(
    `  Settings: ${report.verification.retainedSettings ? "present" : "missing"}`
  );

  console.log("  Users:");
  for (const user of report.verification.retainedUsers) {
    console.log(
      `    - ${user.displayName} (${user.username}) · ${user.role}`
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

  console.log("\n[production-reset] Database is clean and production-ready.");
  if (backupPath) {
    console.log(`[production-reset] Backup preserved at: ${backupPath}`);
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "[production-reset] Reset failed."
  );
  process.exit(1);
});
