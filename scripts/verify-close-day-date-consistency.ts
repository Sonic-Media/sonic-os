import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getActiveOpenDayRecord } from "@/lib/day-closing/business-date";
import { getBranchDayState } from "@/lib/server/services/day-closings-service";
import type { Branch } from "@/types";
import type { DayClosingRecord } from "@/types/day-closing";
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
const TEST_PREFIX = `verify-close-date-${Date.now()}`;

type JsonRecord = Record<string, unknown>;

const EMPTY_CLOSE_PAYLOAD = {
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
  cashStatus: "balanced" as const,
  summary: {
    sales: 0,
    expenses: 0,
    inventoryInvestment: 0,
    staffPayments: 0,
    remainingCash: 0,
    inventoryFund: 0,
    operatingFund: 0,
  },
};

function recordCheck(id: number, name: string, passed: boolean, detail: string) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

class CloseDayVerifier {
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

  async loginAsCashier(cashier: CertificationCashier) {
    await loginWithCredentials(this, {
      username: cashier.username,
      password: cashier.password,
    });
  }
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

async function countDayClosing(branch: Branch, date: string) {
  const branchRow = await prisma.branch.findFirst({ where: { code: branch } });
  if (!branchRow) return 0;
  return prisma.dayClosing.count({
    where: { branchId: branchRow.id, date },
  });
}

async function closeStaleOpenDays(branch: Branch) {
  const branchRow = await prisma.branch.findFirst({ where: { code: branch } });
  if (!branchRow) return;

  const staleOpen = await prisma.dayClosing.findMany({
    where: {
      branchId: branchRow.id,
      status: "open",
      OR: [{ openedAt: { not: null } }, { reopenedAt: { not: null } }],
    },
  });

  for (const record of staleOpen) {
    await prisma.dayClosing.update({
      where: { id: record.id },
      data: { status: "closed", closedAt: new Date() },
    });
  }
}

function scanStaticFixes(): void {
  const contextSource = readRepoFile("context/day-closing-context.tsx");
  const serviceSource = readRepoFile("lib/server/services/day-closings-service.ts");
  const businessDateSource = readRepoFile("lib/day-closing/business-date.ts");
  const datesSource = readRepoFile("lib/dates.ts");

  recordCheck(
    1,
    "Client resolves active open business day via getActiveOpenDayRecord",
    contextSource.includes("getActiveOpenDayRecord") &&
      contextSource.includes("const businessDate = activeOpenRecord?.date"),
    ""
  );

  recordCheck(
    2,
    "Server resolves open business date via resolveOpenBusinessDateForClose",
    serviceSource.includes("resolveOpenBusinessDateForClose") &&
      serviceSource.includes("businessDate"),
    ""
  );

  recordCheck(
    3,
    "No redundant post-close upsertEntry in closeDay client flow",
    contextSource.includes("closeDayApi") &&
      !contextSource.includes("buildClosedDayDailyOperationEntry") &&
      !contextSource.match(/closeDayApi[\s\S]*upsertEntry/),
    ""
  );

  recordCheck(
    4,
    "getTodayISO is not globally replaced in lib/dates.ts",
    datesSource.includes("export function getTodayISO"),
    ""
  );

  recordCheck(
    5,
    "Business-date helper returns earliest open day",
    businessDateSource.includes("getActiveOpenDayRecord") &&
      businessDateSource.includes("sort((left, right) => left.date.localeCompare(right.date))"),
    ""
  );
}

async function main() {
  const mainBranch = "main" as Branch;
  const salaamaBranch = "salaama" as Branch;
  const sameDayDate = `2019-06-10`;
  const rolloverOpenDate = `2019-06-20`;
  const rolloverCloseHint = `2019-06-21`;
  const postCloseDate = `2019-06-30`;
  const failureDate = `2019-07-01`;
  const isolationDate = `2019-07-10`;
  const owner = new CloseDayVerifier();
  let kansangaCashier: CertificationCashier | null = null;
  let salaamaCashier: CertificationCashier | null = null;

  console.log("Verifying Close Day date consistency and post-close write fix...\n");
  scanStaticFixes();

  try {
    await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);
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

    const kansangaClient = new CloseDayVerifier();
    await kansangaClient.loginAsCashier(kansangaCashier);

    // Same-day close
    await kansangaClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "main",
        date: sameDayDate,
      }),
    });

    const sameDayClosed = await kansangaClient.json<{ date: string; status: string }>(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "close",
          branch: "main",
          date: sameDayDate,
          ...EMPTY_CLOSE_PAYLOAD,
        }),
      }
    );
    const sameDayPg = await getDayClosingStatus(mainBranch, sameDayDate);

    recordCheck(
      6,
      "Same-day close closes persisted business date",
      sameDayClosed.date === sameDayDate &&
        sameDayClosed.status === "closed" &&
        sameDayPg === "closed",
      `api=${sameDayClosed.date}, pg=${sameDayPg}`
    );

    // After-midnight close (open one day, close with next-day hint)
    await closeStaleOpenDays(mainBranch);

    await kansangaClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "main",
        date: rolloverOpenDate,
      }),
    });

    const rolloverClosed = await kansangaClient.json<{ date: string; status: string }>(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "close",
          branch: "main",
          date: rolloverCloseHint,
          ...EMPTY_CLOSE_PAYLOAD,
        }),
      }
    );
    const openDayPg = await getDayClosingStatus(mainBranch, rolloverOpenDate);
    const hintDayCount = await countDayClosing(mainBranch, rolloverCloseHint);

    recordCheck(
      7,
      "After-midnight close closes actual open business day (not calendar hint)",
      rolloverClosed.date === rolloverOpenDate &&
        rolloverClosed.status === "closed" &&
        openDayPg === "closed",
      `closed=${rolloverClosed.date}, openDayPg=${openDayPg}`
    );

    recordCheck(
      8,
      "After-midnight close does not create spurious next-day DayClosing",
      hintDayCount === 0,
      `hintDayCount=${hintDayCount}`
    );

    // Client-side business date resolution (unit-style)
    const mockRecords: DayClosingRecord[] = [
      {
        id: "mock-1",
        date: rolloverOpenDate,
        branch: mainBranch,
        status: "open",
        openedAt: new Date().toISOString(),
        metrics: EMPTY_CLOSE_PAYLOAD.metrics,
        staffPayouts: [],
        expectedCash: 0,
        actualCashCounted: 0,
        cashDifference: 0,
        cashStatus: "balanced",
        summary: EMPTY_CLOSE_PAYLOAD.summary,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    const resolved = getActiveOpenDayRecord(mainBranch, mockRecords);
    recordCheck(
      9,
      "getActiveOpenDayRecord resolves persisted open business date",
      resolved?.date === rolloverOpenDate,
      `resolved=${resolved?.date}`
    );

    // Post-close write: close succeeds and day is closed in PostgreSQL
    await closeStaleOpenDays(mainBranch);

    await kansangaClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "main",
        date: postCloseDate,
      }),
    });

    const postCloseResult = await kansangaClient.json<{ status: string }>(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "close",
          branch: "main",
          date: postCloseDate,
          ...EMPTY_CLOSE_PAYLOAD,
        }),
      }
    );
    const postClosePg = await getBranchDayState(mainBranch, postCloseDate);

    recordCheck(
      10,
      "Successful closeDayApi returns success with PostgreSQL closed state",
      postCloseResult.status === "closed" && postClosePg === "closed",
      `api=${postCloseResult.status}, pg=${postClosePg}`
    );

    const dailyOps = await kansangaClient.json<Array<{ date: string; status: string }>>(
      "/api/daily-operations"
    );
    const closedOp = dailyOps.find(
      (item) => item.date === postCloseDate && item.status === "completed"
    );
    recordCheck(
      11,
      "Server syncClosedDayDailyOperation persists completed DailyOperation on close",
      !!closedOp,
      `found=${!!closedOp}`
    );

    const redundantWrite = await kansangaClient.jsonExpectFailure(
      "/api/daily-operations",
      {
        method: "POST",
        body: JSON.stringify({
          date: postCloseDate,
          time: "23:59",
          timestamp: Date.now(),
          branch: "main",
          sales: 0,
          expenses: [],
          notes: `${TEST_PREFIX} redundant`,
          status: "completed",
        }),
      }
    );
    recordCheck(
      12,
      "Post-close redundant write is correctly rejected (409 day_closed)",
      redundantWrite.status === 409,
      `status=${redundantWrite.status}`
    );

    // Failure test: close without open
    const closeWithoutOpen = await kansangaClient.jsonExpectFailure(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "close",
          branch: "main",
          date: failureDate,
          ...EMPTY_CLOSE_PAYLOAD,
        }),
      }
    );
    const failurePg = await getDayClosingStatus(mainBranch, failureDate);

    recordCheck(
      13,
      "Failed close reports failure and leaves day unopened",
      closeWithoutOpen.status === 400 && failurePg === null,
      `status=${closeWithoutOpen.status}, pg=${failurePg}`
    );

    // Branch isolation
    await closeStaleOpenDays(mainBranch);
    await closeStaleOpenDays(salaamaBranch);

    await kansangaClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "main",
        date: isolationDate,
      }),
    });

    const salaamaClient = new CloseDayVerifier();
    await salaamaClient.loginAsCashier(salaamaCashier);
    const foreignClose = await salaamaClient.jsonExpectFailure("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "close",
        branch: "main",
        date: isolationDate,
        ...EMPTY_CLOSE_PAYLOAD,
      }),
    });
    const kansangaStillOpen = await getBranchDayState(mainBranch, isolationDate);

    recordCheck(
      14,
      "Salaama cannot close Kansanga open day",
      foreignClose.status === 403 && kansangaStillOpen === "open",
      `status=${foreignClose.status}, kansanga=${kansangaStillOpen}`
    );

    await salaamaClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "salaama",
        date: isolationDate,
      }),
    });

    const kansangaTriesSalaama = await kansangaClient.jsonExpectFailure(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "close",
          branch: "salaama",
          date: isolationDate,
          ...EMPTY_CLOSE_PAYLOAD,
        }),
      }
    );
    const salaamaStillOpen = await getBranchDayState(salaamaBranch, isolationDate);

    recordCheck(
      15,
      "Kansanga cannot close Salaama open day",
      kansangaTriesSalaama.status === 403 && salaamaStillOpen === "open",
      `status=${kansangaTriesSalaama.status}, salaama=${salaamaStillOpen}`
    );

    // Reopen behavior preserved
    await owner.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "reopen",
        branch: "main",
        date: sameDayDate,
      }),
    });
    const reopenedPg = await getBranchDayState(mainBranch, sameDayDate);
    recordCheck(
      16,
      "Existing reopen behavior remains intact",
      reopenedPg === "open",
      `pg=${reopenedPg}`
    );

    console.log("\nClose Day date consistency verification complete.");
  } finally {
    if (kansangaCashier) {
      await cleanupCertificationCashier(kansangaCashier);
    }
    if (salaamaCashier) {
      await cleanupCertificationCashier(salaamaCashier);
    }

    for (const branch of [mainBranch, salaamaBranch] as Branch[]) {
      const branchRow = await prisma.branch.findFirst({ where: { code: branch } });
      if (!branchRow) continue;

      const dates = [
        sameDayDate,
        rolloverOpenDate,
        rolloverCloseHint,
        postCloseDate,
        failureDate,
        isolationDate,
      ];
      await prisma.dayClosing.deleteMany({
        where: { branchId: branchRow.id, date: { in: dates } },
      });
      await prisma.dailyOperation.deleteMany({
        where: { branchId: branchRow.id, date: { in: dates } },
      });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
