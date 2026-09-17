#!/usr/bin/env tsx
/**
 * Shop-session ↔ shift source-of-truth verification.
 * Open Shop → on shift; Close/Approve → off shift; no Clock In/Out UI gate.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadEnvFiles } from "../lib/env/load-env";
import { prisma } from "../lib/db";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";
import {
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";

loadEnvFiles();

if (/neon/i.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("Refusing to run shop-session shift verification against Neon.");
}

const ROOT = process.cwd();
const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TODAY = new Date().toISOString().slice(0, 10);
const TEST_PREFIX = `verify-shop-shift-${Date.now()}`;

function readRepo(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function recordCheck(label: string, pass: boolean, detail = "") {
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
  console.log(`PASS ${label}${detail ? ` — ${detail}` : ""}`);
}

class ApiClient {
  private cookieHeader = "";

  async json<T>(apiPath: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (this.cookieHeader) {
      headers.set("Cookie", this.cookieHeader);
    }

    const response = await fetch(`${BASE_URL}${apiPath}`, {
      ...options,
      headers,
    });

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
      error?: unknown;
    };

    if (!response.ok) {
      throw new Error(
        `${apiPath} failed (${response.status}): ${JSON.stringify(payload.error ?? payload)}`
      );
    }

    return payload.data as T;
  }
}

async function getBranchId(code: string): Promise<string | null> {
  const row = await prisma.branch.findFirst({
    where: { code },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function deleteDayClosing(branchCode: string, date: string) {
  const branchId = await getBranchId(branchCode);
  if (!branchId) return;
  await prisma.dayClosing.deleteMany({ where: { branchId, date } });
}

async function closeStaleActiveDays(branchCode: string) {
  const branchId = await getBranchId(branchCode);
  if (!branchId) return;
  await prisma.dayClosing.updateMany({
    where: {
      branchId,
      status: { in: ["open", "close_requested"] },
    },
    data: {
      status: "closed",
      closedAt: new Date(),
      closedByName: `${TEST_PREFIX} cleanup`,
    },
  });
}

function verifyStaticGuards() {
  const todayPage = readRepo("app/operations/today/page.tsx");
  const openShop = readRepo("components/operations/open-shop-page.tsx");
  const dayClosingCtx = readRepo("context/day-closing-context.tsx");
  const attendanceSvc = readRepo("lib/server/services/attendance-service.ts");
  const dayClosingSvc = readRepo("lib/server/services/day-closings-service.ts");
  const auditCtx = readRepo("context/audit-log-context.tsx");

  recordCheck(
    "Today page has no Clock In gate",
    !todayPage.includes("showClockInGate") &&
      !todayPage.includes('mode="clock-in"') &&
      todayPage.includes("closingLoaded")
  );

  recordCheck(
    "Open Shop page has no Clock In button/workflow",
    openShop.includes("Open Shop") &&
      !openShop.includes("Clock In") &&
      !openShop.includes("clockInApi")
  );

  recordCheck(
    "Day closing context gates loaded state on hydrated user",
    dayClosingCtx.includes("hydratedUserId") &&
      dayClosingCtx.includes("closingsResolved")
  );

  recordCheck(
    "Start Shift stamps business-date recordId",
    attendanceSvc.includes("recordId: parsed.date") &&
      attendanceSvc.includes("END_SHIFT")
  );

  recordCheck(
    "Approve/close ends open shifts without blocking",
    dayClosingSvc.includes("endOpenShiftsAtBranch") &&
      !dayClosingSvc.includes("staff_on_shift")
  );

  recordCheck(
    "Audit log context does not wipe staff attendance cache",
    !auditCtx.includes("clearStaffAuditClientCaches()")
  );
}

async function submitCloseRequest(
  client: ApiClient,
  branch: string,
  date: string
) {
  return client.json<{ status: string }>("/api/day-closings", {
    method: "POST",
    body: JSON.stringify({
      action: "submit-close-request",
      branch,
      date,
      metrics: {
        movieRevenue: 0,
        accessorySales: 0,
        totalSales: 0,
        totalExpenses: 0,
        staffPayouts: 0,
      },
      staffPayouts: [],
      expectedCash: 0,
      actualCashCounted: 0,
      cashDifference: 0,
      cashStatus: "balanced",
      summary: {
        sales: 0,
        expenses: 0,
        net: 0,
        movieRevenue: 0,
        accessorySales: 0,
      },
    }),
  });
}

async function approveClose(
  client: ApiClient,
  branch: string,
  date: string
) {
  return client.json<{ status: string }>("/api/day-closings", {
    method: "POST",
    body: JSON.stringify({
      action: "approve-and-close",
      branch,
      date,
      metrics: {
        movieRevenue: 0,
        accessorySales: 0,
        totalSales: 0,
        totalExpenses: 0,
        staffPayouts: 0,
      },
      staffPayouts: [],
      expectedCash: 0,
      actualCashCounted: 0,
      cashDifference: 0,
      cashStatus: "balanced",
      summary: {
        sales: 0,
        expenses: 0,
        net: 0,
        movieRevenue: 0,
        accessorySales: 0,
      },
    }),
  });
}

async function verifyLiveScenarios() {
  const owner = new ApiClient();
  await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);

  const mainBranch = "main";
  const salaamaBranch = "salaama";
  let tony: CertificationCashier | null = null;
  let fazil: CertificationCashier | null = null;

  try {
    await closeStaleActiveDays(mainBranch);
    await closeStaleActiveDays(salaamaBranch);
    await deleteDayClosing(mainBranch, TODAY);
    await deleteDayClosing(salaamaBranch, TODAY);

    // A. Shop closed → 0 on shift
    const closedOnShift = await owner.json<Array<{ staffId: string }>>(
      `/api/staff/attendance/on-shift?branch=${mainBranch}&date=${TODAY}`
    );
    recordCheck(
      "A. Closed shop has no active shifts",
      closedOnShift.length === 0,
      `count=${closedOnShift.length}`
    );

    tony = await createCertificationCashier(owner, `${TEST_PREFIX}-tony`, mainBranch);
    const tonyClient = new ApiClient();
    await loginWithCredentials(tonyClient, {
      username: tony.username,
      password: tony.password,
    });

    // B. Open Shop → Tony on shift
    const openResult = await tonyClient.json<{
      dayClosing: { status: string; branch: string; date: string };
      attendance: { action: string; userId: string; recordId?: string };
    }>("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open-with-shift",
        branch: mainBranch,
        date: TODAY,
      }),
    });

    recordCheck(
      "B. Open Shop creates open day + Start Shift",
      openResult.dayClosing.status === "open" &&
        openResult.attendance.action === "Start Shift" &&
        openResult.attendance.userId === tony.staffId &&
        openResult.attendance.recordId === TODAY
    );

    const onShiftOpen = await tonyClient.json<
      Array<{ staffId: string; staffName: string }>
    >(`/api/staff/attendance/on-shift?branch=${mainBranch}&date=${TODAY}`);
    recordCheck(
      "B. Tony is on shift after Open Shop",
      onShiftOpen.some((row) => row.staffId === tony!.staffId),
      onShiftOpen.map((r) => r.staffName).join(", ")
    );

    // C. Re-fetch (simulates re-login hydration of authoritative APIs)
    const closingsAfterOpen = await tonyClient.json<
      Array<{ branch: string; date: string; status: string }>
    >("/api/day-closings");
    const active = closingsAfterOpen.find(
      (row) =>
        row.branch === mainBranch &&
        row.date === TODAY &&
        (row.status === "open" || row.status === "close_requested")
    );
    recordCheck(
      "C. Re-fetch resolves Shop Open without stale Ready-to-Open",
      Boolean(active && active.status === "open")
    );
    const onShiftRefetch = await tonyClient.json<
      Array<{ staffId: string }>
    >(`/api/staff/attendance/on-shift?branch=${mainBranch}&date=${TODAY}`);
    recordCheck(
      "C. Re-fetch keeps Tony on shift",
      onShiftRefetch.some((row) => row.staffId === tony!.staffId)
    );

    // E. Branch isolation — Fazil opens Salaama independently
    fazil = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-fazil`,
      salaamaBranch
    );
    const fazilClient = new ApiClient();
    await loginWithCredentials(fazilClient, {
      username: fazil.username,
      password: fazil.password,
    });

    await fazilClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open-with-shift",
        branch: salaamaBranch,
        date: TODAY,
      }),
    });

    const mainShift = await owner.json<Array<{ staffId: string; staffName: string }>>(
      `/api/staff/attendance/on-shift?branch=${mainBranch}&date=${TODAY}`
    );
    const salaamaShift = await owner.json<
      Array<{ staffId: string; staffName: string }>
    >(`/api/staff/attendance/on-shift?branch=${salaamaBranch}&date=${TODAY}`);

    recordCheck(
      "E. Tony only on Kansanga (main)",
      mainShift.some((row) => row.staffId === tony!.staffId) &&
        !mainShift.some((row) => row.staffId === fazil!.staffId)
    );
    recordCheck(
      "E. Fazil only on Salaama",
      salaamaShift.some((row) => row.staffId === fazil!.staffId) &&
        !salaamaShift.some((row) => row.staffId === tony!.staffId)
    );

    // D. Close while on shift succeeds; ends shift
    await submitCloseRequest(tonyClient, mainBranch, TODAY);
    const approved = await approveClose(owner, mainBranch, TODAY);
    recordCheck("D. Close succeeds while staff were on shift", approved.status === "closed");

    const afterClose = await owner.json<Array<{ staffId: string }>>(
      `/api/staff/attendance/on-shift?branch=${mainBranch}&date=${TODAY}`
    );
    recordCheck(
      "D. Tony off shift after close",
      afterClose.length === 0,
      `count=${afterClose.length}`
    );

    const endShiftRows = await prisma.auditLogEntry.findMany({
      where: {
        userId: tony.staffId,
        action: "End Shift",
        recordId: TODAY,
      },
    });
    recordCheck(
      "D. End Shift audit preserved (historical)",
      endShiftRows.length >= 1,
      `rows=${endShiftRows.length}`
    );

    const startShiftRows = await prisma.auditLogEntry.findMany({
      where: {
        userId: tony.staffId,
        action: "Start Shift",
        recordId: TODAY,
      },
    });
    recordCheck(
      "D. Start Shift historical record intact",
      startShiftRows.length >= 1
    );
  } finally {
    if (tony) {
      await cleanupCertificationCashier(tony, { branch: mainBranch, date: TODAY });
    }
    if (fazil) {
      await cleanupCertificationCashier(fazil, {
        branch: salaamaBranch,
        date: TODAY,
      });
    }
    await deleteDayClosing(mainBranch, TODAY);
    await deleteDayClosing(salaamaBranch, TODAY);
  }
}

async function main() {
  console.log("Shop-session shift source-of-truth verification\n");
  verifyStaticGuards();
  await verifyLiveScenarios();
  console.log("\nPASS shop-session shift verification");
}

main()
  .catch((error) => {
    console.error("FAIL shop-session shift verification:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
