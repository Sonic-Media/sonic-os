import assert from "node:assert/strict";
import { aggregateEntries, getBranchTotals } from "@/lib/aggregations";
import { getDashboardChartDataFromEntries } from "@/lib/chart-data";
import { buildReportInsights } from "@/lib/report-insights";
import type { Branch, Entry } from "@/types";

const branchIds: Branch[] = ["main", "kansanga", "salaama"];
const branchNames: Record<Branch, string> = {
  main: "Kansanga",
  kansanga: "Kansanga",
  salaama: "Salaama",
};

function makeEntry(
  overrides: Partial<Entry> & Pick<Entry, "branch" | "sales">
): Entry {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    date: overrides.date ?? "2026-08-02",
    time: overrides.time ?? "10:00",
    timestamp: overrides.timestamp ?? Date.now(),
    branch: overrides.branch,
    sales: overrides.sales,
    expenses: overrides.expenses ?? [],
    staffId: overrides.staffId ?? null,
    staffName: overrides.staffName ?? "Owner",
    createdBy: overrides.createdBy,
    notes: overrides.notes ?? "",
    savingsAllocation: overrides.savingsAllocation,
    status: overrides.status ?? "completed",
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  };
}

function assertBranchShape(
  label: string,
  byBranch: ReturnType<typeof aggregateEntries>["byBranch"]
) {
  for (const branchId of branchIds) {
    const totals = getBranchTotals(byBranch, branchId);
    assert.equal(typeof totals.sales, "number", `${label}: ${branchId} sales`);
    assert.equal(typeof totals.expenses, "number", `${label}: ${branchId} expenses`);
    assert.equal(typeof totals.savings, "number", `${label}: ${branchId} savings`);
  }
}

function runScenario(label: string, entries: Entry[]) {
  const summary = aggregateEntries(entries, { branchIds });
  assertBranchShape(label, summary.byBranch);

  const insights = buildReportInsights(entries, summary);
  assert.equal(typeof insights.averageDailySales, "number", `${label}: insights`);

  const chartData = getDashboardChartDataFromEntries(entries, branchNames, branchIds);
  assert.equal(
    chartData.branchComparison.length,
    branchIds.length,
    `${label}: branch comparison length`
  );

  for (const point of chartData.branchComparison) {
    assert.equal(typeof point.sales, "number", `${label}: comparison sales`);
    assert.equal(typeof point.expenses, "number", `${label}: comparison expenses`);
    assert.equal(typeof point.savings, "number", `${label}: comparison savings`);
  }

  console.log(`PASS ${label}`);
}

runScenario("empty database", []);
runScenario("no sales", [
  makeEntry({ branch: "main", sales: 0, expenses: [{ id: "lunch", name: "Lunch", amount: 1000 }] }),
]);
runScenario("one sale", [
  makeEntry({ branch: "main", sales: 50000, expenses: [{ id: "lunch", name: "Lunch", amount: 1000 }] }),
]);
runScenario("multiple sales", [
  makeEntry({ branch: "main", sales: 50000 }),
  makeEntry({ branch: "main", sales: 30000, date: "2026-08-01" }),
]);
runScenario("multiple branches", [
  makeEntry({ branch: "main", sales: 50000 }),
  makeEntry({ branch: "kansanga", sales: 25000 }),
  makeEntry({ branch: "salaama", sales: 15000 }),
]);
runScenario("branches with no activity", [
  makeEntry({ branch: "main", sales: 12000 }),
]);

console.log("All report aggregation scenarios passed.");
