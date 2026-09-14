#!/usr/bin/env tsx
/**
 * Full closing-request → management approval lifecycle (Tests A–J).
 */
import "dotenv/config";
import { prisma } from "@/lib/db";
import { readCloseRequest } from "@/lib/day-closing/close-request";
import { getBranchDayState } from "@/lib/server/services/day-closings-service";
import type { Branch } from "@/types";
import type { DayClosingRecord } from "@/types/day-closing";
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
const TEST_PREFIX = `verify-approval-flow-${Date.now()}`;

function recordCheck(id: string, name: string, passed: boolean, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

class FlowVerifier {
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
        typeof payload.error?.message === "string"
          ? payload.error.message
          : `Request failed: ${response.status} ${apiPath}`
      );
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

async function closeStaleActiveDays(branch: Branch): Promise<void> {
  const branchRow = await prisma.branch.findFirst({
    where: { code: branch },
    select: { id: true },
  });
  if (!branchRow) return;
  await prisma.dayClosing.updateMany({
    where: {
      branchId: branchRow.id,
      status: { in: ["open", "close_requested"] },
    },
    data: {
      status: "closed",
      closedAt: new Date(),
      closedByName: `${TEST_PREFIX} cleanup`,
    },
  });
}

async function main() {
  console.log("Verifying full closing-request approval lifecycle (A–J)...\n");

  const owner = new FlowVerifier();
  await owner.loginWith(VERIFY_OWNER_CREDENTIALS);

  const kansangaCashier = await createCertificationCashier(
    owner,
    `${TEST_PREFIX}-k`,
    "main"
  );
  const salaamaCashier = await createCertificationCashier(
    owner,
    `${TEST_PREFIX}-s`,
    "salaama"
  );
  const manager = await createCertificationCashier(
    owner,
    `${TEST_PREFIX}-mgr`,
    "main",
    "branch-manager"
  );

  const staffClient = new FlowVerifier();
  await staffClient.loginWith({
    username: kansangaCashier.username,
    password: kansangaCashier.password,
  });

  const managerClient = new FlowVerifier();
  await managerClient.loginWith({
    username: manager.username,
    password: manager.password,
  });

  const salaamaClient = new FlowVerifier();
  await salaamaClient.loginWith({
    username: salaamaCashier.username,
    password: salaamaCashier.password,
  });

  const mainBranch: Branch = "main";
  const salaamaBranch: Branch = "salaama";
  const dayA = "2020-08-24";
  const dayB = "2020-08-25";
  const forgottenOpen = "2020-08-26";
  const forgottenBlock = "2020-08-27";
  const rolloverOpen = "2020-08-28";
  const rolloverHint = "2020-08-29";
  const isolationDate = "2020-08-30";
  const zeroDate = "2020-08-31";

  try {
    await closeStaleActiveDays(mainBranch);
    await closeStaleActiveDays(salaamaBranch);

    for (const date of [
      dayA,
      dayB,
      forgottenOpen,
      forgottenBlock,
      rolloverOpen,
      isolationDate,
      zeroDate,
    ]) {
      await resetDayClosing(mainBranch, date);
    }

    // TEST A — Open Day
    const opened = await staffClient.json<{ status: string; date: string }>(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({ action: "open", branch: mainBranch, date: dayA }),
      }
    );
    recordCheck("A", "Open Kansanga business day", opened.status === "open", opened.status);

    // TEST B — Staff submits
    const payloadWithTotals = {
      ...EMPTY_CLOSE_PAYLOAD,
      metrics: {
        ...EMPTY_CLOSE_PAYLOAD.metrics,
        todaySales: 80000,
        todayOperatingExpenses: 27000,
        todayStaffPaymentsRecorded: 10000,
        cashBeforeClosing: 43000,
      },
      summary: {
        ...EMPTY_CLOSE_PAYLOAD.summary,
        sales: 80000,
        expenses: 27000,
        staffPayments: 10000,
        remainingCash: 43000,
      },
      actualCashCounted: 43000,
      expectedCash: 43000,
      closingNotes: `${TEST_PREFIX} daily notes`,
    };

    const submitted = await submitCloseRequestApi<DayClosingRecord>(
      staffClient,
      mainBranch,
      dayA,
      payloadWithTotals
    );
    const pgAfterSubmit = await getBranchDayState(mainBranch, dayA);
    recordCheck(
      "B",
      "Staff submit → pending request, business day not closed",
      submitted.status === "close_requested" &&
        pgAfterSubmit === "close_requested" &&
        (await getBranchDayState(mainBranch, dayA)) !== "closed",
      `status=${submitted.status}, pg=${pgAfterSubmit}`
    );

    // TEST C — Management sees request
    const managerClosings = await managerClient.json<DayClosingRecord[]>(
      "/api/day-closings"
    );
    const pending = managerClosings.filter((row) => row.status === "close_requested");
    const kansangaRequest = pending.find(
      (row) => row.branch === mainBranch && row.date === dayA
    );
    const closeRequest = kansangaRequest
      ? readCloseRequest(kansangaRequest.summary)
      : undefined;

    recordCheck(
      "C",
      "Management sees Kansanga pending request with totals and submitter",
      Boolean(kansangaRequest) &&
        kansangaRequest?.summary.sales === 80000 &&
        kansangaRequest?.summary.expenses === 27000 &&
        Boolean(closeRequest?.submittedByName),
      closeRequest?.submittedByName
    );

    // TEST D — Management approves
    const approved = await approveCloseDayApi<DayClosingRecord>(
      managerClient,
      mainBranch,
      dayA,
      payloadWithTotals
    );
    recordCheck(
      "D",
      "Management Approve & Close Day",
      approved.status === "closed" && Boolean(approved.closedAt),
      approved.closedAt
    );

    // TEST E — Staff refresh state
    const staffClosings = await staffClient.json<DayClosingRecord[]>(
      "/api/day-closings"
    );
    const staffDay = staffClosings.find(
      (row) => row.branch === mainBranch && row.date === dayA
    );
    const resubmit = await staffClient.jsonExpectFailure("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "submit-close-request",
        branch: mainBranch,
        date: dayA,
        ...EMPTY_CLOSE_PAYLOAD,
      }),
    });

    recordCheck(
      "E",
      "Staff refresh sees CLOSED; cannot resubmit",
      staffDay?.status === "closed" &&
        resubmit.code === "day_already_closed",
      `status=${staffDay?.status}, code=${resubmit.code}`
    );

    // TEST F — Next day opens
    const nextOpen = await staffClient.json<{ status: string; date: string }>(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({ action: "open", branch: mainBranch, date: dayB }),
      }
    );
    recordCheck(
      "F",
      "Next business day opens after previous closed",
      nextOpen.status === "open" && nextOpen.date === dayB,
      nextOpen.date
    );

    await closeStaleActiveDays(mainBranch);

    // TEST G — Forgotten close guard
    await staffClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: mainBranch,
        date: forgottenOpen,
      }),
    });
    const blocked = await staffClient.jsonExpectFailure("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: mainBranch,
        date: forgottenBlock,
      }),
    });
    recordCheck(
      "G",
      "Forgotten close blocks next day",
      blocked.code === "previous_business_day_open",
      blocked.code
    );

    // TEST H — After midnight business date
    await closeStaleActiveDays(mainBranch);
    await resetDayClosing(mainBranch, rolloverOpen);
    await staffClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: mainBranch,
        date: rolloverOpen,
      }),
    });
    await submitCloseRequestApi(staffClient, mainBranch, rolloverHint);
    const midnightApproved = await approveCloseDayApi<DayClosingRecord>(
      managerClient,
      mainBranch,
      rolloverHint
    );
    recordCheck(
      "H",
      "After-midnight close keeps businessDate, sets closedAt",
      midnightApproved.date === rolloverOpen &&
        midnightApproved.status === "closed" &&
        Boolean(midnightApproved.closedAt),
      `businessDate=${midnightApproved.date}, closedAt=${midnightApproved.closedAt}`
    );

    // TEST I — Branch isolation
    await closeStaleActiveDays(mainBranch);
    await closeStaleActiveDays(salaamaBranch);
    await resetDayClosing(mainBranch, isolationDate);
    await staffClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: mainBranch,
        date: isolationDate,
      }),
    });
    await submitCloseRequestApi(staffClient, mainBranch, isolationDate);
    const salaamaClosings = await salaamaClient.json<DayClosingRecord[]>(
      "/api/day-closings"
    );
    const salaamaSeesKansanga = salaamaClosings.some(
      (row) => row.branch === mainBranch && row.status === "close_requested"
    );
    const crossApprove = await salaamaClient.jsonExpectFailure(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "approve-close",
          branch: mainBranch,
          date: isolationDate,
          ...EMPTY_CLOSE_PAYLOAD,
        }),
      }
    );
    recordCheck(
      "I",
      "Branch isolation for pending requests and approval",
      !salaamaSeesKansanga && crossApprove.status === 403,
      `seesOther=${salaamaSeesKansanga}, status=${crossApprove.status}`
    );

    // TEST J — Zero revenue
    await closeStaleActiveDays(mainBranch);
    await resetDayClosing(mainBranch, zeroDate);
    await staffClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({ action: "open", branch: mainBranch, date: zeroDate }),
    });
    const zeroApproved = await submitCloseRequestApi(staffClient, mainBranch, zeroDate);
    const zeroClosed = await approveCloseDayApi(managerClient, mainBranch, zeroDate);
    recordCheck(
      "J",
      "Zero-revenue day submit and approve",
      zeroApproved.status === "close_requested" && zeroClosed.status === "closed",
      zeroClosed.status
    );
  } finally {
    await cleanupCertificationCashier(kansangaCashier, { branch: "main" });
    await cleanupCertificationCashier(salaamaCashier, { branch: "salaama" });
    await cleanupCertificationCashier(manager, { branch: "main" });
    await closeStaleActiveDays(mainBranch);
    await closeStaleActiveDays(salaamaBranch);
  }

  console.log("\nFull closing-request approval lifecycle verification complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
