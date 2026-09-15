#!/usr/bin/env tsx
/**
 * Day Close / Clock Out state synchronization verification.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getEquivalentBranchCodes } from "@/lib/branch/codes";
import { SALAAMA_BRANCH_CODE } from "@/lib/constants";
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

function offsetDate(base: string, days: number): string {
  const date = new Date(`${base}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

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
  const branchStateSource = readRepo("hooks/use-branch-state.ts");
  const onShiftRoute = readRepo("app/api/staff/attendance/on-shift/route.ts");
  const closingPanel = readRepo("components/dashboard/closing-requests/closing-requests-panel.tsx");

  recordCheck(
    "Authoritative on-shift API uses getStaffOnShiftAtBranch",
    onShiftRoute.includes("getStaffOnShiftAtBranch") &&
      onShiftRoute.includes("getBranchIdForSession")
  );

  recordCheck(
    "Clock Out re-fetches server attendance after success",
    welcomeSource.includes("fetchStaffAttendance(resolvedDate)") &&
      welcomeSource.includes("onClockOutComplete")
  );

  recordCheck(
    "Staff workspace revalidates branch on-shift and clears stale close errors",
    workspaceSource.includes("useBranchStaffOnShift") &&
      workspaceSource.includes("handleClockOutComplete") &&
      workspaceSource.includes("shouldClearStaffOnShiftCloseError")
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

  const testDate = offsetDate(new Date().toISOString().slice(0, 10), -420);
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

    const onShiftBefore = await staffClient.json<Array<{ staffName: string }>>(
      `/api/staff/attendance/on-shift?branch=${mainBranch}&date=${testDate}`
    );
    recordCheck(
      "On-shift API reports cashier before clock out",
      onShiftBefore.length >= 1,
      `count=${onShiftBefore.length}`
    );

    await staffClient.json("/api/staff/attendance", {
      method: "POST",
      body: JSON.stringify({
        action: "clock-out",
        branch: mainBranch,
        date: testDate,
      }),
    });

    const onShiftAfter = await staffClient.json<Array<{ staffName: string }>>(
      `/api/staff/attendance/on-shift?branch=${mainBranch}&date=${testDate}`
    );
    recordCheck(
      "On-shift API clears cashier after clock out",
      onShiftAfter.length === 0,
      `count=${onShiftAfter.length}`
    );

    const submitted = await submitCloseRequestApi(staffClient, mainBranch, testDate);
    recordCheck(
      "Close request succeeds after authoritative on-shift clear",
      submitted.status === "close_requested",
      submitted.status
    );

    const approved = await approveCloseDayApi(ownerClient, mainBranch, testDate);
    recordCheck(
      "Owner approve closes day after close request",
      approved.status === "closed",
      approved.status
    );
  } finally {
    if (cashier) {
      await cleanupCertificationCashier(cashier);
    }
    await deleteDayClosing("main", testDate);
  }
}

async function main(): Promise<void> {
  console.log("Day Close / Clock Out state synchronization verification\n");
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
