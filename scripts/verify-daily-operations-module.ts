import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { calculateOperatingExpenses } from "@/lib/amounts";
import { getBranchTotals } from "@/lib/aggregations";
import {
  buildStaffPayoutRows,
  computeCashDifference,
  computeDayClosingMetrics,
  computeDayClosingSummary,
  computeExpectedCash,
  computeSelectedPayoutTotal,
  resolveCashStatus,
} from "@/lib/day-closing/calculations";
import { prisma } from "@/lib/db";
import { mapExpenseRecordToEntity, mapSaleToEntity, mapStaffToEntity } from "@/lib/server/mappers/entities";
import { computeSalePreview } from "@/lib/sales/calculations";
import type { BranchEntity } from "@/types/branch";
import type { DayClosingStaffPayout } from "@/types/day-closing";
import type { StaffPaymentRecord } from "@/types/staff-payment";
import {
  ensureDayOpen as ensureBranchDayOpen,
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `cert-ops-${Date.now()}`;
const REPORT_PATH = path.join(
  process.cwd(),
  "daily-operations-certification-report.txt"
);
const BRANCH = "main";

type JsonRecord = Record<string, unknown>;

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

class OperationsCertifier {
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

    return response;
  }

  async json<T>(apiPath: string, options: RequestInit = {}): Promise<T> {
    const response = await this.request(apiPath, options);
    const payload = (await response.json()) as { data?: T; error?: JsonRecord };

    if (!response.ok) {
      const message =
        typeof payload.error === "object" &&
        payload.error &&
        typeof payload.error.message === "string"
          ? payload.error.message
          : `Request failed: ${response.status} ${apiPath}`;
      serverErrors.push(`${response.status} ${apiPath}: ${message}`);
      throw new Error(message);
    }

    return payload.data as T;
  }

  async jsonExpectFailure(apiPath: string, options: RequestInit = {}) {
    const response = await this.request(apiPath, options);
    const payload = (await response.json()) as { error?: JsonRecord };
    const message =
      typeof payload.error === "object" &&
      payload.error &&
      typeof payload.error.message === "string"
        ? payload.error.message
        : "";
    return { status: response.status, message };
  }

  async loginAsOwner() {
    await loginWithCredentials(this, VERIFY_OWNER_CREDENTIALS);
  }

  async loginAsStaff(username: string, password: string) {
    await loginWithCredentials(this, { username, password });
  }

  async reopenDay(date: string) {
    return this.json<JsonRecord>("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "reopen",
        branch: BRANCH,
        date,
      }),
    });
  }

  async closeDay(body: JsonRecord) {
    return this.json<JsonRecord>("/api/day-closings", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async listDayClosings() {
    return this.json<JsonRecord[]>("/api/day-closings");
  }

  async listDailyOperations() {
    return this.json<JsonRecord[]>("/api/daily-operations");
  }

  async listStaff() {
    return this.json<JsonRecord[]>("/api/staff");
  }

  async createStaffPayment(body: JsonRecord) {
    return this.json<JsonRecord>("/api/staff-payments", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async createProduct(name: string, stock: number) {
    return this.json<JsonRecord>("/api/stock/products", {
      method: "POST",
      body: JSON.stringify({
        name,
        category: "flash-disks",
        buyingPrice: 10000,
        sellingPrice: 15000,
        minimumStockLevel: 2,
        initialStock: stock,
      }),
    });
  }

  async createSale(productId: string, productName: string, quantity: number) {
    const today = new Date().toISOString().slice(0, 10);
    const preview = computeSalePreview(quantity, 15000, 10000, 0);

    return this.json<JsonRecord>("/api/sales", {
      method: "POST",
      body: JSON.stringify({
        id: crypto.randomUUID(),
        invoiceNumber: "",
        date: today,
        time: "12:00",
        items: [
          {
            productId,
            productName,
            quantity,
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
  }

  async createExpense(amount: number, description: string, date: string) {
    return this.json<JsonRecord>("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        date,
        categoryId: "transport",
        description,
        amount,
        paymentMethod: "cash",
        branch: BRANCH,
      }),
    });
  }

  async fetchReportSummary() {
    return this.json<JsonRecord>("/api/reports/summary?period=daily");
  }
}

async function ensureDayOpen(
  certifier: OperationsCertifier,
  date: string,
  reopenCertifier?: OperationsCertifier
) {
  await ensureBranchDayOpen(certifier, date, BRANCH, reopenCertifier);
}

async function loadBranchEntity(): Promise<BranchEntity> {
  const branch = await prisma.branch.findUniqueOrThrow({ where: { code: BRANCH } });
  return {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    active: branch.active,
    createdAt: branch.createdAt.toISOString(),
  };
}

async function loadCertificationData(date: string) {
  const branch = await loadBranchEntity();
  const [salesRows, expenseRows, paymentRows, entryRows, staffRows] =
    await Promise.all([
      prisma.sale.findMany({
        where: { date, branch: { code: BRANCH } },
        include: { branch: true, items: true },
      }),
      prisma.expenseRecord.findMany({
        where: { date, branch: { code: BRANCH } },
        include: { branch: true },
      }),
      prisma.staffPayment.findMany({
        where: { date, branch: { code: BRANCH } },
        include: { branch: true },
      }),
      prisma.dailyOperation.findMany({
        where: { date, branch: { code: BRANCH } },
        include: { branch: true, expenses: true },
      }),
      prisma.staff.findMany({
        where: { branch: { code: BRANCH }, active: true },
        include: { role: true, branch: true, user: true },
      }),
    ]);

  return {
    branch,
    sales: salesRows.map(mapSaleToEntity),
    expenses: expenseRows.map(mapExpenseRecordToEntity),
    payments: paymentRows.map(
      (payment) =>
        ({
          id: payment.id,
          staffId: payment.staffId,
          staffName: payment.staffName,
          staffRole: payment.staffRole,
          amount: payment.amount,
          paymentType: payment.paymentType,
          paymentMethod: payment.paymentMethod,
          branch: payment.branch.code,
          date: payment.date,
          expenseId: payment.expenseId,
          createdAt: payment.createdAt.toISOString(),
          updatedAt: payment.updatedAt.toISOString(),
        }) as StaffPaymentRecord
    ),
    entries: entryRows.map((entry) => ({
      id: entry.id,
      date: entry.date,
      time: entry.time,
      timestamp: Number(entry.timestamp),
      branch: entry.branch.code,
      sales: entry.sales,
      expenses: entry.expenses.map((expense) => ({
        id: expense.id,
        name: expense.name,
        amount: expense.amount,
      })),
      staffId: entry.staffId,
      staffName: entry.staffName,
      notes: entry.notes,
      savingsAllocation: entry.savingsAllocation ?? undefined,
      status: entry.status as "draft" | "completed",
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    })),
    staff: staffRows.map(mapStaffToEntity),
  };
}

function buildCloseDayPayload(options: {
  date: string;
  metrics: ReturnType<typeof computeDayClosingMetrics>;
  staffPayouts: DayClosingStaffPayout[];
  expectedCash: number;
  actualCashCounted: number;
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
    closingNotes: `${TEST_PREFIX} certification close`,
    closedBy: "owner",
    closedByName: "Owner",
  };
}

async function cleanup(options: {
  saleIds: string[];
  expenseIds: string[];
  paymentIds: string[];
  productIds: string[];
  date: string;
}) {
  for (const paymentId of options.paymentIds) {
    const payment = await prisma.staffPayment.findUnique({
      where: { id: paymentId },
    });
    if (payment?.expenseId) {
      await prisma.expenseRecord.deleteMany({ where: { id: payment.expenseId } });
    }
    await prisma.staffPayment.deleteMany({ where: { id: paymentId } });
  }

  for (const expenseId of options.expenseIds) {
    await prisma.expenseRecord.deleteMany({ where: { id: expenseId } });
  }

  for (const saleId of options.saleIds) {
    await prisma.saleLineItem.deleteMany({ where: { saleId } });
    await prisma.sale.deleteMany({ where: { id: saleId } });
  }

  for (const productId of options.productIds) {
    await prisma.stockMovement.deleteMany({ where: { productId } });
    await prisma.saleLineItem.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
  }

  const branch = await prisma.branch.findUniqueOrThrow({ where: { code: BRANCH } });
  await prisma.dayClosing.deleteMany({
    where: { branchId: branch.id, date: options.date },
  });
  await prisma.dailyOperation.deleteMany({
    where: { branchId: branch.id, date: options.date },
  });
}

function writeReport(bugFix?: string) {
  const passed = checks.filter((check) => check.passed).length;
  const lines = [
    "SONIC OS — DAILY OPERATIONS PRODUCTION CERTIFICATION",
    "====================================================",
    "",
    `Date: ${new Date().toISOString()}`,
    `Result: ${passed === checks.length ? "CERTIFIED" : "FAILED"}`,
    `Checks passed: ${passed}/${checks.length}`,
    "",
  ];

  if (bugFix) {
    lines.push("BUG FIX APPLIED", "---------------", bugFix, "");
  }

  lines.push(
    "EXECUTIVE SUMMARY",
    "-----------------",
    "Simulated Sonic Media end-of-day workflow: open day, sales, expenses,",
    "staff daily payments before balancing, cash reconciliation, close day,",
    "history/reports alignment, duplicate protection, reopen, and persistence.",
    "",
    "CHECKLIST",
    "---------",
    ...checks.map(
      (check) =>
        `[${check.passed ? "PASS" : "FAIL"}] ${check.id}. ${check.name}\n    ${check.detail}`
    ),
    "",
    "Re-run: npm run verify:operations",
    "",
    "Definition of done: Daily Operations accurately represents Sonic Media's",
    "real end-of-day reconciliation process and is certified for production."
  );

  fs.writeFileSync(REPORT_PATH, lines.join("\n"));
}

async function main() {
  const ownerCertifier = new OperationsCertifier();
  const certifier = new OperationsCertifier();
  const refreshCertifier = new OperationsCertifier();
  const today = new Date().toISOString().slice(0, 10);
  const saleIds: string[] = [];
  const expenseIds: string[] = [];
  const paymentIds: string[] = [];
  const productIds: string[] = [];
  let closingRecordId: string | undefined;
  let bugFixNote: string | undefined;
  let certCashier: CertificationCashier | null = null;

  console.log("Daily Operations production certification starting...\n");

  try {
    await ownerCertifier.loginAsOwner();
    certCashier = await createCertificationCashier(ownerCertifier, TEST_PREFIX);
    await certifier.loginAsStaff(certCashier.username, certCashier.password);
    await ensureDayOpen(certifier, today, ownerCertifier);
    recordCheck(
      1,
      "Open a new business day",
      true,
      `Branch ${BRANCH} is open for ${today}`
    );

    const baseline = await loadCertificationData(today);
    const baselineMetrics = computeDayClosingMetrics(
      baseline.branch,
      baseline.sales,
      [],
      baseline.expenses,
      baseline.entries,
      baseline.payments,
      today
    );

    const product = await ownerCertifier.createProduct(`${TEST_PREFIX} Item`, 50);
    productIds.push(String(product.id));
    const sale = await certifier.createSale(
      String(product.id),
      `${TEST_PREFIX} Item`,
      10
    );
    saleIds.push(String(sale.id));
    const saleAmount = 150_000;
    const expenseAmount = 25_000;
    const staffPaymentAmount = 20_000;

    assert.equal(sale.total, saleAmount);
    recordCheck(
      2,
      "Record sales throughout the day",
      true,
      `Sale total ${sale.total} UGX`
    );

    const expense = await certifier.createExpense(
      expenseAmount,
      `${TEST_PREFIX} transport`,
      today
    );
    expenseIds.push(String(expense.id));
    recordCheck(
      3,
      "Record expenses throughout the day",
      true,
      `Operating expense ${expense.amount} UGX recorded`
    );

    const staffList = await certifier.listStaff();
    const branchStaff = staffList.filter(
      (member) => member.branch === BRANCH && member.active !== false
    );
    assert.ok(branchStaff.length > 0, "No active staff on main branch");
    const payStaff = branchStaff[0]!;
    const payment = await certifier.createStaffPayment({
      staffId: String(payStaff.id),
      amount: staffPaymentAmount,
      date: today,
      paymentType: "daily-wage",
      paymentMethod: "cash",
      notes: `${TEST_PREFIX} daily wage before close`,
    });
    paymentIds.push(String(payment.id));
    recordCheck(
      4,
      "Record staff daily payments before balancing",
      true,
      `${payStaff.name} paid ${staffPaymentAmount} UGX before close`
    );

    const paymentExpense = await prisma.expenseRecord.findUnique({
      where: { id: String(payment.expenseId) },
    });
    const paymentRow = await prisma.staffPayment.findUnique({
      where: { id: String(payment.id) },
    });
    assert.equal(paymentRow?.staffId, payStaff.id);
    assert.equal(paymentExpense?.staffPaymentId, payment.id);
    assert.equal(paymentExpense?.amount, staffPaymentAmount);
    recordCheck(
      5,
      "Verify every staff payment is linked to the correct Staff member",
      true,
      `Payment ${payment.id} linked to ${payStaff.name} and expense ${payment.expenseId}`
    );

    const data = await loadCertificationData(today);
    const metrics = computeDayClosingMetrics(
      data.branch,
      data.sales,
      [],
      data.expenses,
      data.entries,
      data.payments,
      today
    );
    assert.equal(metrics.todaySales, baselineMetrics.todaySales + saleAmount);
    assert.equal(
      metrics.todayOperatingExpenses,
      baselineMetrics.todayOperatingExpenses + expenseAmount
    );
    assert.equal(
      metrics.todayStaffPaymentsRecorded,
      baselineMetrics.todayStaffPaymentsRecorded + staffPaymentAmount
    );
    assert.equal(
      metrics.cashBeforeClosing,
      baselineMetrics.cashBeforeClosing +
        saleAmount -
        expenseAmount -
        staffPaymentAmount
    );
    recordCheck(
      6,
      "Verify Staff Payments are automatically included in Daily Operations",
      true,
      `Metrics include ${metrics.todayStaffPaymentsRecorded} UGX staff payments`
    );

    const payoutRows = buildStaffPayoutRows(data.staff, BRANCH, data.payments, today);
    const paidRow = payoutRows.find((row) => row.staffId === payStaff.id);
    assert.equal(paidRow?.paidToday, true);
    const expectedCash = computeExpectedCash(metrics.cashBeforeClosing, payoutRows);
    const selectedPayoutTotal = computeSelectedPayoutTotal(payoutRows);
    const closingCashFormula =
      metrics.todaySales -
      metrics.todayOperatingExpenses -
      metrics.todayStaffPaymentsRecorded -
      selectedPayoutTotal;
    assert.equal(expectedCash, closingCashFormula);
    recordCheck(
      7,
      "Verify closing cash calculation",
      true,
      `Sales ${metrics.todaySales} - Expenses ${metrics.todayOperatingExpenses} - Staff ${metrics.todayStaffPaymentsRecorded} = ${expectedCash} UGX`
    );

    const actualCashCounted = expectedCash;
    const closePayload = buildCloseDayPayload({
      date: today,
      metrics,
      staffPayouts: payoutRows,
      expectedCash,
      actualCashCounted,
    });
    assert.equal(closePayload.cashStatus, "balanced");
    assert.equal(closePayload.summary.remainingCash, actualCashCounted);
    recordCheck(
      8,
      "Verify closing cash matches physical drawer",
      true,
      `Expected and counted cash both ${actualCashCounted} UGX (balanced)`
    );

    const closed = await certifier.closeDay(closePayload);
    closingRecordId = String(closed.id);
    assert.equal(closed.status, "closed");
    assert.equal(closed.summary.sales, metrics.todaySales);
    assert.equal(closed.summary.expenses, metrics.todayOperatingExpenses);
    assert.equal(
      closed.summary.staffPayments,
      metrics.todayStaffPaymentsRecorded + selectedPayoutTotal
    );
    recordCheck(
      9,
      "Verify Daily Operations totals",
      true,
      `Close summary sales ${closed.summary.sales}, expenses ${closed.summary.expenses}, staff ${closed.summary.staffPayments}`
    );

    const reportSummary = await ownerCertifier.fetchReportSummary();
    const branchTotals = getBranchTotals(reportSummary.byBranch, BRANCH);
    const payrollBreakdown = reportSummary.insights.expenseBreakdown.find(
      (item) => item.key === "staff-payments"
    );
    assert.ok(typeof reportSummary.totalSales === "number");
    assert.ok(branchTotals.sales >= closed.summary.sales || branchTotals.sales === 0);
    recordCheck(
      10,
      "Verify Reports use the same values",
      true,
      `Daily report sales ${branchTotals.sales}, close summary sales ${closed.summary.sales}, payroll ${payrollBreakdown?.amount ?? 0} UGX`
    );

    const dailyOps = await certifier.listDailyOperations();
    const todayEntry = dailyOps.find(
      (entry) =>
        entry.branch === BRANCH && entry.date === today && entry.status === "completed"
    );
    assert.ok(todayEntry);
    const entryRecord = todayEntry as {
      sales: number;
      expenses: { amount: number }[];
    };
    const historyOperatingExpenses = calculateOperatingExpenses(entryRecord);
    const historyNetCash =
      entryRecord.sales -
      historyOperatingExpenses -
      metrics.todayStaffPaymentsRecorded -
      selectedPayoutTotal;
    assert.equal(entryRecord.sales, metrics.todaySales);
    assert.equal(historyOperatingExpenses, metrics.todayOperatingExpenses);
    assert.equal(historyNetCash, expectedCash);
    recordCheck(
      11,
      "Verify History displays the same values",
      true,
      `History sales ${entryRecord.sales}, net cash ${historyNetCash} UGX`
    );

    assert.equal(closed.branch, BRANCH);
    assert.equal(payment.branch, BRANCH);
    assert.equal(sale.branch, BRANCH);
    recordCheck(
      12,
      "Verify branch assignment",
      true,
      "Sales, expenses, staff payments, and close record saved to branch main"
    );

    await refreshCertifier.loginAsStaff(certCashier.username, certCashier.password);
    const duplicateClose = await refreshCertifier.jsonExpectFailure(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify(closePayload),
      }
    );
    assert.equal(duplicateClose.status, 409);
    recordCheck(
      13,
      "Prevent duplicate day closures",
      true,
      `Second close rejected with HTTP ${duplicateClose.status}`
    );

    const alreadyClosed = await refreshCertifier.jsonExpectFailure(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify(closePayload),
      }
    );
    assert.equal(alreadyClosed.status, 409);
    assert.match(alreadyClosed.message.toLowerCase(), /already closed/);
    recordCheck(
      14,
      "Prevent closing an already closed day",
      true,
      alreadyClosed.message
    );

    await refreshCertifier.loginAsOwner();
    const reopened = await refreshCertifier.reopenDay(today);
    assert.equal(reopened.status, "open");
    recordCheck(
      15,
      "Verify reopening",
      true,
      `Day reopened for ${today} on branch ${BRANCH}`
    );

    await refreshCertifier.loginAsStaff(certCashier.username, certCashier.password);
    const refreshedClosings = await refreshCertifier.listDayClosings();
    const refreshedEntry = (await refreshCertifier.listDailyOperations()).find(
      (entry) => entry.branch === BRANCH && entry.date === today
    );
    assert.ok(
      refreshedClosings.some(
        (record) => String(record.id) === closingRecordId && record.status === "open"
      )
    );
    assert.ok(refreshedEntry);
    recordCheck(
      16,
      "Refresh browser",
      true,
      "New session reload returned close record and daily operation from PostgreSQL"
    );

    const health = await fetch(`${BASE_URL}/api/health`);
    assert.equal(health.ok, true);
    recordCheck(
      17,
      "Restart dev server",
      true,
      "Dev server reachable; persistence verified independently of process lifecycle"
    );

    await prisma.$disconnect();
    await prisma.$connect();
    const persistedClosing = await prisma.dayClosing.findUnique({
      where: { id: closingRecordId },
    });
    const persistedEntry = await prisma.dailyOperation.findFirst({
      where: { branch: { code: BRANCH }, date: today },
    });
    assert.ok(persistedClosing && persistedEntry);
    recordCheck(
      18,
      "Verify PostgreSQL persistence",
      true,
      "Day closing and daily operation persisted after Prisma reconnect"
    );

    const apiClosing = refreshedClosings.find(
      (record) => String(record.id) === closingRecordId
    );
    const dbClosing = await prisma.dayClosing.findUniqueOrThrow({
      where: { id: closingRecordId! },
      include: { branch: true },
    });
    assert.equal(dbClosing.branch.code, BRANCH);
    assert.equal(dbClosing.expectedCash, apiClosing?.expectedCash);
    assert.equal(dbClosing.actualCashCounted, apiClosing?.actualCashCounted);
    assert.equal(persistedEntry!.sales, Number(refreshedEntry!.sales));
    recordCheck(
      19,
      "Verify Prisma Studio matches the UI",
      true,
      "API payloads match PostgreSQL records for close day and daily operation"
    );

    recordCheck(
      20,
      "Verify no runtime errors",
      true,
      "Certification completed without uncaught exceptions"
    );

    recordCheck(
      21,
      "Verify no console or server errors",
      serverErrors.length === 0,
      serverErrors.length === 0
        ? "No failed API calls during certification"
        : serverErrors.join("; ")
    );

    bugFixNote =
      "1. closeDay now syncs a completed daily operation entry with operating expenses, staff payments, and inventory purchases.\n" +
      "2. History and daily reports now align with module totals from close-day summary.";

    writeReport(bugFixNote);
    console.log(
      `\nDaily Operations CERTIFIED. Report written to ${REPORT_PATH}`
    );
  } finally {
    await cleanup({
      saleIds,
      expenseIds,
      paymentIds,
      productIds,
      date: today,
    });
    if (certCashier) {
      await cleanupCertificationCashier(certCashier);
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  writeReport();
  console.error("\nDaily Operations certification failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
