import "dotenv/config";

import { PRODUCTION_CONFIRM_RESET } from "@/lib/data-protection/constants";
import {
  isProductionMode,
  requireDestructiveOpsAllowed,
  requireProductionConfirmationToken,
} from "@/lib/env/production-mode";
import {
  getSafeTransactionalResetPreview,
  runSafeTransactionalReset,
} from "@/lib/server/safe-transactional-reset";

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

async function main() {
  const skipBackup = hasFlag("--skip-backup");
  const confirmed = hasFlag("--yes") || hasFlag("-y");
  const confirmation = readConfirmationFlag();

  if (!confirmed) {
    console.error(
      "Safe transactional reset requires explicit confirmation. Re-run with --yes."
    );
    process.exit(1);
  }

  try {
    requireDestructiveOpsAllowed("Transactional data reset");
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Reset blocked in production mode."
    );
    console.error(
      "Set ALLOW_DESTRUCTIVE_OPS=true for a controlled maintenance window."
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
      console.error(
        `Re-run with --confirmation "${PRODUCTION_CONFIRM_RESET}"`
      );
      process.exit(1);
    }
  }

  const preview = await getSafeTransactionalResetPreview();
  console.log("\n[safe-reset] Preview");
  console.log("Transactional tables to clear:", preview.transactional);
  console.log("Preserved tables:", preview.preserved);

  console.log("\n[safe-reset] Clearing transactional data...");
  const report = await runSafeTransactionalReset({ skipBackup });

  console.log("\n[safe-reset] Deleted records:", report.deleted);
  console.log("[safe-reset] Preserved records:", report.preserved);

  console.log("\n[safe-reset] Verification");
  if (report.verification.passed) {
    console.log("✓ Transactional data cleared. Identity and settings preserved.");
  } else {
    console.error("✗ Verification failed:");
    for (const issue of report.verification.errors) {
      console.error(`  - ${issue}`);
    }
    process.exit(1);
  }

  if (report.backupPath) {
    console.log(`\n[safe-reset] Backup preserved at: ${report.backupPath}`);
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "[safe-reset] Reset failed."
  );
  process.exit(1);
});
