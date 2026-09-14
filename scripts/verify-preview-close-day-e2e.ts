#!/usr/bin/env tsx
/**
 * Real-world Close Day E2E verification against a deployed or local instance.
 * Set VERIFY_BASE_URL to the Vercel Preview URL.
 * Set VERCEL_AUTOMATION_BYPASS_SECRET when Preview Deployment Protection is enabled.
 */
import "dotenv/config";
import { prisma } from "@/lib/db";
import { getBranchDayState } from "@/lib/server/services/day-closings-service";
import type { Branch } from "@/types";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";
import {
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";

const BASE_URL =
  process.env.VERIFY_BASE_URL ??
  "https://sonic-os-git-cursor-close-shop-ux-fix-b6e7-sonic9.vercel.app";
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
const TEST_PREFIX = `preview-close-e2e-${Date.now()}`;
const BRANCH: Branch = "main";

const EMPTY_CLOSE_PAYLOAD = {
  metrics: {
    todaySales: 80000,
    todayPurchases: 0,
    todayOperatingExpenses: 27000,
    todayInventoryInvestment: 0,
    todayStaffPaymentsRecorded: 10000,
    cashBeforeClosing: 43000,
  },
  staffPayouts: [] as unknown[],
  expectedCash: 43000,
  actualCashCounted: 43000,
  cashDifference: 0,
  cashStatus: "balanced" as const,
  summary: {
    sales: 80000,
    expenses: 27000,
    inventoryInvestment: 0,
    staffPayments: 10000,
    remainingCash: 43000,
    inventoryFund: 0,
    operatingFund: 43000,
  },
};

type ApiLog = {
  step: string;
  method: string;
  path: string;
  status: number;
  code?: string;
  message?: string;
  bodyPreview?: string;
};

const apiLogs: ApiLog[] = [];

function logStep(step: string, detail = "") {
  console.log(`\n[${step}]${detail ? ` ${detail}` : ""}`);
}

function recordCheck(name: string, passed: boolean, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`${name}${detail ? ` — ${detail}` : ""}`);
  }
}

class E2EClient {
  private cookieHeader = "";

  private headers(init?: HeadersInit): Headers {
    const headers = new Headers(init);
    headers.set("Content-Type", "application/json");
    if (this.cookieHeader) {
      headers.set("Cookie", this.cookieHeader);
    }
    if (BYPASS) {
      headers.set("x-vercel-protection-bypass", BYPASS);
    }
    return headers;
  }

  async request(path: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: this.headers(options.headers),
    });
  }

  async json<T>(
    step: string,
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await this.request(path, options);
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      this.cookieHeader = setCookie
        .split(",")
        .map((part) => part.split(";")[0]?.trim())
        .filter(Boolean)
        .join("; ");
    }

    const text = await response.text();
    let payload: { data?: T; error?: { message?: string; code?: string } } = {};
    try {
      payload = JSON.parse(text) as typeof payload;
    } catch {
      payload = {};
    }

    apiLogs.push({
      step,
      method: options.method ?? "GET",
      path,
      status: response.status,
      code: payload.error?.code,
      message: payload.error?.message,
      bodyPreview: text.slice(0, 300),
    });

    if (!response.ok) {
      throw new Error(
        `${step} failed (${response.status}): ${
          payload.error?.message ?? text.slice(0, 200)
        } [code=${payload.error?.code ?? "none"}]`
      );
    }

    return payload.data as T;
  }
}

async function resetDay(branch: Branch, date: string): Promise<void> {
  const branchRow = await prisma.branch.findFirst({ where: { code: branch } });
  if (!branchRow) return;
  await prisma.dayClosing.deleteMany({
    where: { branchId: branchRow.id, date },
  });
}

async function main() {
  console.log("=== Preview Close Day E2E Verification ===");
  console.log(`BASE_URL: ${BASE_URL}`);
  console.log(`Bypass secret: ${BYPASS ? "set" : "not set"}`);
  console.log(`Expected fix commit includes: 74c5c62`);

  logStep("0", "Probe deployment accessibility");
  const probe = await fetch(BASE_URL, {
    headers: BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {},
    redirect: "manual",
  });
  const probeBlocked =
    probe.status === 401 ||
    probe.status === 403 ||
    (probe.status >= 300 &&
      probe.status < 400 &&
      (probe.headers.get("location") ?? "").includes("vercel.com"));
  if (probeBlocked && !BYPASS) {
    console.log(
      "BLOCKED: Vercel Deployment Protection (SSO). Set VERCEL_AUTOMATION_BYPASS_SECRET to run against Preview."
    );
    process.exit(2);
  }
  recordCheck(
    "Deployment reachable (not SSO-blocked or bypass works)",
    !probeBlocked,
    `HTTP ${probe.status}`
  );

  const owner = new E2EClient();
  logStep("1", "Owner login (create staff only)");
  await owner.json("owner-login", "/api/auth/session", {
    method: "POST",
    body: JSON.stringify({
      action: "login",
      ...VERIFY_OWNER_CREDENTIALS,
    }),
  });

  const ownerBootstrap = {
    json: <T>(path: string, options?: RequestInit) =>
      owner.json<T>("bootstrap", path, options ?? {}),
  };
  const cashier = await createCertificationCashier(ownerBootstrap, TEST_PREFIX, BRANCH);
  const staff = new E2EClient();
  logStep("2", "Staff login");
  await staff.json("staff-login", "/api/auth/session", {
    method: "POST",
    body: JSON.stringify({
      action: "login",
      username: cashier.username,
      password: cashier.password,
    }),
  });

  const businessDate = `2018-08-24`;
  await resetDay(BRANCH, businessDate);

  logStep("3", "Open shop for business date");
  await staff.json("open-shop", "/api/day-closings", {
    method: "POST",
    body: JSON.stringify({
      action: "open-with-shift",
      branch: BRANCH,
      date: businessDate,
    }),
  });

  logStep("4", "Close business day (server syncs daily operation on close)");
  const closedAtBefore = Date.now();
  const closed = await staff.json<{
    date: string;
    status: string;
    branch: string;
    closedAt?: string;
  }>("close-day", "/api/day-closings", {
    method: "POST",
    body: JSON.stringify({
      branch: BRANCH,
      date: businessDate,
      closingNotes: `${TEST_PREFIX} closed`,
      ...EMPTY_CLOSE_PAYLOAD,
    }),
  });
  const closedAtAfter = Date.now();

  logStep("5", "Verify PostgreSQL state");
  const pgState = await getBranchDayState(BRANCH, businessDate);
  recordCheck("Business day status is closed in PostgreSQL", pgState === "closed", pgState);
  recordCheck(
    "Persisted business date matches open date",
    closed.date === businessDate,
    `api=${closed.date}`
  );
  recordCheck("Close API returned status closed", closed.status === "closed", closed.status);

  if (closed.closedAt) {
    const closedAtMs = new Date(closed.closedAt).getTime();
    recordCheck(
      "closedAt is actual wall-clock timestamp",
      closedAtMs >= closedAtBefore && closedAtMs <= closedAtAfter + 5000,
      closed.closedAt
    );
  } else {
    recordCheck("closedAt recorded", false, "missing closedAt");
  }

  logStep("6", "Re-fetch closings (post-close refresh simulation)");
  const closings = await staff.json<Array<{ date: string; status: string; branch: string }>>(
    "refresh-closings",
    "/api/day-closings"
  );
  const closedRecord = closings.find(
    (item) => item.branch === BRANCH && item.date === businessDate
  );
  recordCheck(
    "Post-close refresh shows closed day",
    closedRecord?.status === "closed",
    closedRecord?.status
  );

  logStep("7", "Branch isolation spot-check");
  const salaamaStaff = await createCertificationCashier(
    ownerBootstrap,
    `${TEST_PREFIX}-salaama`,
    "salaama"
  );
  const salaamaClient = new E2EClient();
  await salaamaClient.json("salaama-login", "/api/auth/session", {
    method: "POST",
    body: JSON.stringify({
      action: "login",
      username: salaamaStaff.username,
      password: salaamaStaff.password,
    }),
  });

  const crossClose = await salaamaClient.request("/api/day-closings", {
    method: "POST",
    body: JSON.stringify({
      branch: BRANCH,
      date: businessDate,
      ...EMPTY_CLOSE_PAYLOAD,
    }),
  });
  const crossText = await crossClose.text();
  apiLogs.push({
    step: "branch-isolation",
    method: "POST",
    path: "/api/day-closings",
    status: crossClose.status,
    bodyPreview: crossText.slice(0, 300),
  });
  recordCheck(
    "Foreign branch cannot close Kansanga day",
    crossClose.status === 403,
    `status=${crossClose.status}`
  );

  console.log("\n=== API Request Log ===");
  for (const entry of apiLogs) {
    console.log(
      JSON.stringify({
        step: entry.step,
        request: `${entry.method} ${entry.path}`,
        status: entry.status,
        code: entry.code,
        message: entry.message,
      })
    );
  }

  await cleanupCertificationCashier(cashier, { branch: BRANCH, date: businessDate });
  await cleanupCertificationCashier(salaamaStaff, { branch: "salaama" });

  console.log("\nPreview Close Day E2E verification PASSED.");
}

main().catch((error) => {
  console.error("\n=== API Request Log (failure) ===");
  for (const entry of apiLogs) {
    console.error(
      JSON.stringify({
        step: entry.step,
        request: `${entry.method} ${entry.path}`,
        status: entry.status,
        code: entry.code,
        message: entry.message,
        bodyPreview: entry.bodyPreview,
      })
    );
  }
  console.error("\nFAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
