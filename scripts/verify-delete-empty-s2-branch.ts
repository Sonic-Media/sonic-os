#!/usr/bin/env tsx
/**
 * Verifies delete-empty-s2-branch-production script structure and safety guards.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function readRepo(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function recordCheck(label: string, passed: boolean, detail = "") {
  assert.ok(passed, detail ? `${label}: ${detail}` : label);
  console.log(`PASS ${label}${detail ? ` — ${detail}` : ""}`);
}

function main() {
  const script = readRepo("scripts/delete-empty-s2-branch-production.ts");

  recordCheck(
    "Delete script targets s2 code only",
    script.includes('const TARGET_CODE = "s2"') &&
      script.includes('PROTECTED_CODES = new Set(["main", "branch2"])')
  );

  recordCheck(
    "Delete script counts all Prisma Branch FK relations",
    script.includes("prisma.user.count") &&
      script.includes("prisma.staff.count") &&
      script.includes("prisma.dailyOperation.count") &&
      script.includes("prisma.sale.count") &&
      script.includes("prisma.purchase.count") &&
      script.includes("prisma.expenseRecord.count") &&
      script.includes("prisma.stockMovement.count") &&
      script.includes("prisma.staffPayment.count") &&
      script.includes("prisma.dayClosing.count") &&
      script.includes("prisma.product.count")
  );

  recordCheck(
    "Delete script audits string branchCode references",
    script.includes("auditLogEntry.count") &&
      script.includes("authAuditLog.count") &&
      script.includes("userPreference.count")
  );

  recordCheck(
    "Delete script aborts when FK dependencies > 0",
    script.includes("fkTotal > 0") && script.includes("Deletion aborted")
  );

  recordCheck(
    "Delete script defaults to audit-only (requires --execute)",
    script.includes('--execute') &&
      script.includes("AUDIT ONLY") &&
      script.includes("Refusing to delete on localhost without --allow-local")
  );

  recordCheck(
    "Branches service has no unsafe hard-delete API for branches",
    !readRepo("lib/server/services/branches-service.ts").includes("branch.delete")
  );

  recordCheck(
    "Production branch codes remain main and branch2 in codes.ts",
    readRepo("lib/branch/codes.ts").includes('salaama: "branch2"')
  );

  console.log("\nAll delete-empty-s2-branch verification checks passed.");
}

main();
