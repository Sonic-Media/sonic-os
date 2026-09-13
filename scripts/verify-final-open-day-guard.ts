#!/usr/bin/env tsx
/**
 * Final open-day guard — one open business day per branch at a time.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getBranchDayState } from "@/lib/server/services/day-closings-service";
import type { Branch } from "@/types";
import { submitAndApproveClose } from "./verify-close-request-helpers";
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
const TEST_PREFIX = `verify-open-guard-${Date.now()}`;

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

function recordCheck(id: number, name: string, passed: boolean, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

class OpenDayGuardVerifier {
  private cookieHeader = "";

  private async request(apiPath: string, options: RequestInit = {}): Promise<Response> {
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

    const payload = (await response.json()) as {
      data?: T;
      error?: { message?: string; code?: string };
    };

    if (!response.ok) {
      throw new Error(
        payload.error?.message ?? `Request failed: ${response.status} ${apiPath}`
      );
    }

    return payload.data as T;
  }

  async expectFailure(apiPath: string, options: RequestInit = {}) {
    const response = await this.request(apiPath, options);
    const payload = (await response.json()) as {
      error?: { message?: string; code?: string };
    };
    return {
      status: response.status,
      message: payload.error?.message ?? "",
      code: payload.error?.code ?? "",
    };
  }

  async loginAsCashier(cashier: CertificationCashier) {
    await loginWithCredentials(this, {
      username: cashier.username,
      password: cashier.password,
    });
  }
}

async function resolveBranchCode(preferred: string): Promise<Branch> {
  const candidates = preferred === "salaama" ? ["salaama", "branch2"] : [preferred];
  for (const code of candidates) {
    const row = await prisma.branch.findFirst({
      where: { code, active: true },
      select: { code: true },
    });
    if (row) {
      return row.code as Branch;
    }
  }
  throw new Error(`Branch not found: ${preferred}`);
}

async function resetTestDayClosings(branch: Branch, dates: string[]) {
  const branchRow = await prisma.branch.findFirst({ where: { code: branch } });
  if (!branchRow) return;

  await prisma.dayClosing.deleteMany({
    where: {
      branchId: branchRow.id,
      date: { in: dates },
    },
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

function scanStaticGuard(): void {
  const serviceSource = readRepoFile("lib/server/services/day-closings-service.ts");
  const staffMessages = readRepoFile("lib/ux/staff-messages.ts");

  recordCheck(
    1,
    "Server enforces assertCanOpenRequestedBusinessDay before open",
    serviceSource.includes("assertCanOpenRequestedBusinessDay") &&
      serviceSource.includes('code: "previous_business_day_open"') &&
      /openDay[\s\S]*assertCanOpenRequestedBusinessDay/.test(serviceSource) &&
      /openWithShift[\s\S]*assertCanOpenRequestedBusinessDay/.test(serviceSource),
    ""
  );

  recordCheck(
    2,
    "Guard reuses active open business-day lookup pattern",
    serviceSource.includes("findActiveOpenBusinessDays") &&
      serviceSource.includes("resolveOpenBusinessDateForClose"),
    ""
  );

  recordCheck(
    3,
    "Staff UI preserves previous-business-day-open message",
    staffMessages.includes("previous_business_day_open"),
    ""
  );
}

async function main() {
  console.log("Final open-day guard verification\n");
  scanStaticGuard();

  const owner = new OpenDayGuardVerifier();
  let kansangaCashier: CertificationCashier | null = null;
  let salaamaCashier: CertificationCashier | null = null;

  const mondayDate = "2018-03-05";
  const tuesdayDate = "2018-03-06";
  const isolationDate = "2018-03-12";

  try {
    await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);

    const mainBranch = await resolveBranchCode("main");
    const salaamaBranch = await resolveBranchCode("salaama");

    await closeStaleOpenDays(mainBranch);
    await closeStaleOpenDays(salaamaBranch);
    await resetTestDayClosings(mainBranch, [mondayDate, tuesdayDate, isolationDate]);
    await resetTestDayClosings(salaamaBranch, [isolationDate]);

    kansangaCashier = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-k`,
      mainBranch
    );
    salaamaCashier = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-s`,
      salaamaBranch
    );

    const kansangaClient = new OpenDayGuardVerifier();
    await kansangaClient.loginAsCashier(kansangaCashier);

    const firstOpen = await kansangaClient.json<{ date: string; status: string }>(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "open",
          branch: mainBranch,
          date: mondayDate,
        }),
      }
    );

    recordCheck(
      4,
      "New branch/day with no open record can open",
      firstOpen.status === "open" && firstOpen.date === mondayDate,
      `status=${firstOpen.status}`
    );

    const blockedNextDay = await kansangaClient.expectFailure("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: mainBranch,
        date: tuesdayDate,
      }),
    });

    recordCheck(
      5,
      "Previous business day still open blocks opening next day",
      blockedNextDay.status === 409 &&
        blockedNextDay.code === "previous_business_day_open",
      `status=${blockedNextDay.status}, code=${blockedNextDay.code}`
    );

    const tuesdayCountBeforeClose = await prisma.dayClosing.count({
      where: {
        date: tuesdayDate,
        branch: { code: mainBranch },
      },
    });

    recordCheck(
      6,
      "Blocked open does not create overlapping DayClosing record",
      tuesdayCountBeforeClose === 0,
      `count=${tuesdayCountBeforeClose}`
    );

    await submitAndApproveClose(
      kansangaClient,
      owner,
      mainBranch,
      mondayDate,
      EMPTY_CLOSE_PAYLOAD
    );

    const secondOpen = await kansangaClient.json<{ date: string; status: string }>(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "open",
          branch: mainBranch,
          date: tuesdayDate,
        }),
      }
    );

    recordCheck(
      7,
      "After previous day closed, next business day can open",
      secondOpen.status === "open" && secondOpen.date === tuesdayDate,
      `status=${secondOpen.status}`
    );

    const duplicateOpen = await kansangaClient.expectFailure("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: mainBranch,
        date: tuesdayDate,
      }),
    });

    recordCheck(
      8,
      "Same-day duplicate opening is rejected",
      duplicateOpen.status === 409 && duplicateOpen.code === "day_already_open",
      `code=${duplicateOpen.code}`
    );

    await closeStaleOpenDays(salaamaBranch);

    const salaamaClient = new OpenDayGuardVerifier();
    await salaamaClient.loginAsCashier(salaamaCashier);

    const salaamaOpen = await salaamaClient.json<{ status: string }>(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "open",
          branch: salaamaBranch,
          date: isolationDate,
        }),
      }
    );

    recordCheck(
      9,
      "Branch isolation — other branch open does not block this branch",
      (await getBranchDayState(mainBranch, tuesdayDate)) === "open" &&
        salaamaOpen.status === "open",
      `main=${await getBranchDayState(mainBranch, tuesdayDate)}, salaama=${salaamaOpen.status}`
    );

    const foreignOpen = await salaamaClient.expectFailure("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: mainBranch,
        date: isolationDate,
      }),
    });

    recordCheck(
      10,
      "Branch authorization remains intact for open attempts",
      foreignOpen.status === 403,
      `status=${foreignOpen.status}`
    );

    console.log("\nAll final open-day guard checks passed.");
  } finally {
    try {
      const mainBranch = await resolveBranchCode("main");
      const salaamaBranch = await resolveBranchCode("salaama");
      await closeStaleOpenDays(mainBranch);
      await closeStaleOpenDays(salaamaBranch);
    } catch {
      // Best-effort cleanup for shared verification databases.
    }

    if (kansangaCashier) {
      await cleanupCertificationCashier(kansangaCashier);
    }
    if (salaamaCashier) {
      await cleanupCertificationCashier(salaamaCashier);
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
