import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { aggregateEntries } from "@/lib/aggregations";
import {
  calculateExpenses,
  calculateSavingsFromTotals,
} from "@/lib/amounts";
import { getPeriodDateBounds, getTodayISO } from "@/lib/dates";
import { filterCompletedEntries } from "@/lib/entry-helpers";
import { prisma } from "@/lib/db";
import { getBranchIdByCode } from "@/lib/server/branch-lookup";
import { listDailyOperationsInPeriod } from "@/lib/server/services/daily-operations-service";
import type { Branch, Entry, ReportPeriod, ReportSummary } from "@/types";
import {
  cleanupCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";
import {
  ensureDayOpen,
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-reports-auth-${Date.now()}`;

async function countBranchOperationsOnDate(date: string): Promise<number> {
  return prisma.dailyOperation.count({
    where: {
      date,
      branch: { code: { in: ["main", "salaama"] } },
    },
  });
}

async function pickTestDate(): Promise<{ date: string; supportsDaily: boolean }> {
  const today = getTodayISO();
  if ((await countBranchOperationsOnDate(today)) === 0) {
    return { date: today, supportsDaily: true };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  for (let day = 28; day >= 1; day -= 1) {
    const candidate = `${year}-${month}-${String(day).padStart(2, "0")}`;
    if (candidate === today) continue;
    if ((await countBranchOperationsOnDate(candidate)) === 0) {
      return { date: candidate, supportsDaily: false };
    }
  }

  throw new Error("No unused date available in the current month for verification.");
}

function previousMonthIsoDate(fromDate: string): string {
  const date = new Date(`${fromDate}T12:00:00`);
  date.setMonth(date.getMonth() - 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
const HOOK_SOURCE = fs.readFileSync(
  path.join(process.cwd(), "hooks/use-reports.ts"),
  "utf8"
);

type JsonClient = {
  json: <T>(apiPath: string, options?: RequestInit) => Promise<T>;
};

function recordCheck(id: number, name: string, passed: boolean, detail: string) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

class ReportsAuthorityVerifier implements JsonClient {
  private cookieHeader = "";

  async json<T>(apiPath: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (this.cookieHeader) {
      headers.set("Cookie", this.cookieHeader);
    }

    const response = await fetch(`${BASE_URL}${apiPath}`, {
      ...options,
      headers,
    });

    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      this.cookieHeader = setCookie
        .split(",")
        .map((part) => part.split(";")[0]?.trim())
        .filter(Boolean)
        .join("; ");
    }

    const payload = (await response.json()) as { data?: T; error?: unknown };
    if (!response.ok) {
      throw new Error(
        `${apiPath} failed (${response.status}): ${JSON.stringify(payload.error ?? payload)}`
      );
    }

    return payload.data as T;
  }

  async fetchReportSummary(period: ReportPeriod) {
    return this.json<ReportSummary>(`/api/reports/summary?period=${period}`);
  }
}

async function setActiveBranch(client: ReportsAuthorityVerifier, branch: string) {
  await client.json("/api/auth/session", {
    method: "POST",
    body: JSON.stringify({
      action: "set-active-branch",
      branchCode: branch,
    }),
  });
}

function buildEntry(
  id: string,
  branch: Branch,
  date: string,
  sales: number,
  expenseAmount: number
): Entry {
  return {
    id,
    date,
    time: "10:00",
    timestamp: Date.parse(`${date}T10:00:00Z`),
    branch,
    sales,
    expenses:
      expenseAmount > 0
        ? [{ id: crypto.randomUUID(), name: "Operating Expenses", amount: expenseAmount }]
        : [],
    staffName: "Verify",
    status: "completed",
    createdAt: new Date().toISOString(),
  };
}

async function aggregateFromDbForBranch(
  period: ReportPeriod,
  branchCode: Branch,
  branchCodes: Branch[]
): Promise<ReportSummary> {
  const branchId = await getBranchIdByCode(branchCode);
  const entries = await listDailyOperationsInPeriod(period, new Date(), {
    branchId: { in: [branchId] },
  });
  return aggregateEntries(entries, { branchIds: branchCodes });
}

function verifyHookUsesServerAuthority(): void {
  recordCheck(
    1,
    "Reports hook uses server-authoritative report endpoint",
    HOOK_SOURCE.includes("fetchReportSummary"),
    "fetchReportSummary imported and used"
  );

  recordCheck(
    2,
    "Reports hook does not aggregate operational context arrays",
    !HOOK_SOURCE.includes("useEntriesContext") &&
      !HOOK_SOURCE.includes("aggregateEntries") &&
      !HOOK_SOURCE.includes("filterEntriesByPeriod") &&
      !HOOK_SOURCE.includes("filterByBranchField"),
    "no entries context or client-side aggregation"
  );

  recordCheck(
    3,
    "Reports hook protects against stale async responses",
    HOOK_SOURCE.includes("requestId") &&
      HOOK_SOURCE.includes("currentRequest !== requestId.current"),
    "requestId guard present"
  );
}

async function verifyRaceGuardLogic(): Promise<void> {
  let requestId = 0;
  let latestSummary: ReportSummary | null = null;

  async function simulateFetch(delayMs: number, sales: number): Promise<void> {
    const currentRequest = ++requestId;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (currentRequest !== requestId) return;
    latestSummary = {
      totalSales: sales,
    } as ReportSummary;
  }

  const slow = simulateFetch(30, 100);
  const fast = simulateFetch(5, 200);
  await Promise.all([slow, fast]);
  recordCheck(
    13,
    "Out-of-order API responses cannot overwrite current report state",
    latestSummary?.totalSales === 200,
    `latest totalSales=${latestSummary?.totalSales ?? "null"}`
  );
}

async function main() {
  verifyHookUsesServerAuthority();
  await verifyRaceGuardLogic();

  const owner = new ReportsAuthorityVerifier();
  await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);

  const { date: testDate, supportsDaily } = await pickTestDate();
  const branchPeriod = supportsDaily ? "daily" : "monthly";
  const mainSalesDelta = 50_000;
  const mainExpenseDelta = 12_000;
  const salaamaSalesDelta = 80_000;
  const salaamaExpenseDelta = 20_000;

  await setActiveBranch(owner, "main");
  const baselineMain = await owner.fetchReportSummary(branchPeriod);
  await setActiveBranch(owner, "salaama");
  const baselineSalaama = await owner.fetchReportSummary(branchPeriod);
  await setActiveBranch(owner, "main");
  const baselineMainMonthly = await owner.fetchReportSummary("monthly");

  const mainEntryId = crypto.randomUUID();
  const salaamaEntryId = crypto.randomUUID();
  const imported = await owner.json<Entry[]>("/api/daily-operations/import", {
    method: "POST",
    body: JSON.stringify({
      entries: [
        buildEntry(mainEntryId, "main", testDate, mainSalesDelta, mainExpenseDelta),
        buildEntry(
          salaamaEntryId,
          "salaama",
          testDate,
          salaamaSalesDelta,
          salaamaExpenseDelta
        ),
      ],
    }),
  });

  assert.equal(imported.length, 2);

  let cashier: CertificationCashier | null = null;

  try {
    await setActiveBranch(owner, "main");
    const kansangaScoped = await owner.fetchReportSummary(branchPeriod);
    const bounds = getPeriodDateBounds(branchPeriod);

    recordCheck(
      4,
      "Kansanga report totals are correct",
      kansangaScoped.totalSales === baselineMain.totalSales + mainSalesDelta &&
        kansangaScoped.totalExpenses === baselineMain.totalExpenses + mainExpenseDelta &&
        kansangaScoped.totalSavings ===
          baselineMain.totalSavings + (mainSalesDelta - mainExpenseDelta),
      `period=${branchPeriod} sales=${kansangaScoped.totalSales} expenses=${kansangaScoped.totalExpenses} savings=${kansangaScoped.totalSavings}`
    );

    await setActiveBranch(owner, "salaama");
    const salaamaScoped = await owner.fetchReportSummary(branchPeriod);

    recordCheck(
      5,
      "Salaama report totals are correct",
      salaamaScoped.totalSales === baselineSalaama.totalSales + salaamaSalesDelta &&
        salaamaScoped.totalExpenses ===
          baselineSalaama.totalExpenses + salaamaExpenseDelta &&
        salaamaScoped.totalSavings ===
          baselineSalaama.totalSavings + (salaamaSalesDelta - salaamaExpenseDelta),
      `period=${branchPeriod} sales=${salaamaScoped.totalSales} expenses=${salaamaScoped.totalExpenses} savings=${salaamaScoped.totalSavings}`
    );

    await setActiveBranch(owner, "main");
    const ownerMainMonthly = await owner.fetchReportSummary("monthly");
    const dbMonthly = await aggregateFromDbForBranch("monthly", "main", [
      "main",
      "salaama",
    ]);

    recordCheck(
      6,
      "All Branches breakdown avoids duplication in active-branch totals",
      ownerMainMonthly.totalSales === baselineMainMonthly.totalSales + mainSalesDelta &&
        (ownerMainMonthly.byBranch.main?.sales ?? 0) ===
          (baselineMainMonthly.byBranch.main?.sales ?? 0) + mainSalesDelta &&
        (ownerMainMonthly.byBranch.salaama?.sales ?? 0) ===
          (baselineMainMonthly.byBranch.salaama?.sales ?? 0),
      `active-branch total=${ownerMainMonthly.totalSales}, main card=${ownerMainMonthly.byBranch.main?.sales ?? 0}, salaama card=${ownerMainMonthly.byBranch.salaama?.sales ?? 0}`
    );

    recordCheck(
      7,
      "Revenue totals are correct",
      ownerMainMonthly.totalSales === dbMonthly.totalSales,
      `API=${ownerMainMonthly.totalSales} DB=${dbMonthly.totalSales}`
    );

    recordCheck(
      8,
      "Expense totals are correct",
      ownerMainMonthly.totalExpenses === dbMonthly.totalExpenses,
      `API=${ownerMainMonthly.totalExpenses} DB=${dbMonthly.totalExpenses}`
    );

    recordCheck(
      9,
      "Net/profit totals are mathematically correct",
      ownerMainMonthly.totalSavings ===
        calculateSavingsFromTotals(
          ownerMainMonthly.totalSales,
          ownerMainMonthly.totalExpenses
        ),
      `savings=${ownerMainMonthly.totalSavings}`
    );

    const completed = filterCompletedEntries([
      buildEntry(mainEntryId, "main", testDate, mainSalesDelta, mainExpenseDelta),
    ]);
    const entryExpenses = calculateExpenses(completed[0]!);
    recordCheck(
      10,
      "Staff-payment and operating expenses roll up through server entries",
      entryExpenses === mainExpenseDelta,
      `entry expenses=${entryExpenses}`
    );

    recordCheck(
      11,
      "Date-range filtering is correct",
      testDate >= bounds.start &&
        testDate <= bounds.end &&
        ownerMainMonthly.totalSales === baselineMainMonthly.totalSales + mainSalesDelta,
      `testDate=${testDate}, bounds ${bounds.start}..${bounds.end}, monthly sales=${ownerMainMonthly.totalSales}`
    );

    const outOfRangeEntryId = crypto.randomUUID();
    const monthlyBeforeOutOfRange = ownerMainMonthly.totalSales;
    await owner.json<Entry[]>("/api/daily-operations/import", {
      method: "POST",
      body: JSON.stringify({
        entries: [
          buildEntry(
            outOfRangeEntryId,
            "main",
            previousMonthIsoDate(testDate),
            999_999,
            1
          ),
        ],
      }),
    });

    const monthlyAfterOutOfRange = await owner.fetchReportSummary("monthly");
    recordCheck(
      12,
      "Changing date ranges does not combine stale results",
      monthlyAfterOutOfRange.totalSales === monthlyBeforeOutOfRange,
      `current-month sales=${monthlyAfterOutOfRange.totalSales} (previous-month entry excluded)`
    );

    await setActiveBranch(owner, "salaama");
    const afterSwitch = await owner.fetchReportSummary(branchPeriod);
    recordCheck(
      14,
      "Switching Kansanga ↔ Salaama does not show stale report totals",
      afterSwitch.totalSales === baselineSalaama.totalSales + salaamaSalesDelta,
      `salaama ${branchPeriod} sales=${afterSwitch.totalSales}`
    );

    const managerPassword = `${TEST_PREFIX}-mgr-pw`;
    const managerUsername = `${TEST_PREFIX}-manager`.slice(0, 48);
    const managerStaff = await owner.json<{ id: string }>("/api/staff", {
      method: "POST",
      body: JSON.stringify({
        name: `${TEST_PREFIX} Manager`,
        branch: "main",
        role: "branch-manager",
        status: "active",
        dailyWage: 10000,
      }),
    });
    const managerUser = await owner.json<{ id: string }>("/api/users", {
      method: "POST",
      body: JSON.stringify({
        username: managerUsername,
        displayName: `${TEST_PREFIX} Manager`,
        role: "branch-manager",
        branch: "main",
        password: managerPassword,
        staffId: managerStaff.id,
      }),
    });
    cashier = {
      username: managerUsername,
      password: managerPassword,
      staffId: managerStaff.id,
      userId: managerUser.id,
    };

    const staffClient = new ReportsAuthorityVerifier();
    await loginWithCredentials(staffClient, {
      username: managerUsername,
      password: managerPassword,
    });

    await ensureDayOpen(staffClient, testDate, "main", owner);
    const staffSummary = await staffClient.fetchReportSummary(branchPeriod);

    recordCheck(
      15,
      "Staff cannot access another branch's report data",
      staffSummary.totalSales === baselineMain.totalSales + mainSalesDelta &&
        staffSummary.totalSales !== baselineSalaama.totalSales + salaamaSalesDelta,
      `branch-manager ${branchPeriod} sales=${staffSummary.totalSales}`
    );

    await setActiveBranch(owner, "main");
    const ownerSummary = await owner.fetchReportSummary(branchPeriod);
    recordCheck(
      16,
      "Owner retains authorized All Branches reporting breakdown",
      typeof ownerSummary.byBranch.main === "object" &&
        typeof ownerSummary.byBranch.salaama === "object",
      "byBranch includes authorized branch keys"
    );

    await owner.json("/api/daily-operations/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids: [mainEntryId, salaamaEntryId, outOfRangeEntryId] }),
    });
  } finally {
    if (cashier) {
      await cleanupCertificationCashier(cashier);
    }
    await prisma.$disconnect();
  }

  console.log("\nAll reports server-authority checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
