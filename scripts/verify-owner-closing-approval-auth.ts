#!/usr/bin/env tsx
/**
 * Owner closing-request approval authorization verification.
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
  approveCloseDayApi,
  EMPTY_CLOSE_PAYLOAD,
  submitCloseRequestApi,
} from "./verify-close-request-helpers";
import { getEquivalentBranchCodes } from "@/lib/branch/codes";
import { SALAAMA_BRANCH_CODE } from "@/lib/constants";
import { loginWithCredentials, VERIFY_OWNER_CREDENTIALS } from "./verify-session";

const ROOT = process.cwd();
const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-owner-approve-${Date.now()}`;
const businessDate = new Date().toISOString().slice(0, 10);

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
    assert.equal(response.status, expectedStatus);
    if (expectedCode) {
      assert.equal(payload.error?.code, expectedCode);
    }
    return payload.error;
  }
}

async function closeStaleActiveDays(branchCode: string): Promise<void> {
  const branches = await prisma.branch.findMany({
    where: { code: { in: getEquivalentBranchCodes(branchCode) } },
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
    where: { code: { in: getEquivalentBranchCodes(branchCode) } },
    select: { id: true },
  });
  if (branches.length === 0) return;
  await prisma.dayClosing.deleteMany({
    where: { branchId: { in: branches.map((b) => b.id) }, date },
  });
}

async function openAndSubmit(
  client: ApiClient,
  branch: string,
  date: string
): Promise<void> {
  await client.json("/api/day-closings", {
    method: "POST",
    body: JSON.stringify({ action: "open-with-shift", branch, date }),
  });
  try {
    await client.json("/api/staff/attendance", {
      method: "POST",
      body: JSON.stringify({ action: "clock-out", branch, date }),
    });
  } catch {
    // Historical business dates may not align with attendance audit timestamps.
  }
  await submitCloseRequestApi(client, branch, date);
}

async function main() {
  console.log("Owner closing approval authorization verification\n");

  recordCheck(
    "Fix allows owner management close sync only",
    readRepo("lib/day-closing/sync-daily-operation.ts").includes(
      "allowOwnerManagementClose: true"
    )
  );

  const owner = new ApiClient();
  await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);

  let kansangaCashier: CertificationCashier | null = null;
  let salaamaCashier: CertificationCashier | null = null;
  let staffCashier: CertificationCashier | null = null;

  try {
    kansangaCashier = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-k`,
      "main"
    );
    salaamaCashier = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-s`,
      SALAAMA_BRANCH_CODE
    );
    staffCashier = kansangaCashier;

    const kansangaStaff = new ApiClient();
    await loginWithCredentials(kansangaStaff, {
      username: kansangaCashier.username,
      password: kansangaCashier.password,
    });
    const salaamaStaff = new ApiClient();
    await loginWithCredentials(salaamaStaff, {
      username: salaamaCashier.username,
      password: salaamaCashier.password,
    });

    await closeStaleActiveDays("main");
    await closeStaleActiveDays(SALAAMA_BRANCH_CODE);
    await deleteDayClosing("main", businessDate);
    await deleteDayClosing(SALAAMA_BRANCH_CODE, businessDate);

    // E — staff submit
    await openAndSubmit(kansangaStaff, "main", businessDate);
    recordCheck("E: Staff submit close request", true);

    // A — owner approves Kansanga
    const approvedMain = await approveCloseDayApi<{ status: string }>(
      owner,
      "main",
      businessDate
    );
    recordCheck(
      "A: Owner approves Kansanga request",
      approvedMain.status === "closed",
      approvedMain.status
    );

    await deleteDayClosing(SALAAMA_BRANCH_CODE, businessDate);
    await openAndSubmit(salaamaStaff, SALAAMA_BRANCH_CODE, businessDate);

    // B — owner approves Salaama
    const approvedSalaama = await approveCloseDayApi<{ status: string }>(
      owner,
      SALAAMA_BRANCH_CODE,
      businessDate
    );
    recordCheck(
      "B: Owner approves Salaama request",
      approvedSalaama.status === "closed",
      approvedSalaama.status
    );

    // C/D — cross-view branch: owner approves using request branch, not UI branch
    const crossDate = offsetDate(businessDate, -3);
    await deleteDayClosing("main", crossDate);
    await openAndSubmit(kansangaStaff, "main", crossDate);
    const crossApproved = await approveCloseDayApi<{ status: string; branch: string }>(
      owner,
      "main",
      crossDate
    );
    recordCheck(
      "C/D: Owner approves request branch regardless of selected branch",
      crossApproved.status === "closed" && crossApproved.branch === "main",
      crossApproved.branch
    );

    // F — staff cannot approve
    const staffRejectDate = offsetDate(businessDate, -4);
    await deleteDayClosing("main", staffRejectDate);
    await openAndSubmit(kansangaStaff, "main", staffRejectDate);
    const staffReject = await kansangaStaff.expectFailure(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "approve-close",
          branch: "main",
          date: staffRejectDate,
          ...EMPTY_CLOSE_PAYLOAD,
        }),
      },
      403,
      "forbidden"
    );
    recordCheck(
      "F: Staff cannot approve closing request",
      staffReject?.message?.includes("approve") ?? false,
      staffReject?.message
    );

    // H — already closed
    const closedAgain = await owner.expectFailure(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "approve-close",
          branch: "main",
          date: crossDate,
          ...EMPTY_CLOSE_PAYLOAD,
        }),
      },
      409
    );
    recordCheck(
      "H: Already-closed request cannot be approved again",
      closedAgain?.code === "day_already_closed" ||
        closedAgain?.code === "close_request_not_pending",
      closedAgain?.code
    );

    // I — non-pending (open, not close_requested)
    await closeStaleActiveDays("main");
    const openOnlyDate = offsetDate(businessDate, 1);
    await deleteDayClosing("main", openOnlyDate);
    await kansangaStaff.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "main",
        date: openOnlyDate,
      }),
    });
    const notPending = await owner.expectFailure(
      "/api/day-closings",
      {
        method: "POST",
        body: JSON.stringify({
          action: "approve-close",
          branch: "main",
          date: openOnlyDate,
          ...EMPTY_CLOSE_PAYLOAD,
        }),
      },
      409,
      "close_request_not_pending"
    );
    recordCheck(
      "I: Non-pending open day cannot be approved",
      notPending?.code === "close_request_not_pending",
      notPending?.code
    );

    // Owner direct edit of today's operations still blocked
    const ownerEditBlocked = await owner.expectFailure(
      "/api/daily-operations",
      {
        method: "POST",
        body: JSON.stringify({
          date: businessDate,
          branch: "main",
          sales: 1000,
          expenses: [],
          status: "draft",
        }),
      },
      403,
      "forbidden"
    );
    recordCheck(
      "Security: Owner still cannot edit today's operational records directly",
      ownerEditBlocked?.message?.includes("cannot edit today's operational") ?? false,
      ownerEditBlocked?.message
    );

    console.log("\nAll owner closing approval authorization checks passed.");
  } finally {
    for (const cashier of [kansangaCashier, salaamaCashier]) {
      if (cashier) {
        await cleanupCertificationCashier(cashier, {
          branch: cashier === salaamaCashier ? SALAAMA_BRANCH_CODE : "main",
          date: businessDate,
        }).catch(() => undefined);
      }
    }
    await deleteDayClosing("main", businessDate);
    await deleteDayClosing(SALAAMA_BRANCH_CODE, businessDate);
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
