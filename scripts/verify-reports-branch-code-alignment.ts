#!/usr/bin/env tsx
/**
 * Fix #26 — Reports branch code alignment
 *
 * Ensures Reports UI uses PostgreSQL Branch.code (e.g. main, branch2)
 * instead of deprecated settings BRANCH_IDS (main, salaama).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { aggregateEntries, getBranchTotals } from "@/lib/aggregations";
import {
  getActiveBranchesForReports,
  getActiveBranchCodes,
} from "@/lib/branch/registry";
import type { BranchEntity } from "@/types/branch";
import type { Entry } from "@/types";

const ROOT = process.cwd();

function readRepoFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function makeProductionBranches(): BranchEntity[] {
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
      name: "Salaama",
      code: "branch2",
      address: "Binzaari stage, Salaama Rd, Kampala",
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

function recordCheck(label: string, pass: boolean, detail?: string) {
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
  console.log(`PASS ${label}`);
}

async function main() {
  console.log("Fix #26 — Reports branch code alignment\n");

  const branchTotalsComponent = readRepoFile(
    "components/reports/reports-branch-totals.tsx"
  );
  recordCheck(
    "Reports branch totals uses BranchProvider",
    branchTotalsComponent.includes("useBranch") &&
      branchTotalsComponent.includes("branch.code") &&
      !branchTotalsComponent.includes("useSettings"),
    "must use DB branch codes from BranchProvider"
  );

  recordCheck(
    "Reports branch totals does not use deprecated BRANCH_IDS salaama lookup",
    !branchTotalsComponent.includes("branch.id") ||
      !branchTotalsComponent.includes("useSettings"),
    "must not iterate settings branch ids"
  );

  const useReports = readRepoFile("hooks/use-reports.ts");
  recordCheck(
    "useReports empty summary does not seed salaama keys",
    !useReports.includes("BRANCH_IDS") &&
      useReports.includes("byBranch: {}"),
    "empty state must not hardcode deprecated branch ids"
  );

  const productionBranches = makeProductionBranches();
  const branchCodes = getActiveBranchCodes(productionBranches);
  recordCheck(
    "Production branch codes resolve from DB entities",
    branchCodes.includes("main") &&
      branchCodes.includes("branch2") &&
      !branchCodes.includes("salaama"),
    `codes=${branchCodes.join(",")}`
  );

  const reportBranches = getActiveBranchesForReports(productionBranches);
  recordCheck(
    "Report UI branches preserve display names",
    reportBranches.some((b) => b.code === "main" && b.name === "Kansanga") &&
      reportBranches.some((b) => b.code === "branch2" && b.name === "Salaama"),
    "Kansanga/Salaama labels with main/branch2 codes"
  );

  const entries = [
    makeEntry({
      branch: "main",
      sales: 70_000,
      expenses: [{ id: "lunch", name: "Lunch", amount: 5_000 }],
    }),
    makeEntry({
      branch: "branch2",
      sales: 80_000,
      expenses: [{ id: "lunch", name: "Lunch", amount: 3_000 }],
    }),
  ];

  const summary = aggregateEntries(entries, { branchIds: branchCodes });
  recordCheck(
    "Server aggregation keys match DB branch codes",
    typeof summary.byBranch.main === "object" &&
      typeof summary.byBranch.branch2 === "object" &&
      summary.byBranch.salaama === undefined,
    "byBranch uses main and branch2"
  );

  for (const branch of reportBranches) {
    const totals = getBranchTotals(summary.byBranch, branch.code);
    recordCheck(
      `Reports lookup succeeds for ${branch.name} (${branch.code})`,
      typeof totals.sales === "number" && typeof totals.expenses === "number",
      `sales=${totals.sales}`
    );
  }

  recordCheck(
    "Salaama (branch2) totals remain branch-correct",
    getBranchTotals(summary.byBranch, "branch2").sales === 80_000,
    "branch2 sales isolated from main"
  );

  let legacyLookupThrows = false;
  try {
    getBranchTotals(summary.byBranch, "salaama");
  } catch (error) {
    legacyLookupThrows =
      error instanceof Error &&
      error.message.includes("salaama") &&
      error.message.includes("missing");
  }
  recordCheck(
    "Legacy salaama key lookup fails (integrity guard preserved)",
    legacyLookupThrows,
    "getBranchTotals still throws for wrong client alias"
  );

  console.log("\nAll reports branch code alignment checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
