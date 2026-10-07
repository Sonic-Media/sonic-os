#!/usr/bin/env tsx
import "dotenv/config";
import { prisma } from "@/lib/db";
import { EMPTY_CLOSE_PAYLOAD, submitAndApproveClose } from "./verify-close-request-helpers";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
} from "./verify-bootstrap";
import { loginWithCredentials, VERIFY_OWNER_CREDENTIALS } from "./verify-session";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `v312-expense-${Date.now()}`;
const DATE = "2099-03-01";
const OTHER_DATE = "2099-03-02";

function recordCheck(id: string, name: string, passed: boolean, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

class Client {
  cookieHeader = "";

  private async request(apiPath: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (this.cookieHeader) headers.set("Cookie", this.cookieHeader);
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
    const payload = (await response.json()) as {
      data?: T;
      error?: { message?: string; code?: string };
    };
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `Request failed ${response.status} ${apiPath}`);
    }
    return payload.data as T;
  }

  async jsonExpectFailure(apiPath: string, options: RequestInit = {}) {
    const response = await this.request(apiPath, options);
    const payload = (await response.json()) as { error?: { message?: string; code?: string } };
    return {
      status: response.status,
      code: payload.error?.code,
      message: payload.error?.message ?? "",
    };
  }
}

async function cleanup(date: string, branchCode: string) {
  const branch = await prisma.branch.findFirst({ where: { code: branchCode } });
  if (!branch) return;
  await prisma.staffPayment.deleteMany({ where: { branchId: branch.id, date } }).catch(() => undefined);
  await prisma.expenseRecord.deleteMany({ where: { branchId: branch.id, date } }).catch(() => undefined);
  await prisma.dailyOperation.deleteMany({ where: { branchId: branch.id, date } }).catch(() => undefined);
  await prisma.dayClosing.deleteMany({ where: { branchId: branch.id, date } }).catch(() => undefined);
  await prisma.financialCorrection.deleteMany({ where: { businessDate: date, branchCode } }).catch(() => undefined);
}

async function main() {
  console.log("Verifying closed-day expenditure correction...\n");
  const owner = new Client();
  const staff = new Client();
  let cashier: Awaited<ReturnType<typeof createCertificationCashier>> | null = null;

  try {
    await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);
    cashier = await createCertificationCashier(owner, TEST_PREFIX, "main");
    await loginWithCredentials(staff, {
      username: cashier.username,
      password: cashier.password,
    });

    await staff.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({ action: "open", branch: "main", date: DATE }),
    });

    const expense = await staff.json<{ id: string; amount: number }>(
      "/api/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          date: DATE,
          categoryId: "transport",
          description: "Transport",
          amount: 20000,
          paymentMethod: "cash",
          branch: "main",
        }),
      }
    );
    recordCheck("A", "Staff recorded expenditure while day open", expense.amount === 20000, String(expense.amount));

    await submitAndApproveClose(staff, owner, "main", DATE, {
      ...EMPTY_CLOSE_PAYLOAD,
      summary: { ...EMPTY_CLOSE_PAYLOAD.summary, expenses: 20000 },
      metrics: { ...EMPTY_CLOSE_PAYLOAD.metrics, todayOperatingExpenses: 20000 },
    });

    const closed = await prisma.dayClosing.findFirst({
      where: { date: DATE, branch: { code: "main" } },
    });
    recordCheck("B", "Business day is closed", closed?.status === "closed", closed?.status);

    const staffBlocked = await staff.jsonExpectFailure(`/api/expenses/${expense.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        date: DATE,
        categoryId: "transport",
        description: "Transport",
        amount: 12000,
        paymentMethod: "cash",
        branch: "main",
      }),
    });
    recordCheck(
      "C",
      "Non-owner cannot edit closed-day expenditure",
      staffBlocked.status === 403 || staffBlocked.status === 409,
      `${staffBlocked.status} ${staffBlocked.code}`
    );

    const missingReason = await owner.jsonExpectFailure("/api/admin/financial-corrections", {
      method: "POST",
      body: JSON.stringify({
        sourceType: "expense_record",
        sourceId: expense.id,
        amount: 12000,
      }),
    });
    recordCheck(
      "D",
      "Correction requires a reason",
      missingReason.status === 400,
      String(missingReason.status)
    );

    const openedAt = closed?.openedAt?.toISOString() ?? null;
    const closedAt = closed?.closedAt?.toISOString() ?? null;

    const corrected = await owner.json<{
      amount: number;
      dayStatus: string;
      openedAt: string | null;
      closedAt: string | null;
      correction: { originalAmount: number; newAmount: number; reason: string };
    }>("/api/admin/financial-corrections", {
      method: "POST",
      body: JSON.stringify({
        sourceType: "expense_record",
        sourceId: expense.id,
        amount: 12000,
        reason: "Please correct transport expenditure from UGX 20,000 to UGX 12,000.",
      }),
    });

    recordCheck("E", "Owner can correct closed-day expenditure", corrected.amount === 12000, String(corrected.amount));
    recordCheck(
      "F",
      "Original value remains auditable",
      corrected.correction.originalAmount === 20000 &&
        corrected.correction.newAmount === 12000,
      `${corrected.correction.originalAmount} → ${corrected.correction.newAmount}`
    );
    recordCheck(
      "G",
      "Business day remains closed with timestamps unchanged",
      corrected.dayStatus === "closed" &&
        corrected.openedAt === openedAt &&
        corrected.closedAt === closedAt,
      corrected.dayStatus
    );

    const live = await prisma.expenseRecord.findUnique({ where: { id: expense.id } });
    recordCheck("H", "Corrected value is stored on the live record", live?.amount === 12000, String(live?.amount));

    const detail = await owner.json<{ totals: { totalExpenditure: number } }>(
      `/api/admin/financial-detail?branch=main&date=${DATE}`
    );
    recordCheck(
      "I",
      "Corrected value affects financial totals",
      detail.totals.totalExpenditure === 12000,
      String(detail.totals.totalExpenditure)
    );

    const salaamaClient = new Client();
    const salaamaCashier = await createCertificationCashier(owner, `${TEST_PREFIX}-s`, "salaama");
    await loginWithCredentials(salaamaClient, {
      username: salaamaCashier.username,
      password: salaamaCashier.password,
    });
    await salaamaClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({ action: "open", branch: "salaama", date: DATE }),
    });
    const salaamaExpense = await salaamaClient.json<{ id: string; amount: number }>(
      "/api/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          date: DATE,
          categoryId: "transport",
          description: "Transport",
          amount: 5000,
          paymentMethod: "cash",
          branch: "salaama",
        }),
      }
    );
    const salaamaAfter = await prisma.expenseRecord.findUnique({
      where: { id: salaamaExpense.id },
    });
    recordCheck(
      "J",
      "Branch isolation remains intact",
      salaamaAfter?.amount === 5000,
      String(salaamaAfter?.amount)
    );

    await cleanupCertificationCashier(salaamaCashier, { branch: "salaama", date: DATE });
    await cleanup(DATE, "salaama");
  } finally {
    if (cashier) {
      await cleanupCertificationCashier(cashier, { branch: "main", date: DATE });
    }
    await cleanup(DATE, "main");
    await cleanup(OTHER_DATE, "main");
  }

  console.log("\nClosed-day expenditure correction verification complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
