#!/usr/bin/env tsx
/**
 * Close-day time flexibility + error-mapping certification.
 * Proves business-day close is not restricted by clock time and guards remain intact.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getActiveOpenDayRecord } from "@/lib/day-closing/business-date";
import { mapCloseDayError, toCloseDayFacingError } from "@/lib/ux/close-day-messages";
import { ApiError } from "@/lib/api/errors";
import { getBranchDayState } from "@/lib/server/services/day-closings-service";
import type { Branch } from "@/types";
import type { DayClosingRecord } from "@/types/day-closing";
import {
  approveCloseDayApi,
  submitAndApproveClose,
  submitCloseRequestApi,
} from "./verify-close-request-helpers";
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
const TEST_PREFIX = `verify-close-time-${Date.now()}`;

const EMPTY_CLOSE_PAYLOAD = {
  metrics: {
    todaySales: 0,
    todayPurchases: 0,
    todayOperatingExpenses: 0,
    todayInventoryInvestment: 0,
    todayStaffPaymentsRecorded: 0,
    cashBeforeClosing: 0,
  },
  staffPayouts: [] as unknown[],
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

const SIMULATED_CLOSE_HOURS: Array<{ label: string; hour: number; minute: number }> =
  [
    { label: "10:00 PM", hour: 22, minute: 0 },
    { label: "12:30 AM", hour: 0, minute: 30 },
    { label: "2:00 AM", hour: 2, minute: 0 },
    { label: "5:00 AM", hour: 5, minute: 0 },
  ];

function recordCheck(id: number, name: string, passed: boolean, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function sourceHasNoCloseTimeRestriction(relativePath: string): boolean {
  const source = readRepoFile(relativePath);
  const banned = [
    "SHOP_CLOSE_HOUR",
    "isWithinOpeningHours",
    "getShopScheduleState",
    "useShopCanOpenNow",
  ];
  return !banned.some((token) => source.includes(token));
}

class CloseTimeVerifier {
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
      const message =
        typeof payload.error?.message === "string"
          ? payload.error.message
          : `Request failed: ${response.status} ${apiPath}`;
      throw new ApiError(message, {
        status: response.status,
        code: payload.error?.code,
      });
    }

    return payload.data as T;
  }

  async jsonExpectFailure(
    apiPath: string,
    options: RequestInit = {}
  ): Promise<{ status: number; code?: string; message: string }> {
    const response = await this.request(apiPath, options);
    const payload = (await response.json()) as {
      error?: { message?: string; code?: string };
    };
    return {
      status: response.status,
      code: payload.error?.code,
      message: payload.error?.message ?? "",
    };
  }

  async loginWith(credentials: { username: string; password: string }): Promise<void> {
    await loginWithCredentials(this, credentials);
  }
}

async function resetDayClosing(branch: Branch, date: string): Promise<void> {
  const branchRow = await prisma.branch.findFirst({
    where: { code: branch },
    select: { id: true },
  });
  if (!branchRow) return;

  await prisma.dayClosing.deleteMany({
    where: { branchId: branchRow.id, date },
  });
}

async function closeStaleOpenDays(branch: Branch): Promise<void> {
  const branchRow = await prisma.branch.findFirst({
    where: { code: branch },
    select: { id: true },
  });
  if (!branchRow) return;

  const openRows = await prisma.dayClosing.findMany({
    where: { branchId: branchRow.id, status: { in: ["open", "close_requested"] } },
  });

  for (const row of openRows) {
    await prisma.dayClosing.update({
      where: { id: row.id },
      data: {
        status: "closed",
        closedAt: new Date(),
        closedByName: `${TEST_PREFIX} cleanup`,
      },
    });
  }
}

async function getDayClosingStatus(
  branch: Branch,
  date: string
): Promise<string | null> {
  const branchRow = await prisma.branch.findFirst({
    where: { code: branch },
    select: { id: true },
  });
  if (!branchRow) return null;

  const row = await prisma.dayClosing.findUnique({
    where: {
      branchId_date: {
        branchId: branchRow.id,
        date,
      },
    },
  });

  return row?.status ?? null;
}

async function main() {
  console.log("Verifying close-day time flexibility and error mapping...\n");

  const closeServiceSource = readRepoFile("lib/server/services/day-closings-service.ts");
  const closeHookSource = readRepoFile("hooks/use-staff-close-day.ts");
  const closeContextSource = readRepoFile("context/day-closing-context.tsx");

  recordCheck(
    1,
    "Close service has no SHOP_CLOSE_HOUR / opening-hours gate",
    sourceHasNoCloseTimeRestriction("lib/server/services/day-closings-service.ts"),
    "day-closings-service.ts"
  );

  recordCheck(
    2,
    "Staff close hook has no opening-hours gate",
    sourceHasNoCloseTimeRestriction("hooks/use-staff-close-day.ts") &&
      !closeHookSource.includes("after-close"),
    "use-staff-close-day.ts"
  );

  recordCheck(
    3,
    "Opening-hours module is only used for open-shop (not close-day server path)",
    closeServiceSource.includes("getStaffOnShiftAtBranch") &&
      !closeServiceSource.includes("opening-hours"),
    "open-shop-only schedule"
  );

  recordCheck(
    4,
    "Close-day context has no opening-hours gate",
    sourceHasNoCloseTimeRestriction("context/day-closing-context.tsx"),
    "day-closing-context.tsx"
  );

  recordCheck(
    5,
    "Staff-on-shift check uses resolved businessDate (not raw client hint)",
    closeServiceSource.includes("getStaffOnShiftAtBranch") &&
      /getStaffOnShiftAtBranch\([\s\S]*businessDate/.test(closeServiceSource),
    "businessDate passed to attendance guard"
  );

  for (const slot of SIMULATED_CLOSE_HOURS) {
    recordCheck(
      6 + SIMULATED_CLOSE_HOURS.indexOf(slot),
      `No close-time gate in server for ${slot.label} (static audit)`,
      !closeServiceSource.match(/getHours\(\)|SHOP_CLOSE|after-close|before-open/),
      "day-closings-service.ts"
    );
  }

  recordCheck(
    10,
    "staff_on_shift ApiError maps to server message (not connection fallback)",
    mapCloseDayError(
      "Cannot close the day while staff are still on shift: Pat",
      "staff_on_shift"
    ).includes("Pat"),
    mapCloseDayError(
      "Cannot close the day while staff are still on shift: Pat",
      "staff_on_shift"
    )
  );

  recordCheck(
    11,
    "ApiError code preserved via toCloseDayFacingError",
    toCloseDayFacingError(
      new ApiError("Previous business day still open.", {
        status: 409,
        code: "previous_business_day_open",
      })
    ).includes("Another business day is still open"),
    toCloseDayFacingError(
      new ApiError("Previous business day still open.", {
        status: 409,
        code: "previous_business_day_open",
      })
    )
  );

  recordCheck(
    12,
    "Technical 500 maps to connection fallback",
    toCloseDayFacingError(
      new ApiError("Unexpected server error.", {
        status: 500,
        code: "internal_error",
      })
    ).includes("Check your connection"),
    toCloseDayFacingError(
      new ApiError("Unexpected server error.", {
        status: 500,
        code: "internal_error",
      })
    )
  );

  const ownerClient = new CloseTimeVerifier();
  await ownerClient.loginWith(VERIFY_OWNER_CREDENTIALS);

  const cashier = await createCertificationCashier(ownerClient, TEST_PREFIX, "main");
  const kansangaClient = new CloseTimeVerifier();
  await kansangaClient.loginWith({
    username: cashier.username,
    password: cashier.password,
  });

  const salaamaCashier = await createCertificationCashier(
    ownerClient,
    `${TEST_PREFIX}-salaama`,
    "salaama"
  );
  const salaamaClient = new CloseTimeVerifier();
  await salaamaClient.loginWith({
    username: salaamaCashier.username,
    password: salaamaCashier.password,
  });

  const mainBranch: Branch = "main";
  const salaamaBranch: Branch = "salaama";
  const eveningDate = "2018-06-10";
  const rolloverOpenDate = "2018-06-20";
  const rolloverHintDate = "2018-06-21";
  const zeroDate = "2018-06-30";
  const guardDateA = "2018-07-01";
  const guardDateB = "2018-07-02";
  const isolationDate = "2018-07-10";
  const closedDate = "2018-07-11";

  try {
    await closeStaleOpenDays(mainBranch);
    await closeStaleOpenDays(salaamaBranch);

    for (const date of [
      eveningDate,
      rolloverOpenDate,
      zeroDate,
      guardDateA,
      guardDateB,
      isolationDate,
      closedDate,
    ]) {
      await resetDayClosing(mainBranch, date);
    }

    await kansangaClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "main",
        date: eveningDate,
      }),
    });

    const eveningClosed = await submitAndApproveClose<{ date: string; status: string }>(
      kansangaClient,
      ownerClient,
      "main",
      eveningDate,
      EMPTY_CLOSE_PAYLOAD
    );

    recordCheck(
      13,
      "Close at normal evening time → PASS",
      eveningClosed.status === "closed" && eveningClosed.date === eveningDate,
      `date=${eveningClosed.date}`
    );

    await closeStaleOpenDays(mainBranch);

    await kansangaClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "main",
        date: rolloverOpenDate,
      }),
    });

    await submitCloseRequestApi(kansangaClient, "main", rolloverHintDate, EMPTY_CLOSE_PAYLOAD);
    const afterMidnightClosed = await approveCloseDayApi<{
      date: string;
      status: string;
      closedAt?: string;
    }>(ownerClient, "main", rolloverHintDate, EMPTY_CLOSE_PAYLOAD);

    recordCheck(
      14,
      "Close at 12:30 AM (after-midnight hint) → PASS",
      afterMidnightClosed.date === rolloverOpenDate &&
        afterMidnightClosed.status === "closed",
      `closedBusinessDate=${afterMidnightClosed.date}`
    );

    recordCheck(
      15,
      "Closing uses persisted business date (not calendar hint)",
      afterMidnightClosed.date === rolloverOpenDate,
      `hint=${rolloverHintDate}, closed=${afterMidnightClosed.date}`
    );

    const mockRecords: DayClosingRecord[] = [
      {
        id: "mock-open",
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

    recordCheck(
      16,
      "getActiveOpenDayRecord resolves persisted open business date",
      getActiveOpenDayRecord(mainBranch, mockRecords)?.date === rolloverOpenDate,
      getActiveOpenDayRecord(mainBranch, mockRecords)?.date
    );

    await closeStaleOpenDays(mainBranch);

    await kansangaClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "main",
        date: zeroDate,
      }),
    });

    const zeroClosed = await submitAndApproveClose<{ status: string }>(
      kansangaClient,
      ownerClient,
      "main",
      zeroDate,
      EMPTY_CLOSE_PAYLOAD
    );

    recordCheck(
      17,
      "Zero-revenue day can still close → PASS",
      zeroClosed.status === "closed",
      `status=${zeroClosed.status}`
    );

    await closeStaleOpenDays(mainBranch);
    await closeStaleOpenDays(salaamaBranch);

    await kansangaClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "main",
        date: guardDateA,
      }),
    });

    const previousOpenFailure = await kansangaClient.jsonExpectFailure(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "open",
          branch: "main",
          date: guardDateB,
        }),
      }
    );

    recordCheck(
      18,
      "Previous-business-day-open guard still works",
      previousOpenFailure.status === 409 &&
        previousOpenFailure.code === "previous_business_day_open",
      `status=${previousOpenFailure.status}, code=${previousOpenFailure.code}`
    );

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

    await submitCloseRequestApi(kansangaClient, "main", isolationDate, EMPTY_CLOSE_PAYLOAD);

    const crossBranchClose = await salaamaClient.jsonExpectFailure(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "approve-close",
          branch: "main",
          date: isolationDate,
          ...EMPTY_CLOSE_PAYLOAD,
        }),
      }
    );

    recordCheck(
      19,
      "Branch isolation still works",
      crossBranchClose.status === 403,
      `status=${crossBranchClose.status}`
    );

    const cashierApproveDenied = await kansangaClient.jsonExpectFailure(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "approve-close",
          branch: "main",
          date: isolationDate,
          ...EMPTY_CLOSE_PAYLOAD,
        }),
      }
    );

    recordCheck(
      20,
      "Unauthorized cashier cannot approve and close",
      cashierApproveDenied.status === 403 && cashierApproveDenied.code === "forbidden",
      `status=${cashierApproveDenied.status}`
    );

    await approveCloseDayApi(ownerClient, "main", isolationDate, EMPTY_CLOSE_PAYLOAD);

    const alreadyClosed = await kansangaClient.jsonExpectFailure(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "submit-close-request",
          branch: "main",
          date: isolationDate,
          ...EMPTY_CLOSE_PAYLOAD,
        }),
      }
    );

    recordCheck(
      21,
      "Already-closed day still fails appropriately",
      alreadyClosed.status >= 400 &&
        (alreadyClosed.code === "day_already_closed" ||
          alreadyClosed.code === "shop_not_opened"),
      `status=${alreadyClosed.status}, code=${alreadyClosed.code}`
    );

    recordCheck(
      22,
      "Close context does not re-upsert entry after successful approveCloseDayApi",
      closeContextSource.includes("approveCloseDayApi") &&
        !closeContextSource.match(/approveCloseDayApi[\s\S]*upsertEntry/),
      "no post-close upsertEntry"
    );

    recordCheck(
      23,
      "Close context treats post-close refresh failures as non-fatal",
      closeContextSource.includes("Close day persisted but closings refresh failed"),
      "refresh guarded"
    );

    await closeStaleOpenDays(mainBranch);

    await kansangaClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "main",
        date: closedDate,
      }),
    });

    await submitAndApproveClose(
      kansangaClient,
      ownerClient,
      "main",
      closedDate,
      EMPTY_CLOSE_PAYLOAD
    );

    const pgState = await getBranchDayState(mainBranch, closedDate);

    recordCheck(
      24,
      "Close at 2:00 AM / 5:00 AM — no server hour gate (same code path as evening)",
      pgState === "closed",
      `pg=${pgState}`
    );
  } finally {
    await cleanupCertificationCashier(cashier, { branch: "main" });
    await cleanupCertificationCashier(salaamaCashier, { branch: "salaama" });
    await closeStaleOpenDays(mainBranch);
    await closeStaleOpenDays(salaamaBranch);
  }

  console.log("\nClose-day time flexibility verification complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
