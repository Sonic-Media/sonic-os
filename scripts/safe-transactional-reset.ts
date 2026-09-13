import "dotenv/config";

import {
  BUSINESS_DATA_RESET_CONFIRMATION,
  PRODUCTION_CONFIRM_RESET,
} from "@/lib/data-protection/constants";
import {
  assertSafeTransactionalResetTarget,
  describeDatabaseTarget,
} from "@/lib/server/database-target-guard";
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
  const dryRun = hasFlag("--dry-run");
  const confirmed = hasFlag("--yes") || hasFlag("-y");
  const confirmation = readConfirmationFlag();

  if (!confirmed && !dryRun) {
    console.error(
      "Safe transactional reset requires explicit confirmation. Re-run with --yes."
    );
    console.error(
      `Also pass --confirmation "${BUSINESS_DATA_RESET_CONFIRMATION}".`
    );
    process.exit(1);
  }

  if (!dryRun && confirmation?.trim() !== BUSINESS_DATA_RESET_CONFIRMATION) {
    console.error(
      `Confirmation phrase required. Re-run with --confirmation "${BUSINESS_DATA_RESET_CONFIRMATION}".`
    );
    process.exit(1);
  }

  let identity;
  try {
    identity = assertSafeTransactionalResetTarget();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Reset target is not safe.";
    console.error(message);
    process.exit(1);
  }

  console.log("\n[safe-reset] Target database (safe summary)");
  console.log(`  host: ${identity.host}`);
  console.log(`  port: ${identity.port}`);
  console.log(`  database: ${identity.database}`);
  console.log(`  user: ${identity.user}`);
  console.log(`  schema: ${identity.schema}`);
  console.log(`  fingerprint: ${identity.fingerprint}`);
  console.log(`  local host: ${identity.isLocalHost}`);
  console.log(`  neon host: ${identity.isNeonHost}`);
  console.log(`  APP_ENV: ${identity.appEnv}`);
  console.log(`  APP_MODE: ${identity.appMode}`);
  console.log(`  production mode: ${identity.isProductionMode}`);
  console.log(`  deployment: ${identity.deploymentEnvironment}`);
  console.log(`  reset production deployment: ${identity.isResetProductionDeployment}`);

  if (dryRun) {
    const preview = await getSafeTransactionalResetPreview();
    console.log("\n[safe-reset] Dry run — no data deleted");
    console.log("Transactional tables:", preview.transactional);
    console.log("Preserved tables:", preview.preserved);
    return;
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
  console.log(
    `[safe-reset] Product stock levels reset on ${report.productStockResetCount} product(s).`
  );
  console.log("[safe-reset] Preserved records:", report.preserved);

  console.log("\n[safe-reset] Verification");
  if (report.verification.passed) {
    console.log(
      "✓ Transactional data cleared. Identity, settings, and product catalog preserved."
    );
    console.log("✓ No open business days or pending closing requests remain.");
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

  const after = describeDatabaseTarget();
  console.log(`\n[safe-reset] Completed against fingerprint ${after.fingerprint}`);
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "[safe-reset] Reset failed."
  );
  process.exit(1);
});
