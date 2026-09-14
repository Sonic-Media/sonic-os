#!/usr/bin/env tsx
/**
 * Safe, non-destructive diagnosis helper for Owner Shop Reset Preview failures.
 * Does NOT POST /api/admin/shop-reset and does NOT delete data.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  assertSafeTransactionalResetTarget,
  describeDatabaseTarget,
} from "@/lib/server/database-target-guard";

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function printSection(title: string) {
  console.log(`\n=== ${title} ===`);
}

function main() {
  console.log("Owner Shop Reset Preview failure diagnosis (non-destructive)\n");

  printSection("POST /api/admin/shop-reset step order (runBranchShopReset)");
  const steps = [
    "1. requireSession + requireOwner (also enforced by route ownerOnly: true)",
    "2. assertSafeTransactionalResetTarget() — POST only; GET preview skips this",
    "3. resolveShopResetScope + assertShopResetConfirmation",
    "4. resolveBranchTargets (main + salaama for scope=both)",
    "5. createDatabaseBackup()",
    "6. Prisma $transaction → deleteBranchScopedData + recordSecurityAuditInTransaction",
    "7. countBranchScopedData + validateShopResetVerification",
    "8. disconnectAdminPrismaClient + JSON response",
  ];
  for (const step of steps) {
    console.log(step);
  }

  printSection("Current environment target (safe metadata only)");
  const identity = describeDatabaseTarget();
  console.log(
    JSON.stringify(
      {
        hostCategory: identity.isLocalHost
          ? "local"
          : identity.isNeonHost
            ? "neon"
            : "remote-non-neon",
        database: identity.database,
        fingerprint: identity.fingerprint,
        appEnv: identity.appEnv,
        appMode: identity.appMode,
        isProductionMode: identity.isProductionMode,
        vercel: Boolean(process.env.VERCEL),
        vercelEnv: process.env.VERCEL_ENV ?? null,
        allowNeonTransactionalReset:
          process.env.ALLOW_NEON_TRANSACTIONAL_RESET?.trim().toLowerCase() ===
          "true",
        allowNonLocalTransactionalReset:
          process.env.ALLOW_NONLOCAL_TRANSACTIONAL_RESET?.trim().toLowerCase() ===
          "true",
        allowDestructiveOps:
          process.env.ALLOW_DESTRUCTIVE_OPS?.trim().toLowerCase() === "true",
      },
      null,
      2
    )
  );

  printSection("Database target guard result in THIS environment");
  try {
    assertSafeTransactionalResetTarget();
    console.log("PASS — guard would allow reset in this environment.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log("FAIL — guard would block reset in this environment.");
    console.log(`Guard message: ${message}`);
    console.log("Public API message (NODE_ENV=production/preview): Unexpected server error.");
    console.log("Public HTTP status: 500");
    console.log("Public error code: internal_error");
  }

  printSection("Error masking check");
  const loggingSource = readRepoFile("lib/server/security/logging.ts");
  console.log(
    loggingSource.includes('message: "Unexpected server error."')
      ? "Non-ApiError exceptions are masked as 'Unexpected server error.' outside development."
      : "Could not confirm error masking behavior."
  );

  printSection("Reset systems comparison");
  console.log(
    [
      "A. NEW Shop Reset → POST /api/admin/shop-reset → branch-shop-reset-service.ts",
      "   Uses assertSafeTransactionalResetTarget + createDatabaseBackup + branch-scoped deleteMany",
      "B. LEGACY Maintenance Reset → POST /api/admin/business-reset → business-data-reset-service.ts",
      "   Does NOT use database target guard or automatic backup",
      "Manual backup (Maintenance) → POST /api/admin/backup → backup-service.ts triggerDatabaseBackup",
      "   Uses createDatabaseBackup but NOT assertSafeTransactionalResetTarget",
    ].join("\n")
  );

  printSection("Vercel runtime log signature to inspect manually");
  console.log(
    [
      'Event: shop_reset.route.error (app/api/admin/shop-reset/route.ts)',
      'Also: request.error from handleRouteError / jsonError',
      'Look for fields: errorMessage, stack, pathname=/api/admin/shop-reset, method=POST',
      "This agent cannot read Vercel Preview function logs (deployment SSO protected; no VERCEL_TOKEN).",
    ].join("\n")
  );

  printSection("Scope=both branch resolution (static)");
  const serviceSource = readRepoFile("lib/server/branch-shop-reset-service.ts");
  const bothUsesMainAndSalaama =
    serviceSource.includes('getBranchIdByCode("main")') &&
    serviceSource.includes('getBranchIdByCode("salaama")');
  console.log(
    bothUsesMainAndSalaama
      ? "PASS — both scope resolves canonical main + salaama branch IDs."
      : "FAIL — could not confirm both-scope branch resolution."
  );

  console.log("\nDiagnosis helper complete. No destructive reset executed.");
}

main();
