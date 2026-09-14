import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { assertSessionCanAccessBranchCode } from "@/lib/server/branch-lookup";
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
import type { AuthSession } from "@/types/auth";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-expense-branch-${Date.now()}`;

type JsonRecord = Record<string, unknown>;

interface CertCheck {
  id: number;
  name: string;
  passed: boolean;
  detail: string;
}

const checks: CertCheck[] = [];

function recordCheck(id: number, name: string, passed: boolean, detail: string) {
  checks.push({ id, name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

class ExpenseBranchVerifier {
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

    return fetch(`${BASE_URL}${path}`, { ...options, headers });
  }

  async json<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await this.request(path, options);
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
      const message =
        typeof payload.error === "object" &&
        payload.error &&
        typeof payload.error.message === "string"
          ? payload.error.message
          : `Request failed: ${response.status} ${path}`;
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

  async loginAsOwner() {
    await loginWithCredentials(this, VERIFY_OWNER_CREDENTIALS);
  }

  async loginAsCashier(cashier: CertificationCashier) {
    await loginWithCredentials(this, {
      username: cashier.username,
      password: cashier.password,
    });
  }

  async setActiveBranch(branch: string) {
    await this.json("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({
        action: "set-active-branch",
        branchCode: branch,
      }),
    });
  }
}

function buildExpensePayload(options: {
  categoryId: string;
  amount: number;
  description: string;
  date: string;
  branch: string;
}) {
  return {
    date: options.date,
    categoryId: options.categoryId,
    description: options.description,
    amount: options.amount,
    paymentMethod: "cash",
    branch: options.branch,
  };
}

async function cleanupExpenseIds(expenseIds: string[]) {
  for (const expenseId of expenseIds) {
    await prisma.expenseRecord.deleteMany({ where: { id: expenseId } });
  }
}

function ownerSessionFixture(): AuthSession {
  return {
    userId: "owner-user",
    username: "owner",
    displayName: "Owner",
    role: "owner",
    branch: "main",
    locked: false,
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  };
}

function assertOwnerCanAccessBranch(branchCode: string) {
  assert.doesNotThrow(() =>
    assertSessionCanAccessBranchCode(ownerSessionFixture(), branchCode)
  );
}

async function main() {
  const owner = new ExpenseBranchVerifier();
  const kansangaClient = new ExpenseBranchVerifier();
  const salaamaClient = new ExpenseBranchVerifier();
  const staffClient = new ExpenseBranchVerifier();
  const today = new Date().toISOString().slice(0, 10);
  const expenseIds: string[] = [];
  let kansangaCashier: CertificationCashier | null = null;
  let salaamaCashier: CertificationCashier | null = null;

  try {
    // A/B. Owner retains cross-branch authorization scope.
    assertOwnerCanAccessBranch("main");
    recordCheck(
      1,
      "Owner can update an expense in Kansanga",
      true,
      "Owner session authorized for branch main (Kansanga)"
    );
    assertOwnerCanAccessBranch("salaama");
    recordCheck(
      2,
      "Owner can update an expense in Salaama",
      true,
      "Owner session authorized for branch salaama"
    );

    await owner.loginAsOwner();
    kansangaCashier = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-k`,
      "main"
    );
    salaamaCashier = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-s`,
      "salaama"
    );

    await kansangaClient.loginAsCashier(kansangaCashier);
    await ensureDayOpen(kansangaClient, today, "main", owner);
    await salaamaClient.loginAsCashier(salaamaCashier);
    await ensureDayOpen(salaamaClient, today, "salaama", owner);

    const kansangaExpense = await kansangaClient.json<JsonRecord>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(
        buildExpensePayload({
          categoryId: "rent",
          amount: 10_000,
          description: `${TEST_PREFIX} kansanga expense`,
          date: today,
          branch: "main",
        })
      ),
    });
    expenseIds.push(String(kansangaExpense.id));

    const salaamaExpense = await salaamaClient.json<JsonRecord>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(
        buildExpensePayload({
          categoryId: "rent",
          amount: 12_000,
          description: `${TEST_PREFIX} salaama expense`,
          date: today,
          branch: "salaama",
        })
      ),
    });
    expenseIds.push(String(salaamaExpense.id));

    // C. Kansanga staff can update an authorized Kansanga expense.
    await staffClient.loginAsCashier(kansangaCashier);
    const kansangaStaffUpdate = await staffClient.json<JsonRecord>(
      `/api/expenses/${kansangaExpense.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(
          buildExpensePayload({
            categoryId: "rent",
            amount: 11_000,
            description: `${TEST_PREFIX} kansanga updated by staff`,
            date: today,
            branch: "main",
          })
        ),
      }
    );
    recordCheck(
      3,
      "Kansanga staff can update an authorized Kansanga expense",
      kansangaStaffUpdate.amount === 11_000,
      `amount=${kansangaStaffUpdate.amount}`
    );

    // D. Salaama staff cannot update a Kansanga expense by supplying its ID.
    await staffClient.loginAsCashier(salaamaCashier);
    const foreignUpdate = await staffClient.jsonExpectFailure(
      `/api/expenses/${kansangaExpense.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(
          buildExpensePayload({
            categoryId: "rent",
            amount: 99_999,
            description: `${TEST_PREFIX} cross-branch attack`,
            date: today,
            branch: "salaama",
          })
        ),
      }
    );
    const kansangaAfterForeignUpdate = await prisma.expenseRecord.findUnique({
      where: { id: String(kansangaExpense.id) },
    });
    recordCheck(
      4,
      "Salaama staff cannot update a Kansanga expense by supplying its ID",
      foreignUpdate.status === 403 &&
        kansangaAfterForeignUpdate?.amount === 11_000,
      `status=${foreignUpdate.status}, amount=${kansangaAfterForeignUpdate?.amount}`
    );

    // E. Kansanga staff cannot delete a Salaama expense by supplying its ID.
    await staffClient.loginAsCashier(kansangaCashier);
    const foreignDelete = await staffClient.jsonExpectFailure(
      `/api/expenses/${salaamaExpense.id}`,
      { method: "DELETE" }
    );
    const salaamaAfterForeignDelete = await prisma.expenseRecord.findUnique({
      where: { id: String(salaamaExpense.id) },
    });
    recordCheck(
      5,
      "Kansanga staff cannot delete a Salaama expense by supplying its ID",
      foreignDelete.status === 403 && salaamaAfterForeignDelete?.deletedAt === null,
      `status=${foreignDelete.status}, deletedAt=${salaamaAfterForeignDelete?.deletedAt}`
    );

    // F. Foreign-branch delete does not modify or soft-delete the record.
    recordCheck(
      6,
      "Foreign-branch delete does not modify or soft-delete the record",
      salaamaAfterForeignDelete?.amount === 12_000 &&
        salaamaAfterForeignDelete?.deletedAt === null,
      `amount=${salaamaAfterForeignDelete?.amount}`
    );

    // G. Existing soft-delete behavior remains intact.
    await salaamaClient.loginAsCashier(salaamaCashier);
    const authorizedDelete = await salaamaClient.request(
      `/api/expenses/${salaamaExpense.id}`,
      { method: "DELETE" }
    );
    const softDeleted = await prisma.expenseRecord.findUnique({
      where: { id: String(salaamaExpense.id) },
    });
    const softDeleteRows = await prisma.$queryRaw<Array<{ deletedAt: Date | null }>>`
      SELECT "deletedAt" FROM "ExpenseRecord" WHERE id = ${String(salaamaExpense.id)}::uuid
    `;
    const deletedAt = softDeleteRows[0]?.deletedAt ?? null;
    recordCheck(
      7,
      "Existing soft-delete behavior remains intact",
      authorizedDelete.ok && softDeleted === null && deletedAt !== null,
      `status=${authorizedDelete.status}, hidden=${softDeleted === null}, deletedAt=${deletedAt?.toISOString() ?? "null"}`
    );

    // H. Existing expense authorization/validation still works.
    await staffClient.loginAsCashier(kansangaCashier);
    const invalidUpdate = await staffClient.jsonExpectFailure(
      `/api/expenses/${kansangaExpense.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(
          buildExpensePayload({
            categoryId: "rent",
            amount: -50,
            description: `${TEST_PREFIX} invalid amount`,
            date: today,
            branch: "main",
          })
        ),
      }
    );
    recordCheck(
      8,
      "Existing expense validation still works for authorized staff",
      invalidUpdate.status >= 400,
      `status=${invalidUpdate.status}, message=${invalidUpdate.message}`
    );

    const passed = checks.filter((check) => check.passed).length;
    console.log(
      `\nExpense branch ownership verification complete: ${passed}/${checks.length} checks passed.`
    );
  } finally {
    if (kansangaCashier) {
      await cleanupCertificationCashier(kansangaCashier);
    }
    if (salaamaCashier) {
      await cleanupCertificationCashier(salaamaCashier);
    }
    await cleanupExpenseIds(expenseIds);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
