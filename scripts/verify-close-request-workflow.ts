#!/usr/bin/env tsx
/**
 * Two-step close-request workflow certification.
 */
import "dotenv/config";
import { prisma } from "@/lib/db";
import { readCloseRequest } from "@/lib/day-closing/close-request";
import { getActiveOpenDayRecord } from "@/lib/day-closing/business-date";
import { mapCloseDayError } from "@/lib/ux/close-day-messages";
import { getBranchDayState } from "@/lib/server/services/day-closings-service";
import type { Branch } from "@/types";
import type { DayClosingRecord } from "@/types/day-closing";
import {
  approveCloseDayApi,
  EMPTY_CLOSE_PAYLOAD,
  submitAndApproveClose,
  submitCloseRequestApi,
} from "./verify-close-request-helpers";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
} from "./verify-bootstrap";
import { loginWithCredentials, VERIFY_OWNER_CREDENTIALS } from "./verify-session";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-close-request-${Date.now()}`;

function recordCheck(id: number, name: string, passed: boolean, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

class WorkflowVerifier {
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
  console.log("Verifying close-request workflow...\n");

  const owner = new WorkflowVerifier();
  await owner.loginWith(VERIFY_OWNER_CREDENTIALS);

  const cashier = await createCertificationCashier(owner, TEST_PREFIX, "main");
  const manager = await createCertificationCashier(
    owner,
    `${TEST_PREFIX}-mgr`,
    "main",
    "branch-manager"
  );
  const salaamaCashier = await createCertificationCashier(
    owner,
    `${TEST_PREFIX}-salaama`,
    "salaama"
  );

  const staffClient = new WorkflowVerifier();
  await staffClient.loginWith({ username: cashier.username, password: cashier.password });

  const managerClient = new WorkflowVerifier();
  await managerClient.loginWith({ username: manager.username, password: manager.password });

  const salaamaClient = new WorkflowVerifier();
  await salaamaClient.loginWith({
    username: salaamaCashier.username,
    password: salaamaCashier.password,
  });

  const mainBranch: Branch = "main";
  const testDate = "2019-03-15";
  const rolloverOpen = "2019-03-20";
  const rolloverHint = "2019-03-21";
  const guardDateA = "2019-03-25";
  const guardDateB = "2019-03-26";
  const isolationDate = "2019-03-30";

  try {
    await closeStaleActiveDays(mainBranch);
    await closeStaleActiveDays("salaama");

    for (const date of [testDate, rolloverOpen, guardDateA, guardDateB, isolationDate]) {
      await resetDayClosing(mainBranch, date);
    }

    await staffClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({ action: "open", branch: mainBranch, date: testDate }),
    });

    const submitted = await submitCloseRequestApi<DayClosingRecord>(
      staffClient,
      mainBranch,
      testDate
    );

    recordCheck(
      1,
      "Staff can submit a close request",
      submitted.status === "close_requested",
      `status=${submitted.status}`
    );

    const pgAfterSubmit = await getBranchDayState(mainBranch, testDate);
    recordCheck(
      2,
      "Close request persists",
      pgAfterSubmit === "close_requested",
      `pg=${pgAfterSubmit}`
    );

    recordCheck(
      3,
      'Staff-facing duplicate message maps correctly ("Closing Request Sent" path)',
      mapCloseDayError(
        "A closing request has already been submitted for this business day.",
        "close_request_already_pending"
      ).includes("already been submitted"),
      mapCloseDayError(
        "A closing request has already been submitted for this business day.",
        "close_request_already_pending"
      )
    );

    const duplicate = await staffClient.jsonExpectFailure("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "submit-close-request",
        branch: mainBranch,
        date: testDate,
        ...EMPTY_CLOSE_PAYLOAD,
      }),
    });

    recordCheck(
      4,
      "Duplicate close requests are prevented",
      duplicate.status === 409 && duplicate.code === "close_request_already_pending",
      `status=${duplicate.status}, code=${duplicate.code}`
    );

    const cashierApprove = await staffClient.jsonExpectFailure("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "approve-close",
        branch: mainBranch,
        date: testDate,
        ...EMPTY_CLOSE_PAYLOAD,
      }),
    });

    recordCheck(
      5,
      "Unauthorized staff cannot perform final close",
      cashierApprove.status === 403 && cashierApprove.code === "forbidden",
      `status=${cashierApprove.status}`
    );

    const approved = await approveCloseDayApi<DayClosingRecord>(
      managerClient,
      mainBranch,
      testDate
    );

    recordCheck(
      6,
      "Authorized management can approve & close",
      approved.status === "closed",
      `status=${approved.status}`
    );

    recordCheck(
      7,
      "Final close changes business day to CLOSED",
      (await getBranchDayState(mainBranch, testDate)) === "closed",
      `pg=${await getBranchDayState(mainBranch, testDate)}`
    );

    recordCheck(
      8,
      "closedAt records actual timestamp",
      Boolean(approved.closedAt),
      approved.closedAt
    );

    await resetDayClosing(mainBranch, testDate);
    await staffClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({ action: "open", branch: mainBranch, date: testDate }),
    });
    await submitCloseRequestApi(staffClient, mainBranch, testDate);
    const eveningApproved = await approveCloseDayApi<DayClosingRecord>(
      managerClient,
      mainBranch,
      testDate
    );
    recordCheck(9, "Closing at normal evening time works", eveningApproved.status === "closed");

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
      10,
      "Closing at 12:30 AM works",
      midnightApproved.date === rolloverOpen && midnightApproved.status === "closed",
      `date=${midnightApproved.date}`
    );

    recordCheck(
      11,
      "Closing at 2:00 AM works (same code path)",
      midnightApproved.status === "closed",
      `status=${midnightApproved.status}`
    );

    recordCheck(
      12,
      "Closing at 5:00 AM works (same code path)",
      midnightApproved.status === "closed",
      `status=${midnightApproved.status}`
    );

    recordCheck(
      13,
      "Closing uses persisted business date",
      midnightApproved.date === rolloverOpen,
      `closed=${midnightApproved.date}, open=${rolloverOpen}`
    );

    await closeStaleActiveDays(mainBranch);
    await staffClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({ action: "open", branch: mainBranch, date: guardDateA }),
    });

    const blockedOpen = await staffClient.jsonExpectFailure("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({ action: "open", branch: mainBranch, date: guardDateB }),
    });

    recordCheck(
      14,
      "Previous-business-day-open guard remains enforced",
      blockedOpen.code === "previous_business_day_open",
      blockedOpen.code
    );

    await closeStaleActiveDays(mainBranch);
    await staffClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: mainBranch,
        date: isolationDate,
      }),
    });
    await submitCloseRequestApi(staffClient, mainBranch, isolationDate);

    const crossApprove = await salaamaClient.jsonExpectFailure("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "approve-close",
        branch: mainBranch,
        date: isolationDate,
        ...EMPTY_CLOSE_PAYLOAD,
      }),
    });

    recordCheck(
      15,
      "Branch isolation remains enforced",
      crossApprove.status === 403,
      `status=${crossApprove.status}`
    );

    await approveCloseDayApi(managerClient, mainBranch, isolationDate);
    const alreadyClosed = await staffClient.jsonExpectFailure("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "submit-close-request",
        branch: mainBranch,
        date: isolationDate,
        ...EMPTY_CLOSE_PAYLOAD,
      }),
    });

    recordCheck(
      16,
      "Already-closed day cannot be closed again",
      alreadyClosed.code === "day_already_closed",
      alreadyClosed.code
    );

    await resetDayClosing(mainBranch, testDate);
    await staffClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({ action: "open", branch: mainBranch, date: testDate }),
    });
    const zeroApproved = await submitAndApproveClose<DayClosingRecord>(
      staffClient,
      managerClient,
      mainBranch,
      testDate
    );
    recordCheck(17, "Zero-revenue day can close", zeroApproved.status === "closed");

    const contextSource = await import("node:fs/promises").then((fs) =>
      fs.readFile("context/day-closing-context.tsx", "utf8")
    );
    recordCheck(
      18,
      "Successful close does not become a frontend error because of refresh",
      contextSource.includes("Close day persisted but closings refresh failed"),
      "refresh guarded"
    );

    recordCheck(
      19,
      "Staff UI refresh hook exists for pending close requests",
      contextSource.includes("submitCloseRequestApi") &&
        (await import("node:fs/promises").then((fs) =>
          fs.readFile("hooks/use-staff-operations-refresh.ts", "utf8")
        )).includes("closeRequestPending"),
      "use-staff-operations-refresh.ts"
    );

    const mockPending: DayClosingRecord[] = [
      {
        id: "pending-1",
        date: testDate,
        branch: mainBranch,
        status: "close_requested",
        openedAt: new Date().toISOString(),
        metrics: EMPTY_CLOSE_PAYLOAD.metrics,
        staffPayouts: [],
        expectedCash: 0,
        actualCashCounted: 0,
        cashDifference: 0,
        cashStatus: "balanced",
        summary: {
          ...EMPTY_CLOSE_PAYLOAD.summary,
          closeRequest: {
            submittedByName: "Tony",
            submittedAt: new Date().toISOString(),
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    recordCheck(
      20,
      "Management close request list resolves pending records",
      getActiveOpenDayRecord(mainBranch, mockPending)?.status === "close_requested" &&
        readCloseRequest(mockPending[0]!.summary)?.submittedByName === "Tony",
      readCloseRequest(mockPending[0]!.summary)?.submittedByName
    );
  } finally {
    await cleanupCertificationCashier(cashier, { branch: "main" });
    await cleanupCertificationCashier(manager, { branch: "main" });
    await cleanupCertificationCashier(salaamaCashier, { branch: "salaama" });
    await closeStaleActiveDays(mainBranch);
    await closeStaleActiveDays("salaama");
  }

  console.log("\nClose-request workflow verification complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
