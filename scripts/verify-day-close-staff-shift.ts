#!/usr/bin/env tsx
/**
 * Day close / staff-on-shift live workflow verification.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";
import {
  EMPTY_CLOSE_PAYLOAD,
  submitCloseRequestApi,
} from "./verify-close-request-helpers";
import { loginWithCredentials, VERIFY_OWNER_CREDENTIALS } from "./verify-session";

const ROOT = process.cwd();
const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-day-close-shift-${Date.now()}`;

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

  async expectFailure(
    path: string,
    options: RequestInit,
    expectedStatus: number,
    expectedCode?: string
  ) {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (this.cookieHeader) headers.set("Cookie", this.cookieHeader);
    const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    const payload = (await response.json()) as {
      error?: { message?: string; code?: string };
    };
    assert.equal(response.status, expectedStatus, JSON.stringify(payload.error));
    if (expectedCode) {
      assert.equal(payload.error?.code, expectedCode);
    }
    return payload.error;
  }
}

async function deleteDayClosing(branchCode: string, date: string) {
  const branches = await prisma.branch.findMany({
    where: { code: { in: [branchCode, branchCode === "branch2" ? "salaama" : branchCode] } },
    select: { id: true },
  });
  if (branches.length === 0) return;
  await prisma.dayClosing.deleteMany({
    where: {
      branchId: { in: branches.map((branch) => branch.id) },
      date,
    },
  });
}

async function main() {
  console.log("Day close / staff-on-shift verification\n");

  const workspace = readRepo("components/operations/staff/staff-operations-workspace.tsx");
  const eodCard = readRepo("components/operations/staff/staff-end-of-day-card.tsx");
  const auditLib = readRepo("lib/staff/audit.ts");

  recordCheck(
    "UI uses server on-shift preflight hook",
    workspace.includes("useBranchStaffOnShift") &&
      workspace.includes("staffOnShift={staffOnShift}")
  );
  recordCheck(
    "End of Day checklist includes Staff On Shift",
    eodCard.includes('label="Staff On Shift"')
  );
  recordCheck(
    "Clock-out merge refreshes attendance subscribers",
    auditLib.includes("mergeStaffAuditRecords") &&
      auditLib.includes("AUDIT_LOG_UPDATED_EVENT")
  );
  recordCheck(
    "Stale staff-on-shift error clears when server list is empty",
    eodCard.includes('closeError.includes("still on shift")') &&
      eodCard.includes("!staffStillOnShift")
  );

  const owner = new ApiClient();
  await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);

  const businessDate = new Date().toISOString().slice(0, 10);
  const mainBranch = "main";
  const salaamaBranch = "branch2";

  let fazilLike: CertificationCashier | null = null;
  let tonyLike: CertificationCashier | null = null;

  try {
    await deleteDayClosing(mainBranch, businessDate);
    await deleteDayClosing(salaamaBranch, businessDate);

    fazilLike = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-fazil`,
      mainBranch
    );
    tonyLike = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-tony`,
      mainBranch
    );

    const fazilClient = new ApiClient();
    await loginWithCredentials(fazilClient, {
      username: fazilLike.username,
      password: fazilLike.password,
    });

    await fazilClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open-with-shift",
        branch: mainBranch,
        date: businessDate,
      }),
    });

    const onShiftA = await fazilClient.json<
      Array<{ staffId: string; staffName: string }>
    >(
      `/api/staff/attendance/on-shift?branch=${mainBranch}&date=${businessDate}`
    );
    recordCheck(
      "A: Active staff appears in server on-shift preflight",
      onShiftA.some((member) => member.staffId === fazilLike!.staffId),
      onShiftA.map((m) => m.staffName).join(", ")
    );

    const blocked = await fazilClient.expectFailure(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "submit-close-request",
          branch: mainBranch,
          date: businessDate,
          ...EMPTY_CLOSE_PAYLOAD,
        }),
      },
      409,
      "staff_on_shift"
    );
    recordCheck(
      "A: Submit for closing blocked while staff on shift",
      blocked?.message?.includes(onShiftA[0]!.staffName) ?? false,
      blocked?.message
    );

    await fazilClient.json("/api/staff/attendance", {
      method: "POST",
      body: JSON.stringify({
        action: "clock-out",
        branch: mainBranch,
        date: businessDate,
      }),
    });

    const onShiftB = await fazilClient.json<
      Array<{ staffId: string; staffName: string }>
    >(
      `/api/staff/attendance/on-shift?branch=${mainBranch}&date=${businessDate}`
    );
    recordCheck(
      "B: After clock-out server on-shift list is empty",
      onShiftB.length === 0
    );

    const submitted = await submitCloseRequestApi<{ status: string }>(
      fazilClient,
      mainBranch,
      businessDate
    );
    recordCheck(
      "B: Submit for closing succeeds after clock-out",
      submitted.status === "close_requested",
      submitted.status
    );

    await deleteDayClosing(mainBranch, businessDate);
    await fazilClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open-with-shift",
        branch: mainBranch,
        date: businessDate,
      }),
    });

    const tonyClient = new ApiClient();
    await loginWithCredentials(tonyClient, {
      username: tonyLike.username,
      password: tonyLike.password,
    });
    await tonyClient.json("/api/staff/attendance", {
      method: "POST",
      body: JSON.stringify({
        action: "clock-in",
        branch: mainBranch,
        date: businessDate,
      }),
    });

    await fazilClient.json("/api/staff/attendance", {
      method: "POST",
      body: JSON.stringify({
        action: "clock-out",
        branch: mainBranch,
        date: businessDate,
      }),
    });

    const onShiftC = await tonyClient.json<
      Array<{ staffId: string; staffName: string }>
    >(
      `/api/staff/attendance/on-shift?branch=${mainBranch}&date=${businessDate}`
    );
    recordCheck(
      "C: Only remaining active staff identified",
      onShiftC.length === 1 && onShiftC[0]?.staffId === tonyLike.staffId,
      onShiftC.map((m) => m.staffName).join(", ")
    );

    await tonyClient.json("/api/staff/attendance", {
      method: "POST",
      body: JSON.stringify({
        action: "clock-out",
        branch: mainBranch,
        date: businessDate,
      }),
    });

    const salaamaStaff = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-salaama`,
      salaamaBranch
    );
    const salaamaClient = new ApiClient();
    await loginWithCredentials(salaamaClient, {
      username: salaamaStaff.username,
      password: salaamaStaff.password,
    });
    await deleteDayClosing(salaamaBranch, businessDate);
    await salaamaClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open-with-shift",
        branch: salaamaBranch,
        date: businessDate,
      }),
    });

    const kansangaOnShift = await tonyClient.json<
      Array<{ staffId: string; staffName: string }>
    >(
      `/api/staff/attendance/on-shift?branch=${mainBranch}&date=${businessDate}`
    );
    recordCheck(
      "D: Salaama active shift does not block Kansanga preflight",
      kansangaOnShift.every(
        (member) => member.staffId !== salaamaStaff.staffId
      )
    );

    const historicalDate = "2019-03-01";
    const branchRow = await prisma.branch.findFirst({
      where: { code: mainBranch },
      select: { id: true },
    });
    if (branchRow && fazilLike) {
      await prisma.auditLogEntry.create({
        data: {
          userId: fazilLike.staffId,
          userName: `${TEST_PREFIX}-historical`,
          role: "cashier",
          branchCode: mainBranch,
          action: "Start Shift",
          module: "operations",
          timestamp: new Date(`${historicalDate}T08:00:00.000Z`),
        },
      });
    }
    const historicalOnShift = await fazilClient.json<
      Array<{ staffId: string; staffName: string }>
    >(
      `/api/staff/attendance/on-shift?branch=${mainBranch}&date=${businessDate}`
    );
    recordCheck(
      "E: Historical shift audit does not block current business date",
      historicalOnShift.length === 0,
      `currentOnShift=${historicalOnShift.length}`
    );

    console.log("\nAll day close / staff-on-shift checks passed.");
  } finally {
    for (const cashier of [fazilLike, tonyLike]) {
      if (cashier) {
        await cleanupCertificationCashier(cashier, {
          branch: mainBranch,
          date: businessDate,
        }).catch(() => undefined);
      }
    }
    await deleteDayClosing(mainBranch, businessDate);
    await deleteDayClosing(salaamaBranch, businessDate);
    await prisma.auditLogEntry.deleteMany({
      where: { userName: { contains: TEST_PREFIX } },
    }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
