import "dotenv/config";
import assert from "node:assert/strict";
import { loadEnvFiles } from "../lib/env/load-env";
import { prisma } from "../lib/db";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";
import {
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";

loadEnvFiles();

if (/neon/i.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("Refusing to run attendance verification against Neon.");
}

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TODAY = new Date().toISOString().slice(0, 10);
const TEST_PREFIX = `cert-attendance-${Date.now()}`;
const BRANCH = "main";

type JsonClient = {
  json: <T>(path: string, options?: RequestInit) => Promise<T>;
};

class AttendanceVerifier implements JsonClient {
  private cookieHeader = "";

  async json<T>(path: string, options: RequestInit = {}): Promise<T> {
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

    const payload = (await response.json()) as { data?: T; error?: unknown };
    if (!response.ok) {
      throw new Error(
        `${path} failed (${response.status}): ${JSON.stringify(payload.error ?? payload)}`
      );
    }

    return payload.data as T;
  }

  async expectFailure(
    label: string,
    fn: () => Promise<unknown>,
    expectedStatus?: number
  ): Promise<void> {
    try {
      await fn();
      throw new Error(`${label}: expected failure but request succeeded`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (expectedStatus && !message.includes(`(${expectedStatus})`)) {
        throw new Error(
          `${label}: expected status ${expectedStatus}, got: ${message}`
        );
      }
    }
  }
}

async function deleteTestDayClosing(branch: string, date: string) {
  const branchRow = await prisma.branch.findFirst({
    where: { code: branch },
    select: { id: true },
  });
  if (!branchRow) return;

  await prisma.dayClosing.deleteMany({
    where: { branchId: branchRow.id, date },
  });
}

async function main() {
  const owner = new AttendanceVerifier();
  let cashier: CertificationCashier | null = null;
  let manager: CertificationCashier | null = null;

  try {
    await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);
    await deleteTestDayClosing(BRANCH, TODAY);

    cashier = await createCertificationCashier(owner, TEST_PREFIX, BRANCH);
    const cashierClient = new AttendanceVerifier();
    await loginWithCredentials(cashierClient, {
      username: cashier.username,
      password: cashier.password,
    });

    await cashierClient.expectFailure(
      "clock-in blocked when branch not open",
      () =>
        cashierClient.json("/api/staff/attendance", {
          method: "POST",
          body: JSON.stringify({
            action: "clock-in",
            branch: BRANCH,
            date: TODAY,
          }),
        }),
      409
    );

    const openResult = await cashierClient.json<{
      dayClosing: { id: string; status: string; branch: string };
      attendance: { action: string; userId: string };
    }>("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open-with-shift",
        branch: BRANCH,
        date: TODAY,
      }),
    });

    assert.equal(openResult.dayClosing.status, "open");
    assert.equal(openResult.dayClosing.branch, BRANCH);
    assert.equal(openResult.attendance.action, "Start Shift");
    assert.equal(openResult.attendance.userId, cashier.staffId);

    await cashierClient.expectFailure(
      "duplicate start-shift clock-in blocked",
      () =>
        cashierClient.json("/api/staff/attendance", {
          method: "POST",
          body: JSON.stringify({
            action: "clock-in",
            branch: BRANCH,
            date: TODAY,
          }),
        }),
      409
    );

    await cashierClient.expectFailure(
      "close day blocked while staff on shift",
      () =>
        cashierClient.json("/api/day-closings", {
          method: "POST",
          body: JSON.stringify({
            branch: BRANCH,
            date: TODAY,
            metrics: {
              todaySales: 0,
              todayPurchases: 0,
              todayOperatingExpenses: 0,
              todayInventoryInvestment: 0,
              todayStaffPaymentsRecorded: 0,
              cashBeforeClosing: 0,
            },
            staffPayouts: [],
            expectedCash: 0,
            actualCashCounted: 0,
            cashDifference: 0,
            cashStatus: "balanced",
            summary: {
              sales: 0,
              expenses: 0,
              inventoryInvestment: 0,
              staffPayments: 0,
              remainingCash: 0,
              inventoryFund: 0,
              operatingFund: 0,
            },
          }),
        }),
      409
    );

    const clockOut = await cashierClient.json<{ action: string }>(
      "/api/staff/attendance",
      {
        method: "POST",
        body: JSON.stringify({
          action: "clock-out",
          branch: BRANCH,
          date: TODAY,
        }),
      }
    );
    assert.equal(clockOut.action, "Clock Out");

    await cashierClient.expectFailure(
      "clock-out when not on shift blocked",
      () =>
        cashierClient.json("/api/staff/attendance", {
          method: "POST",
          body: JSON.stringify({
            action: "clock-out",
            branch: BRANCH,
            date: TODAY,
          }),
        }),
      400
    );

    await deleteTestDayClosing(BRANCH, TODAY);

    manager = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-mgr`,
      BRANCH,
      "branch-manager"
    );
    const managerClient = new AttendanceVerifier();
    await loginWithCredentials(managerClient, {
      username: manager.username,
      password: manager.password,
    });

    await managerClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: BRANCH,
        date: TODAY,
      }),
    });

    await loginWithCredentials(cashierClient, {
      username: cashier.username,
      password: cashier.password,
    });

    const clockIn = await cashierClient.json<{ action: string }>(
      "/api/staff/attendance",
      {
        method: "POST",
        body: JSON.stringify({
          action: "clock-in",
          branch: BRANCH,
          date: TODAY,
        }),
      }
    );
    assert.equal(clockIn.action, "Clock In");

    const clockOutAfterClockIn = await cashierClient.json<{ action: string }>(
      "/api/staff/attendance",
      {
        method: "POST",
        body: JSON.stringify({
          action: "clock-out",
          branch: BRANCH,
          date: TODAY,
        }),
      }
    );
    assert.equal(clockOutAfterClockIn.action, "Clock Out");

    console.log("PASS attendance server flow verification");
  } finally {
    if (cashier) {
      await cleanupCertificationCashier(cashier, { branch: BRANCH, date: TODAY });
    }
    if (manager) {
      await cleanupCertificationCashier(manager, { branch: BRANCH, date: TODAY });
    }
    await deleteTestDayClosing(BRANCH, TODAY);
    await prisma.auditLogEntry.deleteMany({
      where: {
        userName: { contains: TEST_PREFIX },
      },
    }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("FAIL attendance verification:", error);
  process.exitCode = 1;
});
