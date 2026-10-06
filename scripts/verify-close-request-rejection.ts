#!/usr/bin/env tsx
import "dotenv/config";
import { prisma } from "@/lib/db";
import {
  approveCloseDayApi,
  EMPTY_CLOSE_PAYLOAD,
  submitCloseRequestApi,
} from "./verify-close-request-helpers";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
} from "./verify-bootstrap";
import { loginWithCredentials, VERIFY_OWNER_CREDENTIALS } from "./verify-session";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `v312-reject-${Date.now()}`;
const DATE = "2099-03-11";

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

async function cleanup(branchCode: string) {
  const branch = await prisma.branch.findFirst({ where: { code: branchCode } });
  if (!branch) return;
  await prisma.dailyOperation.deleteMany({ where: { branchId: branch.id, date: DATE } }).catch(() => undefined);
  await prisma.dayClosing.deleteMany({ where: { branchId: branch.id, date: DATE } }).catch(() => undefined);
  await prisma.financialCorrection.deleteMany({ where: { businessDate: DATE, branchCode } }).catch(() => undefined);
}

async function main() {
  console.log("Verifying close-request rejection lifecycle...\n");
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

    const submitted = await submitCloseRequestApi<{ id: string; status: string; date: string }>(
      staff,
      "main",
      DATE
    );
    recordCheck("A", "Staff submitted closing request", submitted.status === "close_requested", submitted.status);

    const missingReason = await owner.jsonExpectFailure("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "reject-close-request",
        branch: "main",
        date: DATE,
        reason: "  ",
      }),
    });
    recordCheck(
      "B",
      "Rejection requires a reason",
      missingReason.status === 400,
      `${missingReason.status}`
    );

    const staffReject = await staff.jsonExpectFailure("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "reject-close-request",
        branch: "main",
        date: DATE,
        reason: "Please correct transport expenditure from UGX 20,000 to UGX 12,000.",
      }),
    });
    recordCheck(
      "C",
      "Non-owner cannot reject",
      staffReject.status === 403,
      `${staffReject.status} ${staffReject.code}`
    );

    const rejected = await owner.json<{ id: string; status: string; date: string; openedAt?: string }>(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "reject-close-request",
          branch: "main",
          date: DATE,
          reason: "Please correct transport expenditure from UGX 20,000 to UGX 12,000.",
        }),
      }
    );
    recordCheck(
      "D",
      "Owner can reject to needs_correction on the same date",
      rejected.status === "needs_correction" && rejected.date === DATE && rejected.id === submitted.id,
      `${rejected.status} ${rejected.date}`
    );

    const countAfterReject = await prisma.dayClosing.count({
      where: { date: DATE, branch: { code: "main" } },
    });
    recordCheck("E", "Rejection does not create a duplicate business day", countAfterReject === 1, String(countAfterReject));

    await staff.json("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        date: DATE,
        categoryId: "transport",
        description: "Transport",
        amount: 12000,
        paymentMethod: "cash",
        branch: "main",
      }),
    });
    recordCheck("F", "Rejected day is editable by the same-branch staff", true);

    const resubmitted = await submitCloseRequestApi<{ id: string; status: string }>(
      staff,
      "main",
      DATE
    );
    recordCheck(
      "G",
      "Staff can resubmit the same business date",
      resubmitted.status === "close_requested" && resubmitted.id === submitted.id,
      resubmitted.status
    );

    const approved = await approveCloseDayApi<{ id: string; status: string }>(owner, "main", DATE);
    recordCheck("H", "Owner can approve after resubmission", approved.status === "closed", approved.status);

    const salaama = new Client();
    const salaamaCashier = await createCertificationCashier(owner, `${TEST_PREFIX}-s`, "salaama");
    await loginWithCredentials(salaama, {
      username: salaamaCashier.username,
      password: salaamaCashier.password,
    });
    await salaama.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({ action: "open", branch: "salaama", date: DATE }),
    });
    const salaamaRow = await prisma.dayClosing.findFirst({
      where: { date: DATE, branch: { code: "salaama" } },
    });
    recordCheck(
      "I",
      "Branch isolation remains intact",
      salaamaRow?.status === "open",
      salaamaRow?.status
    );
    await cleanupCertificationCashier(salaamaCashier, { branch: "salaama", date: DATE });
    await cleanup("salaama");
  } finally {
    if (cashier) {
      await cleanupCertificationCashier(cashier, { branch: "main", date: DATE });
    }
    await cleanup("main");
  }

  console.log("\nClose-request rejection verification complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
