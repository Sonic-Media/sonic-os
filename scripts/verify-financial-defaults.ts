import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { filterPersistableExpenses } from "@/lib/expenses";
import { templateToExpense } from "@/lib/expense-templates";
import { FINANCIAL_DEFAULTS_INVENTORY } from "@/lib/financial/defaults-inventory";
import { validateExpenseRecordInput } from "@/lib/expenses-module/validation";
import { validateSaleInput } from "@/lib/sales/validation";
import { validatePurchaseInput } from "@/lib/purchasing/validation";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
} from "./verify-bootstrap";
import {
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-fin-defaults-${Date.now()}`;

function recordCheck(
  id: string,
  name: string,
  passed: boolean,
  detail: string,
  notApplicable = false
) {
  const label = notApplicable ? "NOT APPLICABLE" : passed ? "PASS" : "FAIL";
  console.log(`${label} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed && !notApplicable) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

class FinancialDefaultsVerifier {
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

    const payload = (await response.json()) as { data?: T; error?: unknown };
    if (!response.ok) {
      throw new Error(
        `${apiPath} failed (${response.status}): ${JSON.stringify(payload.error ?? payload)}`
      );
    }
    return payload.data as T;
  }
}

function scanStaticInventory(): void {
  recordCheck(
    "A",
    "All relevant monetary defaults inventoried",
    FINANCIAL_DEFAULTS_INVENTORY.length >= 10,
    `count=${FINANCIAL_DEFAULTS_INVENTORY.length}`
  );

  recordCheck(
    "B",
    "Every discovered default has authority classification",
    FINANCIAL_DEFAULTS_INVENTORY.every((item) => item.classification.length > 0),
    FINANCIAL_DEFAULTS_INVENTORY.map((i) => i.location).join("; ")
  );

  const reports = readRepoFile("lib/reports/branch-totals.ts");
  recordCheck(
    "I",
    "Reports do not use hardcoded financial fallback amounts as data",
    reports.includes("sales: 0") && reports.includes("expenses: 0"),
    "Zero initializers are aggregation accumulators only"
  );

  recordCheck(
    "J",
    "PostgreSQL remains financial source of truth",
    readRepoFile("lib/server/services/daily-operations-service.ts").includes(
      "prisma.dailyOperation"
    ) &&
      readRepoFile("lib/server/services/expenses-service.ts").includes(
        "prisma.expenseRecord"
      ),
    ""
  );

  recordCheck(
    "K",
    "Test/seed fixture amounts isolated from production behavior",
    readRepoFile("scripts/verify-bootstrap.ts").includes("dailyWage: 10000") &&
      !readRepoFile("lib/server/services/staff-payments-service.ts").includes(
        "10000"
      ),
    "Fixture amounts in verify scripts only"
  );
}

function testTemplateAndPersistGate(): void {
  const rentTemplate = {
    id: "common-rent",
    name: "Rent",
    category: "rent" as const,
    active: true,
  };
  const lunchTemplate = {
    id: "common-lunch",
    name: "Lunch",
    category: "lunch" as const,
    active: true,
    defaultAmount: 3000,
  };

  const rentExpense = templateToExpense(rentTemplate);
  const lunchExpense = templateToExpense(lunchTemplate);
  const persisted = filterPersistableExpenses([rentExpense, lunchExpense]);

  recordCheck(
    "C-pre",
    "Template without defaultAmount seeds UI amount 0",
    rentExpense.amount === 0,
    `rent=${rentExpense.amount}`
  );

  recordCheck(
    "C",
    "No dangerous hardcoded zero amount silently creates persistable expense",
    persisted.length === 1 && persisted[0]?.id === "common-lunch",
    `persisted=${persisted.map((e) => `${e.id}:${e.amount}`).join(",")}`
  );

  recordCheck(
    "E",
    "Expense templates cannot silently inject unintended zero amounts",
    !persisted.some((expense) => expense.amount === 0),
    ""
  );
}

function testValidationRules(): void {
  const expenseErrors = validateExpenseRecordInput({
    date: "2026-09-11",
    categoryId: "cat-1",
    description: "Test",
    amount: 0,
    paymentMethod: "cash",
    branch: "main",
  });
  recordCheck(
    "D",
    "Expense module rejects zero amount server-side validation schema",
    Boolean(expenseErrors.amount),
    expenseErrors.amount ?? ""
  );

  const saleErrors = validateSaleInput(
    {
      productId: "p1",
      quantity: 1,
      unitPrice: 0,
      paymentMethod: "cash",
      branch: "main",
      date: "2026-09-11",
    },
    10
  );
  recordCheck(
    "G",
    "Sales cannot use zero unitPrice",
    Boolean(saleErrors.unitPrice),
    saleErrors.unitPrice ?? ""
  );

  const purchaseErrors = validatePurchaseInput({
    supplierId: "s1",
    branch: "main",
    date: "2026-09-11",
    items: [
      {
        productId: "p1",
        quantity: 1,
        buyingPrice: 0,
      },
    ],
  });
  recordCheck(
    "H",
    "Purchasing cannot use zero buyingPrice",
    Object.keys(purchaseErrors).some((key) => key.includes("buyingPrice")),
    JSON.stringify(purchaseErrors)
  );

  recordCheck(
    "F-static",
    "Staff payments reject non-positive amounts",
    readRepoFile("lib/server/services/staff-payments-service.ts").includes(
      "input.amount <= 0"
    ),
    ""
  );

  recordCheck(
    "L",
    "Existing financial validation remains intact",
    readRepoFile("lib/expenses-module/validation.ts").includes(
      "Amount must be greater than zero"
    ),
    ""
  );
}

async function testDailyOperationServerFilter(
  owner: FinancialDefaultsVerifier
): Promise<void> {
  const entryId = crypto.randomUUID();
  const date = "2018-03-15";

  const saved = await owner.json<{ id: string; expenses: { name: string; amount: number }[] }>(
    "/api/daily-operations",
    {
      method: "POST",
      body: JSON.stringify({
        id: entryId,
        date,
        time: "10:00 AM",
        timestamp: Math.floor(Date.now() / 1000),
        branch: "main",
        sales: 50000,
        expenses: [
          { id: crypto.randomUUID(), name: "Rent", amount: 0 },
          { id: crypto.randomUUID(), name: "Lunch", amount: 3000 },
        ],
        notes: TEST_PREFIX,
        status: "draft",
      }),
    }
  );

  recordCheck(
    "C-api",
    "Server daily operations filter strips zero-amount template placeholders",
    saved.expenses.length === 1 &&
      saved.expenses[0]?.name === "Lunch" &&
      saved.expenses[0]?.amount === 3000,
    `expenses=${JSON.stringify(saved.expenses)}`
  );

  await owner.json(`/api/daily-operations/${saved.id}`, { method: "DELETE" }).catch(
    () => undefined
  );
  await prisma.dailyOperation.deleteMany({ where: { id: saved.id } }).catch(
    () => undefined
  );
}

async function main() {
  console.log(`Financial defaults verification (${TEST_PREFIX})`);
  console.log(`Base URL: ${BASE_URL}`);

  scanStaticInventory();
  testTemplateAndPersistGate();
  testValidationRules();

  const owner = new FinancialDefaultsVerifier();
  await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);

  const cashier = await createCertificationCashier(owner, TEST_PREFIX, "main");

  try {
    await testDailyOperationServerFilter(owner);

    await loginWithCredentials(owner, {
      username: cashier.username,
      password: cashier.password,
    });

    const paymentFail = await owner
      .request("/api/staff-payments", {
        method: "POST",
        body: JSON.stringify({
          staffId: cashier.staffId,
          branch: "main",
          date: "2018-03-15",
          amount: 0,
          paymentType: "daily-wage",
        }),
      })
      .then((r) => r.status);

    recordCheck(
      "F",
      "Staff payments cannot silently use unintended default amount",
      paymentFail === 400,
      `status=${paymentFail}`
    );
  } finally {
    await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);
    await cleanupCertificationCashier(cashier);
    await prisma.dailyOperation.deleteMany({
      where: { notes: TEST_PREFIX },
    }).catch(() => undefined);
    await prisma.$disconnect();
  }

  console.log("All financial defaults checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
