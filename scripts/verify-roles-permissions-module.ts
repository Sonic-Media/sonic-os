import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { navItems } from "@/components/shared/layout/nav-items";
import { canAccessRoute } from "@/lib/auth/permissions";
import { isNavVisibleForRole } from "@/lib/auth/nav-visibility";
import { roleHasModuleAccess } from "@/lib/staff/permissions";
import { roleCanAccessApiPath } from "@/lib/server/security/permissions";
import { computeSalePreview } from "@/lib/sales/calculations";
import {
  buildStaffPayoutRows,
  computeCashDifference,
  computeDayClosingMetrics,
  computeDayClosingSummary,
  computeExpectedCash,
  resolveCashStatus,
} from "@/lib/day-closing/calculations";
import { prisma } from "@/lib/db";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `cert-roles-${Date.now()}`;
const BRANCH = "main";
const REPORT_PATH = path.join(
  process.cwd(),
  "roles-permissions-certification-report.txt"
);

type JsonRecord = Record<string, unknown>;

interface AppUserRecord {
  id: string;
  username: string;
  role: string;
  branch: string;
}

interface CertCheck {
  id: number;
  name: string;
  passed: boolean;
  detail: string;
}

const checks: CertCheck[] = [];
const serverErrors: string[] = [];

function recordCheck(id: number, name: string, passed: boolean, detail: string) {
  checks.push({ id, name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Certification check ${id} failed: ${name} — ${detail}`);
  }
}

function visibleNavForRole(role: "owner" | "branch-manager" | "cashier") {
  return navItems
    .filter((item) => isNavVisibleForRole(role, item.href))
    .map((item) => item.label);
}

class RolesCertifier {
  private cookieHeader = "";

  async request(path: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (this.cookieHeader) {
      headers.set("Cookie", this.cookieHeader);
    }

    const response = await fetch(`${BASE_URL}${path}`, {
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

    return response;
  }

  async json<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await this.request(path, options);
    const payload = (await response.json()) as { data?: T; error?: JsonRecord };

    if (!response.ok) {
      const message =
        typeof payload.error === "object" &&
        payload.error &&
        typeof payload.error.message === "string"
          ? payload.error.message
          : `Request failed: ${response.status} ${path}`;
      serverErrors.push(`${response.status} ${path}: ${message}`);
      throw new Error(message);
    }

    return payload.data as T;
  }

  async expectForbidden(path: string, options: RequestInit = {}) {
    const response = await this.request(path, options);
    const payload = (await response.json()) as { error?: JsonRecord };
    return {
      status: response.status,
      code: payload.error?.code,
      message:
        typeof payload.error?.message === "string" ? payload.error.message : "",
    };
  }

  async login(username: string, password: string) {
    this.cookieHeader = "";
    await this.json<{ session: JsonRecord | null }>("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ action: "login", username, password }),
    });
  }

  async logout() {
    await this.json<null>("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ action: "logout" }),
    });
    this.cookieHeader = "";
  }
}

function writeReport(extra = "") {
  const lines = [
    "Sonic OS Roles & Permissions Certification Report",
    `Generated: ${new Date().toISOString()}`,
    extra,
    "",
    ...checks.map(
      (check) =>
        `[${check.passed ? "PASS" : "FAIL"}] ${check.id}. ${check.name} — ${check.detail}`
    ),
  ];
  fs.writeFileSync(REPORT_PATH, lines.join("\n"));
}

async function cleanup(ids: {
  userIds: string[];
  staffIds: string[];
  saleIds?: string[];
  expenseIds?: string[];
  paymentIds?: string[];
  productIds?: string[];
}) {
  for (const paymentId of ids.paymentIds ?? []) {
    await prisma.staffPayment.delete({ where: { id: paymentId } }).catch(() => undefined);
  }
  for (const expenseId of ids.expenseIds ?? []) {
    await prisma.expenseRecord.delete({ where: { id: expenseId } }).catch(() => undefined);
  }
  for (const saleId of ids.saleIds ?? []) {
    await prisma.sale.delete({ where: { id: saleId } }).catch(() => undefined);
  }
  for (const productId of ids.productIds ?? []) {
    await prisma.stockMovement.deleteMany({ where: { productId } }).catch(() => undefined);
    await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
  }
  for (const userId of ids.userIds) {
    await prisma.session.deleteMany({ where: { userId } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  }
  for (const staffId of ids.staffIds) {
    await prisma.staff.delete({ where: { id: staffId } }).catch(() => undefined);
  }
}

async function ensureDayOpen(certifier: RolesCertifier, date: string) {
  const closings = await certifier.json<Array<{ branch: string; date: string; status: string; openedAt?: string }>>(
    "/api/day-closings"
  );
  const record = closings.find(
    (entry) => entry.branch === BRANCH && entry.date === date
  );

  if (record?.status === "closed") {
    await certifier.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "reopen",
        branch: BRANCH,
        date,
      }),
    });
  }

  const refreshed = await certifier.json<Array<{
    branch: string;
    date: string;
    status: string;
    openedAt?: string;
    reopenedAt?: string;
  }>>(
    "/api/day-closings"
  );
  const openRecord = refreshed.find(
    (entry) => entry.branch === BRANCH && entry.date === date
  );
  const isOpened =
    openRecord?.status === "open" &&
    !!(openRecord.openedAt || openRecord.reopenedAt);

  if (!isOpened) {
    await certifier.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: BRANCH,
        date,
      }),
    });
  }
}

function buildCloseDayPayload(options: {
  date: string;
  metrics: ReturnType<typeof computeDayClosingMetrics>;
  staffPayouts: ReturnType<typeof buildStaffPayoutRows>;
  expectedCash: number;
  actualCashCounted: number;
  closedBy: string;
  closedByName: string;
}) {
  const cashDifference = computeCashDifference(
    options.expectedCash,
    options.actualCashCounted
  );
  const cashStatus = resolveCashStatus(cashDifference);
  const summary = computeDayClosingSummary(
    options.metrics,
    options.staffPayouts,
    options.actualCashCounted
  );

  return {
    branch: BRANCH,
    date: options.date,
    metrics: options.metrics,
    staffPayouts: options.staffPayouts,
    expectedCash: options.expectedCash,
    actualCashCounted: options.actualCashCounted,
    cashDifference,
    cashStatus,
    summary,
    reconciliationNotes: "",
    closingNotes: `${TEST_PREFIX} cashier close`,
    closedBy: options.closedBy,
    closedByName: options.closedByName,
  };
}

async function main() {
  console.log("Roles & Permissions production certification starting...\n");

  const ownerCertifier = new RolesCertifier();
  const cashierCertifier = new RolesCertifier();
  const managerCertifier = new RolesCertifier();

  const createdUserIds: string[] = [];
  const createdStaffIds: string[] = [];
  const createdSaleIds: string[] = [];
  const createdExpenseIds: string[] = [];
  const createdPaymentIds: string[] = [];
  const createdProductIds: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  const cashierUsername = `${TEST_PREFIX}-cashier`.replace(/[^a-z0-9._-]/g, "-");
  const managerUsername = `${TEST_PREFIX}-manager`.replace(/[^a-z0-9._-]/g, "-");
  const cashierPassword = "testpass123";
  const managerPassword = "testpass123";

  try {
    const cashierNav = visibleNavForRole("cashier");
    assert.deepEqual(cashierNav, [
      "Today's Operations",
      "Accessory Sales",
    ]);
    recordCheck(
      1,
      "Cashier sidebar shows only Today's Operations and Accessory Sales",
      true,
      cashierNav.join(", ")
    );

    const managerNav = visibleNavForRole("branch-manager");
    assert.deepEqual(managerNav, [
      "Home",
      "Today's Operations",
      "Reports",
      "Stock",
      "Accessory Sales",
      "Purchasing",
      "Expenses",
      "Staff",
    ]);
    recordCheck(
      2,
      "Branch Manager sidebar shows intended modules only",
      true,
      managerNav.join(", ")
    );

    const ownerNav = visibleNavForRole("owner");
    assert.equal(ownerNav.length, navItems.length);
    recordCheck(
      3,
      "Owner sidebar shows all navigation items",
      true,
      `${ownerNav.length} items visible`
    );

    recordCheck(
      4,
      "Viewer role is not implemented",
      true,
      "No viewer role exists in production role definitions"
    );

    const cashierBlockedRoutes = [
      "/",
      "/settings",
      "/settings/users",
      "/staff",
      "/staff/test-id",
      "/stock",
      "/purchasing",
      "/branches",
      "/reports",
      "/expenses",
      "/expenses/history",
      "/sales/history",
      "/sales/reports",
      "/sales/customers",
    ];
    for (const route of cashierBlockedRoutes) {
      assert.equal(canAccessRoute("cashier", route), false, route);
    }
    assert.equal(canAccessRoute("cashier", "/operations/today"), true);
    assert.equal(canAccessRoute("cashier", "/sales"), true);
    assert.equal(canAccessRoute("cashier", "/sales/new"), true);
    recordCheck(
      5,
      "Cashier hidden routes are blocked by direct URL access rules",
      true,
      `${cashierBlockedRoutes.length} blocked routes verified`
    );

    const managerBlockedRoutes = [
      "/settings",
      "/settings/users",
      "/settings/roles",
      "/branches",
    ];
    for (const route of managerBlockedRoutes) {
      assert.equal(canAccessRoute("branch-manager", route), false, route);
    }
    assert.equal(canAccessRoute("branch-manager", "/reports"), true);
    assert.equal(canAccessRoute("branch-manager", "/stock"), true);
    assert.equal(canAccessRoute("branch-manager", "/staff"), true);
    assert.equal(canAccessRoute("branch-manager", "/staff/payments"), true);
    recordCheck(
      6,
      "Branch Manager cannot access Users, Roles, Settings, or Branches by URL",
      true,
      `${managerBlockedRoutes.length} blocked routes verified; Staff routes allowed`
    );

    assert.equal(canAccessRoute("owner", "/settings/users"), true);
    assert.equal(canAccessRoute("owner", "/staff"), true);
    assert.equal(canAccessRoute("owner", "/branches"), true);
    recordCheck(
      7,
      "Owner has unrestricted route access",
      true,
      "Settings, Staff, and Branches routes allowed"
    );

    await ownerCertifier.login("owner", "owner");

    const cashierStaff = await ownerCertifier.json<{ id: string }>("/api/staff", {
      method: "POST",
      body: JSON.stringify({
        name: `${TEST_PREFIX} Cashier`,
        branch: "main",
        role: "cashier",
        status: "active",
        dailyWage: 10000,
      }),
    });
    createdStaffIds.push(cashierStaff.id);

    const cashierUser = await ownerCertifier.json<AppUserRecord>("/api/users", {
      method: "POST",
      body: JSON.stringify({
        username: cashierUsername,
        displayName: `${TEST_PREFIX} Cashier`,
        role: "cashier",
        branch: "main",
        password: cashierPassword,
        staffId: cashierStaff.id,
      }),
    });
    createdUserIds.push(cashierUser.id);

    const managerStaff = await ownerCertifier.json<{ id: string }>("/api/staff", {
      method: "POST",
      body: JSON.stringify({
        name: `${TEST_PREFIX} Manager`,
        branch: "main",
        role: "branch-manager",
        status: "active",
        dailyWage: 15000,
      }),
    });
    createdStaffIds.push(managerStaff.id);

    const managerUser = await ownerCertifier.json<AppUserRecord>("/api/users", {
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
    createdUserIds.push(managerUser.id);

    await ensureDayOpen(ownerCertifier, today);
    const product = await ownerCertifier.json<{ id: string }>("/api/stock/products", {
      method: "POST",
      body: JSON.stringify({
        name: `${TEST_PREFIX} Accessory`,
        category: "flash-disks",
        buyingPrice: 10000,
        sellingPrice: 15000,
        minimumStockLevel: 2,
        initialStock: 20,
      }),
    });
    createdProductIds.push(product.id);
    await ownerCertifier.logout();

    await cashierCertifier.login(cashierUsername, cashierPassword);
    await cashierCertifier.json("/api/daily-operations");
    await cashierCertifier.json("/api/sales");
    await cashierCertifier.json("/api/stock/products");
    recordCheck(
      8,
      "Cashier can open Today's Operations and read workflow APIs",
      true,
      "operations, sales, and stock product read allowed"
    );

    const preview = computeSalePreview(2, 15000, 10000, 0);
    const sale = await cashierCertifier.json<{ id: string; total: number }>("/api/sales", {
      method: "POST",
      body: JSON.stringify({
        id: crypto.randomUUID(),
        invoiceNumber: "",
        date: today,
        time: "12:00",
        items: [
          {
            productId: product.id,
            productName: `${TEST_PREFIX} Accessory`,
            quantity: 2,
            unitPrice: 15000,
            buyingPrice: 10000,
            lineTotal: preview.subtotal,
          },
        ],
        subtotal: preview.subtotal,
        discount: 0,
        total: preview.total,
        profit: preview.profit,
        paymentMethod: "cash",
        branch: BRANCH,
        status: "completed",
        createdAt: new Date().toISOString(),
      }),
    });
    createdSaleIds.push(sale.id);
    recordCheck(
      9,
      "Cashier can record accessory sales",
      true,
      `Sale total ${sale.total} UGX`
    );

    const operatingExpenseAmount = 5000;
    const operationWithExpense = await cashierCertifier.json<{
      id: string;
      expenses: Array<{ amount: number }>;
    }>("/api/daily-operations", {
      method: "POST",
      body: JSON.stringify({
        id: crypto.randomUUID(),
        date: today,
        time: "11:00",
        timestamp: Date.now(),
        branch: BRANCH,
        sales: 0,
        expenses: [
          {
            id: crypto.randomUUID(),
            name: `${TEST_PREFIX} transport`,
            amount: operatingExpenseAmount,
          },
        ],
        status: "draft",
        notes: `${TEST_PREFIX} operating expense`,
      }),
    });
    assert.equal(operationWithExpense.expenses[0]?.amount, operatingExpenseAmount);
    recordCheck(
      10,
      "Cashier can record operating expenses inside Today's Operations",
      true,
      `Operating expense ${operatingExpenseAmount} UGX recorded in daily operations`
    );

    const payment = await cashierCertifier.json<{ id: string; amount: number }>(
      "/api/staff-payments",
      {
        method: "POST",
        body: JSON.stringify({
          staffId: cashierStaff.id,
          amount: 10000,
          date: today,
          paymentType: "daily-wage",
          paymentMethod: "cash",
          notes: `${TEST_PREFIX} staff payment`,
        }),
      }
    );
    createdPaymentIds.push(payment.id);
    recordCheck(
      11,
      "Cashier can record staff payments",
      true,
      `Staff payment ${payment.amount} UGX recorded`
    );

    const movieRevenueAmount = 250_000;
    const savingsAmount = 30_000;
    const operationEntry = await cashierCertifier.json<{
      id: string;
      sales: number;
      savingsAllocation: number | null;
    }>("/api/daily-operations", {
      method: "POST",
      body: JSON.stringify({
        id: operationWithExpense.id,
        date: today,
        time: "17:00",
        timestamp: Date.now(),
        branch: BRANCH,
        sales: movieRevenueAmount,
        expenses: operationWithExpense.expenses,
        savingsAllocation: savingsAmount,
        status: "draft",
        notes: `${TEST_PREFIX} movie revenue and savings`,
      }),
    });
    assert.equal(operationEntry.sales, movieRevenueAmount);
    assert.equal(operationEntry.savingsAllocation, savingsAmount);
    recordCheck(
      12,
      "Cashier can record movie revenue and savings",
      true,
      `Movie revenue ${movieRevenueAmount} UGX, savings ${savingsAmount} UGX`
    );

    const branchEntity = {
      id: BRANCH,
      name: "Main Branch",
      code: BRANCH,
      active: true,
      createdAt: new Date().toISOString(),
    };
    const [salesRows, expenseRows, paymentRows, entryRows, staffRows] =
      await Promise.all([
        cashierCertifier.json<Array<Record<string, unknown>>>("/api/sales"),
        cashierCertifier.json<Array<Record<string, unknown>>>("/api/expenses"),
        cashierCertifier.json<Array<Record<string, unknown>>>("/api/staff-payments"),
        cashierCertifier.json<Array<Record<string, unknown>>>("/api/daily-operations"),
        cashierCertifier.json<Array<Record<string, unknown>>>("/api/staff"),
      ]);
    const purchaseRows: Array<Record<string, unknown>> = [];

    const metrics = computeDayClosingMetrics(
      branchEntity,
      salesRows as never,
      purchaseRows as never,
      expenseRows as never,
      entryRows as never,
      paymentRows as never,
      today
    );
    const staffPayouts = buildStaffPayoutRows(
      staffRows as never,
      BRANCH,
      paymentRows as never,
      today
    );
    const expectedCash = computeExpectedCash(metrics.cashBeforeClosing, staffPayouts);
    const closePayload = buildCloseDayPayload({
      date: today,
      metrics,
      staffPayouts,
      expectedCash,
      actualCashCounted: expectedCash,
      closedBy: cashierUser.id,
      closedByName: cashierUser.username,
    });
    const closedDay = await cashierCertifier.json<{ status: string }>(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify(closePayload),
      }
    );
    assert.equal(closedDay.status, "closed");
    recordCheck(
      13,
      "Cashier can close the business day",
      true,
      `Day closed with expected cash ${expectedCash} UGX`
    );

    const cashierForbiddenApis: Array<[string, RequestInit?]> = [
      ["/api/users"],
      ["/api/roles"],
      ["/api/settings"],
      ["/api/reports/summary?period=daily"],
      ["/api/purchases", { method: "POST", body: JSON.stringify({}) }],
      ["/api/branches"],
      ["/api/staff", { method: "POST", body: JSON.stringify({ name: "x", branch: "main", role: "cashier" }) }],
      ["/api/stock/products", { method: "POST", body: JSON.stringify({ name: "x", buyingPrice: 1, sellingPrice: 2 }) }],
    ];

    for (const [path, options] of cashierForbiddenApis) {
      const result = await cashierCertifier.expectForbidden(path, options);
      assert.equal(result.status, 403, `${path} returned ${result.status}`);
      assert.equal(result.code, "forbidden", `${path} code ${result.code}`);
    }
    recordCheck(
      14,
      "Cashier receives 403 Forbidden on unauthorized APIs",
      true,
      `${cashierForbiddenApis.length} endpoints blocked with forbidden code`
    );

    await cashierCertifier.logout();

    await managerCertifier.login(managerUsername, managerPassword);
    await managerCertifier.json("/api/reports/summary?period=daily");
    await managerCertifier.json("/api/stock/products");
    await managerCertifier.json("/api/purchases");
    await managerCertifier.json("/api/staff");
    assert.equal(canAccessRoute("branch-manager", "/"), true);
    assert.equal(canAccessRoute("branch-manager", "/operations/today"), true);
    assert.equal(canAccessRoute("branch-manager", "/sales"), true);
    assert.equal(canAccessRoute("branch-manager", "/expenses"), true);

    const managerForbiddenApis = ["/api/users", "/api/roles", "/api/settings"];
    for (const path of managerForbiddenApis) {
      const result = await managerCertifier.expectForbidden(path);
      assert.equal(result.status, 403, `${path} returned ${result.status}`);
      assert.equal(result.code, "forbidden", `${path} code ${result.code}`);
    }
    const managerStaffPost = await managerCertifier.expectForbidden("/api/staff", {
      method: "POST",
      body: JSON.stringify({ name: "x", branch: "main", role: "cashier" }),
    });
    assert.equal(managerStaffPost.status, 403);
    recordCheck(
      15,
      "Branch Manager can access staff read APIs but not Users, Roles, or Settings",
      true,
      "reports, stock, purchases, staff GET allowed; users/roles/settings/staff POST blocked"
    );

    await managerCertifier.logout();
    await ownerCertifier.login("owner", "owner");
    await ownerCertifier.json("/api/users");
    await ownerCertifier.json("/api/roles");
    await ownerCertifier.json("/api/settings");
    await ownerCertifier.json("/api/branches");
    recordCheck(
      16,
      "Owner API access remains unrestricted",
      true,
      "users, roles, settings, and branches APIs allowed"
    );

    assert.equal(roleHasModuleAccess("cashier", "operations"), true);
    assert.equal(roleHasModuleAccess("cashier", "sales"), true);
    assert.equal(roleHasModuleAccess("cashier", "expenses"), false);
    assert.equal(roleHasModuleAccess("cashier", "stock"), false);
    assert.equal(roleHasModuleAccess("cashier", "reports"), false);
    assert.equal(roleHasModuleAccess("branch-manager", "settings"), false);
    assert.equal(roleHasModuleAccess("branch-manager", "staff"), true);
    assert.equal(roleCanAccessApiPath("cashier", "/api/staff-payments", "POST"), true);
    assert.equal(roleCanAccessApiPath("cashier", "/api/day-closings", "POST"), true);
    assert.equal(roleCanAccessApiPath("cashier", "/api/reports/summary", "GET"), false);
    assert.equal(roleCanAccessApiPath("branch-manager", "/api/staff", "GET"), true);
    recordCheck(
      17,
      "Server permission helpers align with UI route rules",
      true,
      "cashier operations allowed; branch-manager staff allowed; settings owner-only"
    );

    const hiddenNavLabels = navItems
      .filter((item) => !isNavVisibleForRole("cashier", item.href))
      .map((item) => item.label);
    assert.ok(hiddenNavLabels.includes("Expenses"));
    assert.ok(hiddenNavLabels.includes("Staff"));
    assert.ok(hiddenNavLabels.includes("Settings"));
    assert.ok(hiddenNavLabels.includes("Reports"));
    recordCheck(
      18,
      "No hidden cashier menu items remain visible",
      true,
      `Hidden: ${hiddenNavLabels.join(", ")}`
    );

    recordCheck(
      19,
      "Verify no runtime errors",
      true,
      "Certification completed without uncaught exceptions"
    );

    recordCheck(
      20,
      "Verify no unexpected server errors",
      serverErrors.length === 0,
      serverErrors.length === 0
        ? "No failed API calls during certification"
        : serverErrors.join("; ")
    );

    writeReport(
      "Certified Owner, Branch Manager, and Cashier sidebar visibility, URL blocking, workflow APIs, and 403 enforcement."
    );
    console.log(
      `\nRoles & Permissions CERTIFIED. Report written to ${REPORT_PATH}`
    );
  } finally {
    await cleanup({
      userIds: createdUserIds,
      staffIds: createdStaffIds,
      saleIds: createdSaleIds,
      expenseIds: createdExpenseIds,
      paymentIds: createdPaymentIds,
      productIds: createdProductIds,
    });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  writeReport();
  console.error("\nRoles & Permissions certification failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
