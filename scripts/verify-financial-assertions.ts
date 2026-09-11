import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { FINANCIAL_ASSERTION_INVENTORY } from "./verify/financial-assertion-inventory";
import {
  expectedMergedBuyingPrice,
  expectedPurchaseTotalCost,
  expectedRemainingStock,
  expectedReportTotalsFromEntries,
  expectedSaleTotals,
  expectedSalesForDatePrefix,
  expectedWeightedAverageBuyingPrice,
} from "./verify/financial-expectations";

const VERIFY_SCRIPT_GLOB = [
  "scripts/verify-sales-module.ts",
  "scripts/verify-purchasing-module.ts",
  "scripts/verify-expenses-module.ts",
  "scripts/verify-daily-operations-module.ts",
  "scripts/verify-reports-aggregation.ts",
  "scripts/verify-reports-module.ts",
  "scripts/verify-branch-isolation.ts",
  "scripts/verify-stock-module.ts",
  "scripts/verify-bootstrap.ts",
  "scripts/verify-financial-defaults.ts",
  "scripts/verify-auth-storage-isolation.ts",
  "scripts/verify-audit-cache-integrity.ts",
  "scripts/verify-branch-selection-authority.ts",
  "scripts/verify-historical-import.ts",
  "scripts/verify-roles-permissions-module.ts",
  "scripts/verify-staff-module.ts",
  "scripts/verify-users-module.ts",
  "scripts/verify-branch-operations-isolation.ts",
];

function recordCheck(
  id: string,
  name: string,
  passed: boolean,
  detail: string
) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function scanStaticInventory(): void {
  recordCheck(
    "A",
    "Financial assertion inventory documented",
    FINANCIAL_ASSERTION_INVENTORY.length >= 8,
    `entries=${FINANCIAL_ASSERTION_INVENTORY.length}`
  );

  const unsafeRemoved = FINANCIAL_ASSERTION_INVENTORY.filter((item) =>
    item.action.startsWith("REMOVED")
  );
  recordCheck(
    "B",
    "Unsafe production assumptions inventoried with REMOVED action",
    unsafeRemoved.some((item) => item.file.includes("verify-branch-isolation")),
    unsafeRemoved.map((item) => `${item.file}:${item.value}`).join("; ")
  );

  recordCheck(
    "C",
    "Shared financial expectation helpers exist",
    fs.existsSync(path.join(process.cwd(), "scripts/verify/financial-expectations.ts")),
    "scripts/verify/financial-expectations.ts"
  );
}

function scanRefactoredScripts(): void {
  const sales = readRepoFile("scripts/verify-sales-module.ts");
  recordCheck(
    "D",
    "Sales certification derives totals from controlled inputs",
    sales.includes("expectedSaleTotals") &&
      sales.includes("expectedRemainingStock") &&
      !sales.includes("43500") &&
      !sales.includes("13500"),
    "uses expectedSaleTotals / expectedRemainingStock"
  );

  const purchasing = readRepoFile("scripts/verify-purchasing-module.ts");
  recordCheck(
    "E",
    "Purchasing certification derives totals from controlled inputs",
    purchasing.includes("expectedPurchaseTotalCost") &&
      purchasing.includes("expectedMergedBuyingPrice") &&
      !purchasing.includes("90_000") &&
      !purchasing.match(/12200(?!\d)/),
    "uses expectedPurchaseTotalCost / expectedMergedBuyingPrice"
  );

  const branchIsolation = readRepoFile("scripts/verify-branch-isolation.ts");
  recordCheck(
    "F",
    "Branch isolation no longer assumes seed inventory value",
    !branchIsolation.includes("752_000") &&
      !branchIsolation.includes("salaamaDbCount === 15") &&
      branchIsolation.includes("salaamaDbValue"),
    "compares API metrics to PostgreSQL-derived salaamaDbValue"
  );

  const reportsAgg = readRepoFile("scripts/verify-reports-aggregation.ts");
  recordCheck(
    "G",
    "Report aggregation scenarios derive expected totals from fixtures",
    reportsAgg.includes("expectedReportTotalsFromEntries") &&
      reportsAgg.includes("expectedBranchSales"),
    "fixture inputs drive expected totals"
  );

  const reportsModule = readRepoFile("scripts/verify-reports-module.ts");
  recordCheck(
    "H",
    "Reports module certification does not hardcode historical business totals",
    !reportsModule.includes("HISTORICAL_SALES") &&
      !reportsModule.includes("JULY_SALES") &&
      reportsModule.includes("expectedReportTotalsFromEntries"),
    "historical totals derived from PostgreSQL entries"
  );

  const unsafePatterns = VERIFY_SCRIPT_GLOB.flatMap((scriptPath) => {
    const source = readRepoFile(scriptPath);
    const hits: string[] = [];
    if (/752_000/.test(source)) hits.push(`${scriptPath}:752_000`);
    if (/salaamaDbCount === 15/.test(source)) hits.push(`${scriptPath}:salaamaDbCount===15`);
    if (/assert\.equal\([^)]*43500/.test(source)) hits.push(`${scriptPath}:43500`);
    return hits;
  });
  recordCheck(
    "I",
    "No remaining known unsafe hardcoded business assertions",
    unsafePatterns.length === 0,
    unsafePatterns.join("; ") || "none found"
  );
}

function testHelperDerivations(): void {
  const sale = expectedSaleTotals({
    quantity: 3,
    unitPrice: 15000,
    buyingPrice: 10000,
    discount: 1500,
  });
  assert.equal(sale.total, 3 * 15000 - 1500);
  assert.equal(sale.profit, sale.total - 3 * 10000);
  recordCheck("J", "expectedSaleTotals matches computeSalePreview", true, `total=${sale.total}`);

  const purchaseTotal = expectedPurchaseTotalCost(10, 9000);
  assert.equal(purchaseTotal, 90000);
  recordCheck(
    "K",
    "expectedPurchaseTotalCost derives quantity × price",
    true,
    `total=${purchaseTotal}`
  );

  const merged = expectedMergedBuyingPrice([
    { quantity: 4, buyingPrice: 11000 },
    { quantity: 6, buyingPrice: 13000 },
  ]);
  assert.equal(merged, Math.round((4 * 11000 + 6 * 13000) / 10));
  recordCheck("L", "expectedMergedBuyingPrice derives weighted average", true, `avg=${merged}`);

  const stock = expectedRemainingStock(100, [3, 2, 20]);
  assert.equal(stock, 75);
  recordCheck("M", "expectedRemainingStock derives initial − sold", true, `remaining=${stock}`);

  const avg = expectedWeightedAverageBuyingPrice(0, 8000, 10, 9000);
  assert.equal(avg, 9000);
  recordCheck(
    "N",
    "expectedWeightedAverageBuyingPrice derives from receipt inputs",
    true,
    `avg=${avg}`
  );

  const entries = [
    {
      sales: 50000,
      expenses: [{ id: "lunch", name: "Lunch", amount: 1000 }],
      date: "2026-07-15",
      branch: "main" as const,
    },
    {
      sales: 30000,
      expenses: [],
      date: "2026-08-01",
      branch: "main" as const,
    },
  ];
  const reportTotals = expectedReportTotalsFromEntries(entries);
  assert.equal(reportTotals.totalSales, 80000);
  assert.equal(reportTotals.totalExpenses, 1000);
  assert.equal(
    expectedSalesForDatePrefix(entries, "2026-07"),
    50000
  );
  recordCheck(
    "O",
    "Report total helpers derive from fixture entry inputs",
    true,
    `sales=${reportTotals.totalSales} expenses=${reportTotals.totalExpenses}`
  );
}

function testGoodPatternsPreserved(): void {
  const expenses = readRepoFile("scripts/verify-expenses-module.ts");
  recordCheck(
    "P",
    "Expenses module continues DB-derived expected totals",
    expenses.includes("expectedTotal") && expenses.includes("reduce"),
    "PostgreSQL sum drives certification"
  );

  const operations = readRepoFile("scripts/verify-daily-operations-module.ts");
  recordCheck(
    "Q",
    "Daily operations derives close-day cash from controlled inputs",
    operations.includes("saleAmount") && operations.includes("expenseAmount"),
    "baseline + controlled amounts"
  );
}

async function main() {
  console.log("Financial assertions verification (Fix #22)\n");
  scanStaticInventory();
  scanRefactoredScripts();
  testHelperDerivations();
  testGoodPatternsPreserved();
  console.log("\nAll financial assertion checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
