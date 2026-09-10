import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import {
  computeAllBranchesOperatingExpenses,
  computeDashboardOperatingExpenses,
} from "@/lib/dashboard/operating-expenses";
import type { Branch, Entry } from "@/types";
import type { ExpenseRecord } from "@/types/expenses-module";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";
import {
  ensureDayOpen,
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-dash-exp-${Date.now()}`;
const TEST_DATE = `2019-04-${String(Math.floor(Math.random() * 20) + 1).padStart(2, "0")}`;

type JsonRecord = Record<string, unknown>;

function recordCheck(id: number, name: string, passed: boolean, detail: string) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

function buildExpense(
  id: string,
  branch: Branch,
  amount: number,
  date: string
): ExpenseRecord {
  return {
    id,
    date,
    categoryId: "cat-1",
    categoryName: "General",
    description: `${TEST_PREFIX} expense`,
    amount,
    paymentMethod: "cash",
    branch,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function buildEntry(
  id: string,
  branch: Branch,
  date: string,
  expenseAmount: number
): Entry {
  return {
    id,
    date,
    time: "10:00",
    timestamp: Date.now(),
    branch,
    sales: 1000,
    expenses: [
      {
        id: crypto.randomUUID(),
        name: "Operating Expenses",
        amount: expenseAmount,
      },
    ],
    staffName: "Test",
    status: "completed",
    createdAt: new Date().toISOString(),
  };
}

function testPureDedupeLogic(): void {
  const main = "main" as Branch;
  const salaama = "salaama" as Branch;

  const singleModule = computeDashboardOperatingExpenses(
    main,
    TEST_DATE,
    [buildExpense("e1", main, 500, TEST_DATE)],
    [buildEntry("entry1", main, TEST_DATE, 500)]
  );
  recordCheck(
    1,
    "One expense is counted exactly once when module and entry both exist",
    singleModule === 500,
    `total=${singleModule}`
  );

  const multipleModule = computeDashboardOperatingExpenses(
    main,
    TEST_DATE,
    [
      buildExpense("e1", main, 300, TEST_DATE),
      buildExpense("e2", main, 200, TEST_DATE),
    ],
    [buildEntry("entry1", main, TEST_DATE, 500)]
  );
  recordCheck(
    2,
    "Multiple module expenses are counted exactly once",
    multipleModule === 500,
    `total=${multipleModule}`
  );

  const kansangaOnly = computeDashboardOperatingExpenses(
    main,
    TEST_DATE,
    [
      buildExpense("e1", main, 400, TEST_DATE),
      buildExpense("e2", salaama, 900, TEST_DATE),
    ],
    []
  );
  recordCheck(
    3,
    "Kansanga dashboard only counts Kansanga expenses",
    kansangaOnly === 400,
    `total=${kansangaOnly}`
  );

  const salaamaOnly = computeDashboardOperatingExpenses(
    salaama,
    TEST_DATE,
    [buildExpense("e1", salaama, 700, TEST_DATE)],
    []
  );
  recordCheck(
    4,
    "Salaama dashboard only counts Salaama expenses",
    salaamaOnly === 700,
    `total=${salaamaOnly}`
  );

  const allBranches = computeAllBranchesOperatingExpenses(
    [main, salaama],
    TEST_DATE,
    [
      buildExpense("e1", main, 400, TEST_DATE),
      buildExpense("e2", salaama, 700, TEST_DATE),
    ],
    [
      buildEntry("entry-main", main, TEST_DATE, 400),
      buildEntry("entry-salaama", salaama, TEST_DATE, 700),
    ]
  );
  recordCheck(
    5,
    "All Branches equals Kansanga + Salaama with no duplication",
    allBranches === 1100,
    `total=${allBranches}`
  );

  const legacyEntryOnly = computeDashboardOperatingExpenses(
    main,
    TEST_DATE,
    [],
    [buildEntry("legacy", main, TEST_DATE, 250)]
  );
  recordCheck(
    6,
    "Legacy entry expenses used when no module records exist",
    legacyEntryOnly === 250,
    `total=${legacyEntryOnly}`
  );

  const staffPaymentExcluded = computeDashboardOperatingExpenses(
    main,
    TEST_DATE,
    [
      {
        ...buildExpense("e1", main, 100, TEST_DATE),
        staffPaymentId: crypto.randomUUID(),
      },
      buildExpense("e2", main, 150, TEST_DATE),
    ],
    []
  );
  recordCheck(
    7,
    "Staff-payment-linked expenses are excluded from operating expenses",
    staffPaymentExcluded === 150,
    `total=${staffPaymentExcluded}`
  );

  const otherDate = "2019-05-01";
  const dateFiltered = computeDashboardOperatingExpenses(
    main,
    TEST_DATE,
    [
      buildExpense("e1", main, 100, TEST_DATE),
      buildExpense("e2", main, 999, otherDate),
    ],
    []
  );
  recordCheck(
    8,
    "Date filtering remains correct",
    dateFiltered === 100,
    `total=${dateFiltered}`
  );

  const branchSwitchStable = computeAllBranchesOperatingExpenses(
    [main, salaama],
    TEST_DATE,
    [buildExpense("e1", main, 400, TEST_DATE)],
    [buildEntry("entry-main", main, TEST_DATE, 400)]
  );
  const branchSwitchStableAgain = computeAllBranchesOperatingExpenses(
    [salaama, main],
    TEST_DATE,
    [buildExpense("e1", main, 400, TEST_DATE)],
    [buildEntry("entry-main", main, TEST_DATE, 400)]
  );
  recordCheck(
    9,
    "Switching branch order repeatedly does not accumulate duplicate expenses",
    branchSwitchStable === 400 && branchSwitchStableAgain === 400,
    `first=${branchSwitchStable}, second=${branchSwitchStableAgain}`
  );
}

function scanDashboardSources(): void {
  const branchState = fs.readFileSync(
    path.join(process.cwd(), "hooks/use-branch-state.ts"),
    "utf8"
  );
  const analytics = fs.readFileSync(
    path.join(process.cwd(), "lib/branch/analytics.ts"),
    "utf8"
  );

  recordCheck(
    10,
    "use-branch-state uses deduplicated dashboard operating expense helper",
    branchState.includes("computeDashboardOperatingExpenses") &&
      !branchState.includes("moduleOperatingExpenses + entryOperatingExpenses"),
    ""
  );

  recordCheck(
    11,
    "Owner branch analytics uses deduplicated operating expense helper",
    analytics.includes("computeDashboardOperatingExpenses"),
    ""
  );
}

class DashboardExpenseVerifier {
  private cookieHeader = "";

  private async request(
    apiPath: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (this.cookieHeader) {
      headers.set("Cookie", this.cookieHeader);
    }

    return fetch(`${BASE_URL}${apiPath}`, { ...options, headers });
  }

  async json<T>(apiPath: string, options: RequestInit = {}): Promise<T> {
    const response = await this.request(apiPath, options);
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      this.cookieHeader = setCookie
        .split(",")
        .map((part) => part.split(";")[0]?.trim())
        .filter(Boolean)
        .join("; ");
    }

    const payload = (await response.json()) as { data?: T; error?: JsonRecord };
    if (!response.ok) {
      throw new Error(
        typeof payload.error === "object" &&
          payload.error &&
          typeof payload.error.message === "string"
          ? payload.error.message
          : `Request failed: ${response.status} ${apiPath}`
      );
    }

    return payload.data as T;
  }

  async loginAsOwner() {
    await loginWithCredentials(this, VERIFY_OWNER_CREDENTIALS);
  }

  async loginAsCashier(cashier: CertificationCashier) {
    await loginWithCredentials(this, {
      username: cashier.username,
      password: cashier.password,
    });
  }
}

async function cleanupExpenseIds(expenseIds: string[]) {
  if (expenseIds.length === 0) return;
  await prisma.expenseRecord.deleteMany({ where: { id: { in: expenseIds } } });
}

async function main() {
  const owner = new DashboardExpenseVerifier();
  const expenseIds: string[] = [];
  let kansangaCashier: CertificationCashier | null = null;

  console.log("Verifying dashboard expense deduplication...\n");

  testPureDedupeLogic();
  scanDashboardSources();

  try {
    await owner.loginAsOwner();
    kansangaCashier = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-k`,
      "main"
    );

    const client = new DashboardExpenseVerifier();
    await client.loginAsCashier(kansangaCashier);
    await ensureDayOpen(client, TEST_DATE, "main", owner);

    const categories = await client.json<Array<{ id: string }>>(
      "/api/expense-categories"
    );
    const categoryId = categories[0]?.id;
    assert.ok(categoryId);

    const created = await client.json<{ id: string; amount: number; branch: string }>(
      "/api/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          date: TEST_DATE,
          categoryId,
          description: `${TEST_PREFIX} live expense`,
          amount: 600,
          paymentMethod: "cash",
          branch: "main",
        }),
      }
    );
    expenseIds.push(created.id);

    const apiExpenses = await client.json<ExpenseRecord[]>("/api/expenses");
    const apiEntries = await owner.json<Entry[]>("/api/daily-operations");

    const dashboardTotal = computeDashboardOperatingExpenses(
      "main",
      TEST_DATE,
      apiExpenses,
      apiEntries
    );

    recordCheck(
      12,
      "Live PostgreSQL expenses counted once against daily operation entry totals",
      dashboardTotal === 600,
      `dashboard=${dashboardTotal}, module=${created.amount}`
    );

    const refreshedTotal = computeDashboardOperatingExpenses(
      "main",
      TEST_DATE,
      await client.json<ExpenseRecord[]>("/api/expenses"),
      await owner.json<Entry[]>("/api/daily-operations")
    );
    recordCheck(
      13,
      "Refreshing dashboard inputs does not change operating expense totals",
      refreshedTotal === dashboardTotal,
      `before=${dashboardTotal}, after=${refreshedTotal}`
    );

    console.log("\nDashboard expense deduplication verification complete.");
  } finally {
    if (kansangaCashier) {
      await cleanupCertificationCashier(kansangaCashier);
    }
    await cleanupExpenseIds(expenseIds);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
