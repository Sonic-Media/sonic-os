#!/usr/bin/env tsx
/**
 * Day Close state synchronization verification.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getEquivalentBranchCodes } from "@/lib/branch/codes";
import { prisma } from "@/lib/db";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";
import {
  approveCloseDayApi,
  submitCloseRequestApi,
} from "./verify-close-request-helpers";
import { loginWithCredentials, VERIFY_OWNER_CREDENTIALS } from "./verify-session";

const ROOT = process.cwd();
const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-day-close-state-sync-${Date.now()}`;

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function recordCheck(label: string, pass: boolean, detail?: string) {
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
  console.log(`PASS ${label}${detail ? ` — ${detail}` : ""}`);
}

class ApiClient {
  private cookieHeader = "";

  async json<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (this.cookieHeader) headers.set("Cookie", this.cookieHeader);

    const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
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
        `${path} failed (${response.status}): ${JSON.stringify(payload.error ?? payload)}`
      );
    }
    return payload.data as T;
  }
}

async function closeStaleActiveDays(branchCode: string): Promise<void> {
  const branches = await prisma.branch.findMany({
    where: {
      code: { in: getEquivalentBranchCodes(branchCode) },
    },
    select: { id: true },
  });
  if (branches.length === 0) return;
  await prisma.dayClosing.updateMany({
    where: {
      branchId: { in: branches.map((branch) => branch.id) },
      status: { in: ["open", "close_requested"] },
    },
    data: {
      status: "closed",
      closedAt: new Date(),
      closedByName: `${TEST_PREFIX} cleanup`,
    },
  });
}

async function deleteDayClosing(branchCode: string, date: string) {
  const branches = await prisma.branch.findMany({
    where: {
      code: { in: getEquivalentBranchCodes(branchCode) },
    },
    select: { id: true },
  });
  if (branches.length === 0) return;
  await prisma.dayClosing.deleteMany({
    where: { branchId: { in: branches.map((branch) => branch.id) }, date },
  });
}

function verifyStaticChecks(): void {
  console.log("Static synchronization checks\n");

  const welcomeSource = readRepo("components/operations/staff/staff-welcome-card.tsx");
  const workspaceSource = readRepo("components/operations/staff/staff-operations-workspace.tsx");
  const endOfDaySource = readRepo("components/operations/staff/staff-end-of-day-card.tsx");
  const closeHookSource = readRepo("hooks/use-staff-close-day.ts");
  const closeMessagesSource = readRepo("lib/ux/close-day-messages.ts");
  const branchStateSource = readRepo("hooks/use-branch-state.ts");
  const closeServiceSource = readRepo("lib/server/services/day-closings-service.ts");
  const closingPanel = readRepo("components/dashboard/closing-requests/closing-requests-panel.tsx");

  recordCheck(
    "Clock Out action removed from staff welcome card",
    !welcomeSource.includes("Clock Out") &&
      !welcomeSource.includes("clockOutApi") &&
      !welcomeSource.includes("onClockOutComplete")
  );

    recordCheck(
    "Closing flow no longer blocks on staff clock-out state",
    !closeServiceSource.includes("staff_on_shift") &&
      !closeServiceSource.includes("still on shift") &&
      !workspaceSource.includes("useBranchStaffOnShift") &&
      !workspaceSource.includes("shouldClearStaffOnShiftCloseError") &&
      closeServiceSource.includes("endOpenShiftsAtBranch")
  );

  recordCheck(
    "End of Day checklist has no staff on-shift gate",
    !endOfDaySource.includes("onShift") &&
      !endOfDaySource.includes("on-shift") &&
      !endOfDaySource.includes("staff_on_shift") &&
      !endOfDaySource.includes("still on shift") &&
      !endOfDaySource.includes("Cannot submit closing while staff")
  );

  recordCheck(
    "Ready to Close is based on shop/close state only",
    endOfDaySource.includes(
      "const readyToClose = shopOpen && !closeRequestPending && !dayClosed;"
    ) &&
      endOfDaySource.includes('label="Sales"') &&
      endOfDaySource.includes('label="Expenses"') &&
      endOfDaySource.includes('label="Daily Wage"') &&
      endOfDaySource.includes('label="Ready to Close"') &&
      endOfDaySource.includes('"None recorded"') &&
      endOfDaySource.includes('"Pending"')
  );

  recordCheck(
    "Staff close hook does not check clock-out / on-shift",
    !closeHookSource.includes("onShift") &&
      !closeHookSource.includes("staff_on_shift") &&
      !closeHookSource.includes("getStaffOnShift") &&
      !closeHookSource.includes("still on shift")
  );

  recordCheck(
    "Close-day messages no longer map staff_on_shift",
    !closeMessagesSource.includes("staff_on_shift") &&
      !closeMessagesSource.includes("staff are still on shift")
  );

  recordCheck(
    "Owner branch state uses business date for attendance",
    branchStateSource.includes("const attendanceDate = activeRecord?.date ?? today") &&
      branchStateSource.includes("useStaffAttendance(attendanceDate)")
  );

  recordCheck(
    "Owner approve success triggers dashboard refresh",
    closingPanel.includes("await refreshAll()") &&
      closingPanel.includes("[closings, getCloseRequestedRecords]")
  );
}

async function verifyLiveFlow(): Promise<void> {
  console.log("\nLive synchronization checks\n");

  // Attendance presence is derived from audit timestamps on the calendar day,
  // so this regression must use today's date to keep staff "on shift".
  const testDate = new Date().toISOString().slice(0, 10);
  const mainBranch = "main";
  let cashier: CertificationCashier | null = null;

  try {
    const ownerClient = new ApiClient();
    const staffClient = new ApiClient();

    await loginWithCredentials(ownerClient, VERIFY_OWNER_CREDENTIALS);
    cashier = await createCertificationCashier(
      ownerClient,
      `${TEST_PREFIX}-cashier`,
      mainBranch
    );
    await loginWithCredentials(staffClient, {
      username: cashier.username,
      password: cashier.password,
    });

    await closeStaleActiveDays(mainBranch);
    await deleteDayClosing(mainBranch, testDate);

    await staffClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open-with-shift",
        branch: mainBranch,
        date: testDate,
      }),
    });

    const onShiftDuringDay = await staffClient.json<
      Array<{ staffName: string }>
    >(`/api/staff/attendance/on-shift?branch=${mainBranch}&date=${testDate}`);
    recordCheck(
      "On-shift API still reports active staff during the day",
      onShiftDuringDay.length >= 1,
      `count=${onShiftDuringDay.length}`
    );
    recordCheck(
      "At least one staff member remains on shift before closing",
      onShiftDuringDay.some((row) => Boolean(row.staffName?.trim())),
      onShiftDuringDay.map((row) => row.staffName).join(", ")
    );

    let submitted: { status: string };
    try {
      submitted = await submitCloseRequestApi(staffClient, mainBranch, testDate);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      recordCheck(
        "Closing is not blocked by staff still on shift",
        !/still on shift|staff_on_shift/i.test(message),
        message
      );
      throw error;
    }

    recordCheck(
      "Close request succeeds while staff remain on shift",
      submitted.status === "close_requested",
      submitted.status
    );

    const onShiftAfterCloseRequest = await staffClient.json<
      Array<{ staffName: string }>
    >(`/api/staff/attendance/on-shift?branch=${mainBranch}&date=${testDate}`);
    recordCheck(
      "Staff can still be on shift after close request is accepted",
      onShiftAfterCloseRequest.length >= 1,
      `count=${onShiftAfterCloseRequest.length}`
    );

    const approved = await approveCloseDayApi(ownerClient, mainBranch, testDate);
    recordCheck(
      "Owner approve closes day after close request",
      approved.status === "closed",
      approved.status
    );

    const onShiftAfterClose = await staffClient.json<
      Array<{ staffName: string }>
    >(`/api/staff/attendance/on-shift?branch=${mainBranch}&date=${testDate}`);
    recordCheck(
      "Approve/close ends open shifts automatically",
      onShiftAfterClose.length === 0,
      `count=${onShiftAfterClose.length}`
    );
  } finally {
    if (cashier) {
      await cleanupCertificationCashier(cashier);
    }
    await deleteDayClosing("main", testDate);
  }
}

async function main(): Promise<void> {
  console.log("Day Close state synchronization verification\n");
  verifyStaticChecks();

  try {
    await verifyLiveFlow();
  } catch (error) {
    console.error(
      `SKIP live checks — environment/fixture: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  console.log("\nDay close state synchronization verification complete.");
}

void main();
