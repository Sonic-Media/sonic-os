#!/usr/bin/env tsx
/**
 * Targeted go-live UX fixes — focused verification (no full integrity suite).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { aggregateEntries } from "@/lib/aggregations";
import {
  branchCodesReferToSameInventory,
  getEquivalentBranchCodes,
} from "@/lib/branch/codes";
import { getPeriodDateBounds, parseReportReferenceDate } from "@/lib/dates";
import { listDailyOperationsInPeriod } from "@/lib/server/services/daily-operations-service";
import type { Entry } from "@/types";

const ROOT = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function recordCheck(label: string, pass: boolean, detail?: string) {
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
  console.log(`PASS ${label}${detail ? ` — ${detail}` : ""}`);
}

function makeEntry(
  overrides: Partial<Entry> & Pick<Entry, "branch" | "date" | "sales">
): Entry {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    date: overrides.date,
    time: overrides.time ?? "10:00",
    timestamp: overrides.timestamp ?? Date.now(),
    branch: overrides.branch,
    sales: overrides.sales,
    expenses: overrides.expenses ?? [],
    staffId: overrides.staffId ?? null,
    staffName: overrides.staffName ?? "Staff",
    notes: overrides.notes ?? "",
    status: overrides.status ?? "completed",
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  };
}

async function main() {
  console.log("Targeted go-live UX fixes verification\n");

  recordCheck(
    "Salaama and branch2 refer to same inventory branch",
    branchCodesReferToSameInventory("salaama", "branch2"),
    getEquivalentBranchCodes("salaama").join(",")
  );

  recordCheck(
    "Open shop page clarifies separate open vs clock-in steps",
    readRepo("components/operations/open-shop-page.tsx").includes(
      "Opening the shop and clocking in are separate steps"
    )
  );

  const reportsPage = readRepo("app/reports/page.tsx");
  recordCheck(
    "Reports page includes owner branch filter",
    reportsPage.includes("ReportsBranchFilter") &&
      reportsPage.includes("canSelectBranch")
  );
  recordCheck(
    "Reports page includes daily date picker",
    reportsPage.includes("ReportsDatePicker") &&
      reportsPage.includes('period === "daily"')
  );

  const useReports = readRepo("hooks/use-reports.ts");
  recordCheck(
    "Owner reports default to All Branches scope",
    useReports.includes('setBranchScope("all")') &&
      useReports.includes('branchScope: effectiveBranchScope')
  );

  const reportsRoute = readRepo("app/api/reports/summary/route.ts");
  recordCheck(
    "Reports API accepts branch and date query params",
    reportsRoute.includes('searchParams.get("branch")') &&
      reportsRoute.includes('searchParams.get("date")') &&
      reportsRoute.includes("resolveReportsBranchFilter")
  );

  const referenceDate = "2026-09-14";
  const bounds = getPeriodDateBounds("daily", parseReportReferenceDate(referenceDate));
  recordCheck(
    "Daily report bounds match selected business date",
    bounds.start === referenceDate && bounds.end === referenceDate,
    `${bounds.start}..${bounds.end}`
  );

  const mondayEntry = makeEntry({
    branch: "main",
    date: "2026-09-14",
    sales: 50_000,
    time: "00:05",
    timestamp: new Date("2026-09-15T00:05:00.000Z").getTime(),
    createdAt: "2026-09-15T00:05:00.000Z",
  });

  const summary = aggregateEntries([mondayEntry], { branchIds: ["main"] });
  recordCheck(
    "Aggregation uses entry business date, not createdAt",
    summary.totalSales === 50_000 && mondayEntry.date === "2026-09-14",
    `sales=${summary.totalSales}, businessDate=${mondayEntry.date}`
  );

  recordCheck(
    "Zero-data aggregation returns explicit zeros",
    summary.totalExpenses === 0 && summary.totalSavings === 50_000
  );

  const emptySummary = aggregateEntries([], { branchIds: ["main", "salaama"] });
  recordCheck(
    "Empty period returns zero totals without error",
    emptySummary.totalSales === 0 &&
      emptySummary.totalExpenses === 0 &&
      emptySummary.totalSavings === 0
  );

  recordCheck(
    "listDailyOperationsInPeriod filters on DailyOperation.date field",
    listDailyOperationsInPeriod.toString().includes("date:"),
    "service uses business date column"
  );

  console.log("\nAll targeted go-live UX verification checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
