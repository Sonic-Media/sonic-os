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
const TEST_PREFIX = `v312-wipe-${Date.now()}`;
const DATE = "2099-03-21";
const OTHER_DATE = "2099-03-22";

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
      throw new Error(payload.error?.message ?? `Request failed ${response.status}`);
    }
    return payload.data as T;
  }
  async jsonExpectFailure(apiPath: string, options: RequestInit = {}) {
    const response = await this.request(apiPath, options);
    const payload = (await response.json()) as { error?: { message?: string; code?: string } };
    return { status: response.status, code: payload.error?.code, message: payload.error?.message ?? "" };
  }
}

async function cleanup(branchCode: string, date: string) {
  const branch = await prisma.branch.findFirst({ where: { code: branchCode } });
  if (!branch) return;
  await prisma.staffPayment.deleteMany({ where: { branchId: branch.id, date } }).catch(() => undefined);
  await prisma.expenseRecord.deleteMany({ where: { branchId: branch.id, date } }).catch(() => undefined);
  await prisma.dailyOperation.deleteMany({ where: { branchId: branch.id, date } }).catch(() => undefined);
  await prisma.dayClosing.deleteMany({ where: { branchId: branch.id, date } }).catch(() => undefined);
}

async function seedClosedDay(staff: Client, owner: Client, branch: string, date: string, amount: number) {
  await staff.json("/api/day-closings", {
    method: "POST",
    body: JSON.stringify({ action: "open", branch, date }),
  });
  await staff.json("/api/expenses", {
    method: "POST",
    body: JSON.stringify({
      date,
      categoryId: "transport",
      description: "Transport",
      amount,
      paymentMethod: "cash",
      branch,
    }),
  });
  await submitAndApproveClose(staff, owner, branch, date, {
    ...EMPTY_CLOSE_PAYLOAD,
    summary: { ...EMPTY_CLOSE_PAYLOAD.summary, expenses: amount },
    metrics: { ...EMPTY_CLOSE_PAYLOAD.metrics, todayOperatingExpenses: amount },
  });
}

async function main() {
  console.log("Verifying owner single-day wipe (synthetic dates only)...\n");
  const owner = new Client();
  const staff = new Client();
  let cashier: Awaited<ReturnType<typeof createCertificationCashier>> | null = null;
  let salaamaCashier: Awaited<ReturnType<typeof createCertificationCashier>> | null = null;

  try {
    await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);
    cashier = await createCertificationCashier(owner, TEST_PREFIX, "main");
    await loginWithCredentials(staff, {
      username: cashier.username,
      password: cashier.password,
    });

    await seedClosedDay(staff, owner, "main", DATE, 20000);
    await seedClosedDay(staff, owner, "main", OTHER_DATE, 8000);

    const salaama = new Client();
    salaamaCashier = await createCertificationCashier(owner, `${TEST_PREFIX}-s`, "salaama");
    await loginWithCredentials(salaama, {
      username: salaamaCashier.username,
      password: salaamaCashier.password,
    });
    await seedClosedDay(salaama, owner, "salaama", DATE, 3000);

    const staffDenied = await staff.jsonExpectFailure("/api/admin/business-day-wipe", {
      method: "POST",
      body: JSON.stringify({ branch: "main", date: DATE, confirmation: `WIPE ${DATE}` }),
    });
    recordCheck("A", "Non-owner cannot wipe", staffDenied.status === 403, String(staffDenied.status));

    const badConfirm = await owner.jsonExpectFailure("/api/admin/business-day-wipe", {
      method: "POST",
      body: JSON.stringify({ branch: "main", date: DATE, confirmation: "WIPE DAY" }),
    });
    recordCheck("B", "Wipe requires typed date confirmation", badConfirm.status === 400, String(badConfirm.status));

    const wiped = await owner.json<{ correctionId: string; date: string; wiped: { expenseRecords: number } }>(
      "/api/admin/business-day-wipe",
      {
        method: "POST",
        body: JSON.stringify({ branch: "main", date: DATE, confirmation: `WIPE ${DATE}` }),
      }
    );
    recordCheck("C", "Owner can wipe one selected day", wiped.date === DATE, wiped.date);

    const mainDateGone = await prisma.dayClosing.findFirst({
      where: { date: DATE, branch: { code: "main" } },
    });
    const mainExpenses = await prisma.expenseRecord.count({
      where: { date: DATE, branch: { code: "main" } },
    });
    recordCheck(
      "D",
      "Staff page reset: day and operational expenses are gone",
      !mainDateGone && mainExpenses === 0,
      `closing=${mainDateGone?.status ?? "none"} expenses=${mainExpenses}`
    );

    const otherDate = await prisma.dayClosing.findFirst({
      where: { date: OTHER_DATE, branch: { code: "main" } },
    });
    const otherExpenses = await prisma.expenseRecord.count({
      where: { date: OTHER_DATE, branch: { code: "main" } },
    });
    recordCheck(
      "E",
      "Other dates remain untouched",
      otherDate?.status === "closed" && otherExpenses === 1,
      `${otherDate?.status} expenses=${otherExpenses}`
    );

    const salaamaDay = await prisma.dayClosing.findFirst({
      where: { date: DATE, branch: { code: "salaama" } },
    });
    recordCheck(
      "F",
      "Other branches remain untouched",
      salaamaDay?.status === "closed",
      salaamaDay?.status
    );

    const audit = await prisma.financialCorrection.findFirst({
      where: { id: wiped.correctionId },
    });
    recordCheck(
      "G",
      "Wipe is audited",
      audit?.kind === "business_day_wipe" && audit.businessDate === DATE,
      audit?.kind
    );

    await staff.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({ action: "open", branch: "main", date: DATE }),
    });
    const reopened = await prisma.dayClosing.findMany({
      where: { date: DATE, branch: { code: "main" } },
    });
    recordCheck(
      "H",
      "Date can be entered again without a duplicate leftover day",
      reopened.length === 1 && reopened[0]?.status === "open",
      `${reopened.length} ${reopened[0]?.status}`
    );
  } finally {
    if (cashier) {
      await cleanupCertificationCashier(cashier, { branch: "main", date: DATE });
    }
    if (salaamaCashier) {
      await cleanupCertificationCashier(salaamaCashier, { branch: "salaama", date: DATE });
    }
    await cleanup("main", DATE);
    await cleanup("main", OTHER_DATE);
    await cleanup("salaama", DATE);
  }

  console.log("\nSingle-day wipe verification complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
