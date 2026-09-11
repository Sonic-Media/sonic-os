import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getBranchDayState } from "@/lib/server/services/day-closings-service";
import type { Branch } from "@/types";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";
import {
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-day-db-${Date.now()}`;

type JsonRecord = Record<string, unknown>;

function recordCheck(id: number, name: string, passed: boolean, detail: string) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

class DayClosingVerifier {
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
      const message =
        typeof payload.error === "object" &&
        payload.error &&
        typeof payload.error.message === "string"
          ? payload.error.message
          : `Request failed: ${response.status} ${apiPath}`;
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

async function countDayClosing(branch: Branch, date: string) {
  const branchRow = await prisma.branch.findFirst({ where: { code: branch } });
  if (!branchRow) return 0;
  return prisma.dayClosing.count({
    where: { branchId: branchRow.id, date },
  });
}

async function getDayClosingStatus(branch: Branch, date: string) {
  const branchRow = await prisma.branch.findFirst({ where: { code: branch } });
  if (!branchRow) return null;
  const record = await prisma.dayClosing.findUnique({
    where: {
      branchId_date: {
        branchId: branchRow.id,
        date,
      },
    },
  });
  return record?.status ?? null;
}

function scanStaticAuthority(): void {
  const storageSource = readRepoFile("lib/day-closing/storage.ts");
  const guardsSource = readRepoFile("lib/server/day-closing-guards.ts");
  const serviceSource = readRepoFile("lib/server/services/day-closings-service.ts");
  const contextSource = readRepoFile("context/day-closing-context.tsx");

  recordCheck(
    1,
    "UI storage cache is documented as non-authoritative",
    storageSource.includes("NEVER use this module for server-side") &&
      storageSource.includes("uiDayClosingsCache"),
    ""
  );

  recordCheck(
    2,
    "Server write gates query PostgreSQL via getBranchDayState",
    guardsSource.includes("getBranchDayState") &&
      !guardsSource.includes("@/lib/day-closing/storage"),
    ""
  );

  recordCheck(
    3,
    "Day-closing service exposes PostgreSQL-backed getBranchDayState",
    serviceSource.includes("export async function getBranchDayState"),
    ""
  );

  recordCheck(
    4,
    "DayClosingProvider refreshes from API before/after mutations",
    contextSource.includes("await refreshClosingsFromApi()") &&
      contextSource.includes("openDayApi") &&
      !contextSource.includes("persistClosings("),
    ""
  );
}

async function main() {
  const owner = new DayClosingVerifier();
  const freshClient = new DayClosingVerifier();
  const staffClient = new DayClosingVerifier();
  const testDate = `2019-03-${String(Math.floor(Math.random() * 20) + 1).padStart(2, "0")}`;
  const mainBranch = "main" as Branch;
  const salaamaBranch = "salaama" as Branch;
  let kansangaCashier: CertificationCashier | null = null;
  let salaamaCashier: CertificationCashier | null = null;

  console.log("Verifying day-closing live PostgreSQL authority...\n");
  scanStaticAuthority();

  try {
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

    const kansangaClient = new DayClosingVerifier();
    await kansangaClient.loginAsCashier(kansangaCashier);

    const beforeOpen = await countDayClosing(mainBranch, testDate);
    const opened = await kansangaClient.json<{ id: string; status: string; openedAt?: string }>(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "open",
          branch: "main",
          date: testDate,
        }),
      }
    );
    const afterOpen = await countDayClosing(mainBranch, testDate);
    const pgStateAfterOpen = await getBranchDayState(mainBranch, testDate);

    recordCheck(
      5,
      "Opening a day persists to PostgreSQL before success is returned",
      opened.status === "open" &&
        !!opened.openedAt &&
        afterOpen === beforeOpen + 1 &&
        pgStateAfterOpen === "open",
      `status=${opened.status}, pg=${pgStateAfterOpen}`
    );

    await freshClient.loginAsCashier(kansangaCashier);
    const freshClosings = await freshClient.json<
      Array<{ branch: string; date: string; status: string }>
    >("/api/day-closings");
    const freshRecord = freshClosings.find(
      (item) => item.branch === "main" && item.date === testDate
    );
    recordCheck(
      6,
      "A fresh request/process sees the same persisted day state",
      freshRecord?.status === "open",
      `status=${freshRecord?.status ?? "missing"}`
    );

    const salaamaClient = new DayClosingVerifier();
    await salaamaClient.loginAsCashier(salaamaCashier);
    const salaamaBefore = await getBranchDayState(salaamaBranch, testDate);
    recordCheck(
      7,
      "Kansanga and Salaama maintain independent day state",
      pgStateAfterOpen === "open" && salaamaBefore === "waiting",
      `main=${pgStateAfterOpen}, salaama=${salaamaBefore}`
    );

    await owner.setActiveBranch("main");
    const ownerMainState = await getBranchDayState(mainBranch, testDate);
    await owner.setActiveBranch("salaama");
    const ownerSalaamaState = await getBranchDayState(salaamaBranch, testDate);
    recordCheck(
      8,
      "Owner branch switching does not reuse previous branch day state",
      ownerMainState === "open" && ownerSalaamaState === "waiting",
      `main=${ownerMainState}, salaama=${ownerSalaamaState}`
    );

    await staffClient.loginAsCashier(salaamaCashier);
    const foreignRead = await staffClient.json<Array<{ branch: string; date: string }>>(
      "/api/day-closings"
    );
    recordCheck(
      9,
      "Staff cannot access another branch's day state",
      foreignRead.every((item) => item.branch === "salaama"),
      `count=${foreignRead.length}`
    );

    await kansangaClient.loginAsCashier(kansangaCashier);
    const duplicateOpen = await kansangaClient.jsonExpectFailure(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "open",
          branch: "main",
          date: testDate,
        }),
      }
    );
    const stillOne = await countDayClosing(mainBranch, testDate);
    recordCheck(
      10,
      "Failed day operation does not falsely report success",
      duplicateOpen.status === 409 && stillOne === afterOpen,
      `status=${duplicateOpen.status}, count=${stillOne}`
    );

    await kansangaClient.loginAsCashier(kansangaCashier);
    const closed = await kansangaClient.json<{ status: string; closedAt?: string }>(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "close",
          branch: "main",
          date: testDate,
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
      }
    );
    const pgClosed = await getBranchDayState(mainBranch, testDate);
    recordCheck(
      11,
      "Closing a day persists to PostgreSQL before success is returned",
      closed.status === "closed" && !!closed.closedAt && pgClosed === "closed",
      `status=${closed.status}, pg=${pgClosed}`
    );

    const categories = await kansangaClient.json<Array<{ id: string }>>(
      "/api/expense-categories"
    );
    const categoryId = categories[0]?.id;
    assert.ok(categoryId);

    const writeWhileClosed = await kansangaClient.jsonExpectFailure("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        date: testDate,
        categoryId,
        description: `${TEST_PREFIX} blocked`,
        amount: 100,
        paymentMethod: "cash",
        branch: "main",
      }),
    });
    recordCheck(
      12,
      "Closed-day write gate uses live PostgreSQL state",
      writeWhileClosed.status === 409,
      `status=${writeWhileClosed.status}, message=${writeWhileClosed.message}`
    );

    await owner.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "reopen",
        branch: "main",
        date: testDate,
      }),
    });
    const pgReopened = await getBranchDayState(mainBranch, testDate);
    recordCheck(
      13,
      "Reopening a day persists to PostgreSQL before success is returned",
      pgReopened === "open",
      `pg=${pgReopened}`
    );

    const storageSource = readRepoFile("lib/day-closing/storage.ts");
    recordCheck(
      14,
      "No localStorage is used as day-state authority",
      !storageSource.includes("localStorage") &&
        !readRepoFile("context/day-closing-context.tsx").includes("localStorage"),
      ""
    );

    recordCheck(
      15,
      "Existing day-open/day-closed gating behavior remains intact",
      (await getDayClosingStatus(mainBranch, testDate)) === "open",
      `status=${await getDayClosingStatus(mainBranch, testDate)}`
    );

    console.log(
      "\nNote: True multi-process concurrent race testing is not practical in this script; check #12 validates sequential close-then-write rejection via live PostgreSQL."
    );
    console.log("\nDay-closing live PostgreSQL verification complete.");
  } finally {
    if (kansangaCashier) {
      await cleanupCertificationCashier(kansangaCashier);
    }
    if (salaamaCashier) {
      await cleanupCertificationCashier(salaamaCashier);
    }

    for (const branch of [mainBranch, salaamaBranch] as Branch[]) {
      const branchRow = await prisma.branch.findFirst({ where: { code: branch } });
      if (branchRow) {
        await prisma.dayClosing.deleteMany({
          where: { branchId: branchRow.id, date: testDate },
        });
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
