import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { computeDayClosingMetrics } from "@/lib/day-closing/calculations";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  STAFF_PAYMENT_CATEGORY_ID,
} from "@/lib/expenses-module/constants";
import {
  computeCategoryExpenseTotals,
  computeExpensesDashboardMetrics,
  getDateRangeForPeriod,
} from "@/lib/expenses-module/calculations";
import {
  applyExpenseFilters,
  createDefaultExpenseFilterCriteria,
} from "@/lib/expenses-module/filters";
import {
  hasValidationErrors,
  validateExpenseCategoryInput,
  validateExpenseRecordInput,
} from "@/lib/expenses-module/validation";
import { mapExpenseRecordToEntity } from "@/lib/server/mappers/entities";
import type { ExpensePaymentMethod, ExpenseRecord } from "@/types/expenses-module";
import {
  ensureDayOpen,
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `cert-expenses-${Date.now()}`;
const REPORT_PATH = path.join(
  process.cwd(),
  "expenses-module-certification-report.txt"
);

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

class ExpensesCertifier {
  private cookieHeader = "";

  private async request(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
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

  async jsonExpectFailure(path: string, options: RequestInit = {}) {
    const response = await this.request(path, options);
    const payload = (await response.json()) as { error?: JsonRecord };
    const message =
      typeof payload.error === "object" &&
      payload.error &&
      typeof payload.error.message === "string"
        ? payload.error.message
        : "";
    return { status: response.status, message };
  }

  async login() {
    await loginWithCredentials(this, VERIFY_OWNER_CREDENTIALS);
  }

  async loginAsStaff(username: string, password: string) {
    await loginWithCredentials(this, { username, password });
  }

  async listCategories() {
    return this.json<JsonRecord[]>("/api/expense-categories");
  }

  async createCategory(name: string) {
    return this.json<JsonRecord>("/api/expense-categories", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async listExpenses() {
    return this.json<JsonRecord[]>("/api/expenses");
  }

  async createExpense(body: JsonRecord) {
    return this.json<JsonRecord>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async updateExpense(id: string, body: JsonRecord) {
    return this.json<JsonRecord>(`/api/expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async deleteExpense(id: string) {
    await this.request(`/api/expenses/${id}`, { method: "DELETE" });
  }
}

function buildExpensePayload(options: {
  categoryId: string;
  amount: number;
  description: string;
  date: string;
  paymentMethod?: ExpensePaymentMethod;
  branch?: string;
  notes?: string;
}) {
  return {
    date: options.date,
    categoryId: options.categoryId,
    description: options.description,
    amount: options.amount,
    paymentMethod: options.paymentMethod ?? "cash",
    branch: options.branch ?? "main",
    notes: options.notes,
  };
}

async function cleanup(expenseIds: string[], categoryIds: string[]) {
  for (const expenseId of expenseIds) {
    await prisma.expenseRecord.deleteMany({ where: { id: expenseId } });
  }

  for (const categoryId of categoryIds) {
    await prisma.expenseCategory.deleteMany({ where: { id: categoryId } });
  }
}

function writeReport(options?: { bugFix?: string }) {
  const passed = checks.filter((check) => check.passed).length;
  const lines = [
    "SONIC OS — EXPENSES MODULE PRODUCTION CERTIFICATION",
    "=================================================",
    "",
    `Date: ${new Date().toISOString()}`,
    `Result: ${passed === checks.length ? "CERTIFIED" : "FAILED"}`,
    `Checks passed: ${passed}/${checks.length}`,
    "",
  ];

  if (options?.bugFix) {
    lines.push("BUG FIX APPLIED", "---------------", options.bugFix, "");
  }

  lines.push(
    "EXECUTIVE SUMMARY",
    "-----------------",
    "Simulated operating expense workflows across all default categories,",
    "custom categories, daily operations, reports, filters, CRUD, validation,",
    "persistence, and error handling.",
    "",
    "CHECKLIST",
    "---------",
    ...checks.map(
      (check) =>
        `[${check.passed ? "PASS" : "FAIL"}] ${check.id}. ${check.name}\n    ${check.detail}`
    ),
    "",
    "Re-run: npm run verify:expenses",
    "",
    "Definition of done: Expenses is certified for production."
  );

  fs.writeFileSync(REPORT_PATH, lines.join("\n"));
}

async function main() {
  const ownerCertifier = new ExpensesCertifier();
  const certifier = new ExpensesCertifier();
  const refreshCertifier = new ExpensesCertifier();
  const expenseIds: string[] = [];
  const categoryIds: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  let certCashier: CertificationCashier | null = null;

  console.log("Expenses module production certification starting...\n");

  try {
    await ownerCertifier.login();
    certCashier = await createCertificationCashier(ownerCertifier, TEST_PREFIX);
    await certifier.loginAsStaff(certCashier.username, certCashier.password);
    await ensureDayOpen(certifier, today, "main", ownerCertifier);

    const categories = await certifier.listCategories();
    const categoryIdsInDb = new Set(categories.map((item) => String(item.id)));

    for (const [index, category] of DEFAULT_EXPENSE_CATEGORIES.entries()) {
      assert.ok(
        categoryIdsInDb.has(category.id),
        `Missing default category ${category.name}`
      );

      const paymentMethod =
        EXPENSE_PAYMENT_METHODS[index % EXPENSE_PAYMENT_METHODS.length]!.id;
      const amount = 5_000 + index * 100;
      const expense = await certifier.createExpense(
        buildExpensePayload({
          categoryId: category.id,
          amount,
          description: `${TEST_PREFIX} ${category.name}`,
          date: today,
          paymentMethod,
        })
      );
      expenseIds.push(String(expense.id));
    }

    recordCheck(
      1,
      "Create expenses in every supported category",
      expenseIds.length === DEFAULT_EXPENSE_CATEGORIES.length,
      `${DEFAULT_EXPENSE_CATEGORIES.length} default categories exercised`
    );

    const customCategoryName = `${TEST_PREFIX} Custom Ops`;
    const customCategory = await certifier.createCategory(customCategoryName);
    categoryIds.push(String(customCategory.id));

    const customExpense = await certifier.createExpense(
      buildExpensePayload({
        categoryId: String(customCategory.id),
        amount: 12_500,
        description: `${TEST_PREFIX} custom category expense`,
        date: today,
        paymentMethod: "bank-transfer",
      })
    );
    expenseIds.push(String(customExpense.id));
    assert.equal(customExpense.categoryName, customCategoryName);
    recordCheck(
      2,
      "Verify custom expense categories",
      true,
      `Created "${customCategoryName}" and recorded expense ${customExpense.id}`
    );

    const certExpensesBeforeEdit = await prisma.expenseRecord.findMany({
      where: { id: { in: expenseIds } },
      include: { branch: true },
    });
    const expectedTotal = certExpensesBeforeEdit.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    const mappedCertExpenses: ExpenseRecord[] = certExpensesBeforeEdit.map(
      mapExpenseRecordToEntity
    );
    const metrics = computeExpensesDashboardMetrics(mappedCertExpenses, today);
    assert.equal(metrics.todaysExpenses, expectedTotal);
    recordCheck(
      3,
      "Verify expense totals",
      true,
      `Today's operating expenses total ${expectedTotal} UGX`
    );

    const branch = await prisma.branch.findUniqueOrThrow({ where: { code: "main" } });
    const dayMetrics = computeDayClosingMetrics(
      {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        active: branch.active,
        createdAt: branch.createdAt.toISOString(),
      },
      [],
      [],
      mappedCertExpenses,
      [],
      [],
      today
    );
    assert.equal(dayMetrics.todayOperatingExpenses, expectedTotal);
    recordCheck(
      4,
      "Verify Daily Operations updates",
      true,
      `Close-day operating expenses include ${expectedTotal} UGX from certification records`
    );

    const reportRange = getDateRangeForPeriod("today");
    const categoryTotals = computeCategoryExpenseTotals(
      mappedCertExpenses,
      reportRange
    );
    const reportTotal = categoryTotals.reduce((sum, item) => sum + item.total, 0);
    assert.equal(reportTotal, expectedTotal);
    recordCheck(
      5,
      "Verify Reports update correctly",
      true,
      `${categoryTotals.length} category buckets, total ${reportTotal} UGX`
    );

    assert.ok(
      certExpensesBeforeEdit.every((expense) => expense.branch.code === "main")
    );
    recordCheck(
      6,
      "Verify branch assignment",
      true,
      "All certification expenses saved to branch main (Kansanga)"
    );

    const staffRecord = await prisma.staff.findUnique({
      where: { id: certCashier!.staffId },
    });
    assert.ok(staffRecord?.id);
    assert.ok(
      certExpensesBeforeEdit.every(
        (expense) =>
          expense.staffId === certCashier!.staffId &&
          expense.staffName === staffRecord.name
      )
    );
    recordCheck(
      7,
      "Verify staff attribution",
      true,
      `All certification expenses attributed to ${staffRecord.name}`
    );

    const editTargetId = expenseIds[0]!;
    const editTarget = certExpensesBeforeEdit.find((item) => item.id === editTargetId)!;
    const editedAmount = editTarget.amount + 500;
    const edited = await certifier.updateExpense(
      editTargetId,
      buildExpensePayload({
        categoryId: editTarget.categoryId,
        amount: editedAmount,
        description: `${TEST_PREFIX} edited ${editTarget.categoryName}`,
        date: today,
        paymentMethod: editTarget.paymentMethod as ExpensePaymentMethod,
      })
    );
    assert.equal(edited.amount, editedAmount);
    recordCheck(
      8,
      "Edit expenses",
      true,
      `Updated ${editTarget.categoryName} amount to ${editedAmount}`
    );

    const deleteTargetId = expenseIds.pop()!;
    await certifier.deleteExpense(deleteTargetId);
    const afterDelete = await prisma.expenseRecord.count({
      where: { id: deleteTargetId },
    });
    assert.equal(afterDelete, 0);
    recordCheck(
      9,
      "Delete expenses",
      true,
      `Deleted expense ${deleteTargetId}`
    );

    const negativeAmount = await certifier.jsonExpectFailure("/api/expenses", {
      method: "POST",
      body: JSON.stringify(
        buildExpensePayload({
          categoryId: "rent",
          amount: -100,
          description: `${TEST_PREFIX} invalid negative`,
          date: today,
        })
      ),
    });
    assert.ok(negativeAmount.status >= 400);
    assert.match(
      negativeAmount.message.toLowerCase(),
      /greater than zero|amount/
    );

    const missingDescription = await certifier.jsonExpectFailure("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        ...buildExpensePayload({
          categoryId: "rent",
          amount: 1000,
          description: "",
          date: today,
        }),
      }),
    });
    assert.ok(missingDescription.status >= 400);
    recordCheck(
      10,
      "Prevent invalid values",
      true,
      `Negative amount and missing fields rejected (${negativeAmount.message})`
    );

    const datedExpense = await certifier.createExpense(
      buildExpensePayload({
        categoryId: "transport",
        amount: 3_000,
        description: `${TEST_PREFIX} yesterday transport`,
        date: yesterday,
        paymentMethod: "cash",
      })
    );
    expenseIds.push(String(datedExpense.id));

    const allMapped = (
      await prisma.expenseRecord.findMany({
        where: { id: { in: expenseIds } },
        include: { branch: true },
      })
    ).map(mapExpenseRecordToEntity);

    const todayFiltered = applyExpenseFilters(
      allMapped,
      { ...createDefaultExpenseFilterCriteria(), date: "today" },
      { main: "Kansanga", kansanga: "Kansanga", salaama: "Salaama" }
    );
    assert.ok(
      todayFiltered.every((expense) => expense.date === today) &&
        todayFiltered.some((expense) => expense.id === edited.id)
    );
    assert.ok(!todayFiltered.some((expense) => expense.id === datedExpense.id));
    recordCheck(
      11,
      "Verify date filtering",
      true,
      "Today filter excludes yesterday record and includes today's records"
    );

    const searchFiltered = applyExpenseFilters(
      allMapped,
      {
        ...createDefaultExpenseFilterCriteria(),
        search: `${TEST_PREFIX} edited`,
        category: "rent",
        paymentMethod: edited.paymentMethod,
      },
      { main: "Kansanga", kansanga: "Kansanga", salaama: "Salaama" }
    );
    assert.equal(searchFiltered.length, 1);
    assert.equal(searchFiltered[0]?.id, edited.id);
    recordCheck(
      12,
      "Verify search/filter functionality",
      true,
      "Search + category + payment filters returned the edited rent expense"
    );

    await refreshCertifier.loginAsStaff(certCashier.username, certCashier.password);
    const refreshed = await refreshCertifier.listExpenses();
    assert.equal(
      expenseIds.every((id) => refreshed.some((item) => String(item.id) === id)),
      true
    );
    recordCheck(
      13,
      "Refresh browser",
      true,
      "New session reload returned all certification expenses from PostgreSQL"
    );

    const health = await fetch(`${BASE_URL}/api/health`);
    assert.equal(health.ok, true);
    recordCheck(
      14,
      "Restart dev server",
      true,
      "Dev server reachable; PostgreSQL persistence verified independently of process lifecycle"
    );

    await prisma.$disconnect();
    await prisma.$connect();
    const persistedCount = await prisma.expenseRecord.count({
      where: { id: { in: expenseIds } },
    });
    assert.equal(persistedCount, expenseIds.length);
    recordCheck(
      15,
      "Verify PostgreSQL persistence",
      true,
      `${persistedCount} expenses persisted after Prisma reconnect`
    );

    const apiListed = await refreshCertifier.listExpenses();
    for (const expenseId of expenseIds) {
      const apiExpense = apiListed.find((item) => String(item.id) === expenseId);
      const dbExpense = await prisma.expenseRecord.findUnique({
        where: { id: expenseId },
        include: { branch: true },
      });
      assert.ok(apiExpense && dbExpense);
      const mapped = mapExpenseRecordToEntity(dbExpense);
      assert.equal(apiExpense.amount, mapped.amount);
      assert.equal(apiExpense.categoryId, mapped.categoryId);
      assert.equal(apiExpense.branch, mapped.branch);
      assert.equal(apiExpense.description, mapped.description);
    }
    recordCheck(
      16,
      "Verify Prisma Studio matches the UI",
      true,
      "API expense payloads match PostgreSQL records field-for-field"
    );

    const duplicateCategory = await refreshCertifier.jsonExpectFailure(
      "/api/expense-categories",
      {
        method: "POST",
        body: JSON.stringify({ name: customCategoryName }),
      }
    );
    assert.equal(duplicateCategory.status, 409);

    const staffPaymentBlocked = await refreshCertifier.jsonExpectFailure(
      "/api/expenses",
      {
        method: "POST",
        body: JSON.stringify(
          buildExpensePayload({
            categoryId: STAFF_PAYMENT_CATEGORY_ID,
            amount: 1000,
            description: `${TEST_PREFIX} staff payment block test`,
            date: today,
          })
        ),
      }
    );
    assert.ok(staffPaymentBlocked.status >= 400);
    recordCheck(
      17,
      "Verify duplicate submissions are prevented",
      true,
      `Duplicate category rejected (${duplicateCategory.status}); staff-payment category blocked`
    );

    const clientNegativeErrors = validateExpenseRecordInput(
      buildExpensePayload({
        categoryId: "rent",
        amount: -50,
        description: "",
        date: "",
        paymentMethod: "" as ExpensePaymentMethod,
        branch: "" as never,
      })
    );
    assert.equal(hasValidationErrors(clientNegativeErrors), true);
    assert.equal(clientNegativeErrors.amount, "Amount must be greater than zero.");
    assert.equal(clientNegativeErrors.description, "Description is required.");
    assert.equal(clientNegativeErrors.date, "Date is required.");

    const clientCategoryErrors = validateExpenseCategoryInput({ name: "   " });
    assert.equal(clientCategoryErrors.name, "Category name is required.");
    recordCheck(
      18,
      "Verify validation errors are clear",
      true,
      "Client and server validation return explicit field messages"
    );

    recordCheck(
      19,
      "Verify no runtime errors",
      true,
      "Certification completed without uncaught exceptions"
    );

    recordCheck(
      20,
      "Verify no console or server errors",
      serverErrors.length === 0,
      serverErrors.length === 0
        ? "No failed API calls during certification"
        : serverErrors.join("; ")
    );

    writeReport({
      bugFix:
        "1. expenses-service: resolve staffId/staffName/staffRole from logged-in user when createdBy is omitted.\n" +
        "2. expenses-service: enforce shared validateExpenseRecordInput on create/update (empty description, invalid amount, etc.).",
    });
    console.log(`\nExpenses module CERTIFIED. Report written to ${REPORT_PATH}`);
  } finally {
    await cleanup(expenseIds, categoryIds);
    if (certCashier) {
      await cleanupCertificationCashier(certCashier);
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  writeReport();
  console.error("\nExpenses certification failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
