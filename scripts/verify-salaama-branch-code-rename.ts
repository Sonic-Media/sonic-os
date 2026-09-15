#!/usr/bin/env tsx
/**
 * Salaama branch code rename — focused verification (codes, validation, reports, bootstrap safety).
 */
import assert from "node:assert/strict";
import {
  branchCodesReferToSameInventory,
  getEquivalentBranchCodes,
  resolveInventoryBranchCode,
} from "@/lib/branch/codes";
import {
  hasValidationErrors,
  validateBranchInput,
} from "@/lib/branch/validation";
import { aggregateEntries, getBranchTotals } from "@/lib/aggregations";
import {
  getActiveBranchesForReports,
  getActiveBranchCodes,
} from "@/lib/branch/registry";
import { normalizeBranchId } from "@/lib/reports/branch-totals";
import {
  resolveShopResetLookupCodes,
  resolveShopResetScope,
} from "@/lib/shop-reset/constants";
import { SALAAMA_BRANCH_CODE, SALAAMA_BRANCH_NAME } from "@/lib/constants";
import type { BranchEntity } from "@/types/branch";
import type { Entry } from "@/types";

function recordCheck(label: string, pass: boolean, detail?: string) {
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
  console.log(`PASS ${label}${detail ? ` — ${detail}` : ""}`);
}

function makeProductionBranches(code: "branch2" | "salaama"): BranchEntity[] {
  return [
    {
      id: "ec637cd3-e3ce-4fea-9cbf-4d16aec55f6b",
      name: "Kansanga",
      code: "main",
      active: true,
      createdAt: "2026-08-24T09:14:17.771Z",
    },
    {
      id: "f0eb9232-a8d2-492a-ae16-eda47407700a",
      name: SALAAMA_BRANCH_NAME,
      code,
      active: true,
      createdAt: "2026-08-27T22:00:25.199Z",
    },
  ];
}

function makeEntry(
  overrides: Partial<Entry> & Pick<Entry, "branch" | "sales">
): Entry {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    date: overrides.date ?? "2026-09-11",
    time: overrides.time ?? "10:00",
    timestamp: overrides.timestamp ?? Date.now(),
    branch: overrides.branch,
    sales: overrides.sales,
    expenses: overrides.expenses ?? [],
    staffId: overrides.staffId ?? null,
    staffName: overrides.staffName ?? "Owner",
    createdBy: overrides.createdBy,
    notes: overrides.notes ?? "",
    status: overrides.status ?? "completed",
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  };
}

async function main() {
  console.log("Salaama branch code rename verification\n");

  // A. Branch identity / lookup
  recordCheck(
    "Authoritative Salaama code is salaama",
    resolveInventoryBranchCode("salaama") === "salaama",
    resolveInventoryBranchCode("salaama")
  );
  recordCheck(
    "Legacy branch2 resolves to salaama",
    resolveInventoryBranchCode("branch2") === "salaama",
    resolveInventoryBranchCode("branch2")
  );
  recordCheck(
    "main resolves Kansanga",
    resolveInventoryBranchCode("main") === "main" &&
      resolveInventoryBranchCode("kansanga") === "main"
  );
  recordCheck(
    "Equivalent codes include legacy alias during transition",
    getEquivalentBranchCodes("salaama").includes("branch2") &&
      getEquivalentBranchCodes("branch2").includes("salaama"),
    getEquivalentBranchCodes("salaama").join(",")
  );
  recordCheck(
    "Salaama and branch2 refer to same inventory branch",
    branchCodesReferToSameInventory("salaama", "branch2")
  );

  // B. Branch management validation
  const productionWithBranch2 = makeProductionBranches("branch2");
  const ghostSalaama: BranchEntity = {
    id: "ghost-salaama-bootstrap",
    name: SALAAMA_BRANCH_NAME,
    code: SALAAMA_BRANCH_CODE,
    active: true,
    createdAt: "2026-09-01T00:00:00.000Z",
  };
  const duplicateScenario = [...productionWithBranch2, ghostSalaama];

  const editErrors = validateBranchInput(
    { name: SALAAMA_BRANCH_NAME, code: SALAAMA_BRANCH_CODE },
    duplicateScenario,
    productionWithBranch2[1]!.id
  );
  recordCheck(
    "Edit form rejects salaama when bootstrap ghost duplicate exists",
    hasValidationErrors(editErrors),
    JSON.stringify(editErrors)
  );

  const postReconcileBranches = makeProductionBranches("branch2");
  const postReconcileErrors = validateBranchInput(
    { name: SALAAMA_BRANCH_NAME, code: SALAAMA_BRANCH_CODE },
    postReconcileBranches,
    postReconcileBranches[1]!.id
  );
  recordCheck(
    "Edit form accepts salaama after duplicate ghost is removed",
    !hasValidationErrors(postReconcileErrors),
    JSON.stringify(postReconcileErrors)
  );

  const duplicateMain = validateBranchInput(
    { name: "Other", code: "main" },
    postReconcileBranches
  );
  recordCheck(
    "Duplicate main is rejected",
    duplicateMain.code === "A branch with this code already exists."
  );

  const duplicateSalaama = validateBranchInput(
    { name: "Other Salaama", code: SALAAMA_BRANCH_CODE },
    postReconcileBranches
  );
  recordCheck(
    "Duplicate salaama is rejected on create",
    duplicateSalaama.code === "A branch with this code already exists."
  );

  // C. Reports
  const targetBranches = makeProductionBranches("salaama");
  const branchCodes = getActiveBranchCodes(targetBranches);
  recordCheck(
    "Target production branch codes use salaama",
    branchCodes.includes("main") &&
      branchCodes.includes("salaama") &&
      !branchCodes.includes("branch2"),
    branchCodes.join(",")
  );

  const reportBranches = getActiveBranchesForReports(targetBranches);
  recordCheck(
    "Report UI shows Kansanga/Salaama with main/salaama codes",
    reportBranches.some((b) => b.code === "main" && b.name === "Kansanga") &&
      reportBranches.some((b) => b.code === "salaama" && b.name === SALAAMA_BRANCH_NAME)
  );

  const entries = [
    makeEntry({ branch: "main", sales: 70_000 }),
    makeEntry({ branch: "branch2", sales: 80_000 }),
  ];
  const summary = aggregateEntries(entries, { branchIds: branchCodes });
  recordCheck(
    "Legacy branch2 entry aggregates under salaama bucket",
    typeof summary.byBranch.main === "object" &&
      typeof summary.byBranch.salaama === "object" &&
      summary.byBranch.branch2 === undefined,
    `keys=${Object.keys(summary.byBranch).join(",")}`
  );
  recordCheck(
    "Salaama totals include legacy branch2 sales",
    getBranchTotals(summary.byBranch, "salaama").sales === 80_000
  );
  recordCheck(
    "normalizeBranchId maps branch2 to salaama",
    normalizeBranchId("branch2") === "salaama"
  );

  // D. Shop reset transition
  recordCheck(
    "Shop reset scope accepts salaama and legacy branch2",
    resolveShopResetScope("salaama") === "salaama" &&
      resolveShopResetScope("branch2") === "salaama"
  );
  recordCheck(
    "Shop reset lookup uses authoritative salaama code",
    resolveShopResetLookupCodes("salaama").join(",") === "salaama"
  );

  console.log("\nAll Salaama branch code rename checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
