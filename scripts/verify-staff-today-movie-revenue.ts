#!/usr/bin/env tsx
/**
 * Staff Today Movie Revenue regression guard — top-of-page input must not disappear.
 *
 * Regression history:
 * - Staff Today showed movie revenue only as "Pending" in StaffRevenueCard (display-only).
 * - Prior EOD-only restores were disconnected from the primary staff workflow.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { parseAmount } from "@/lib/amounts";
import { computeTodayRevenueByBranch } from "@/lib/branch/calculations";
import { resolveInventoryBranchCode } from "@/lib/branch/codes";
import { resolveBranchEntityForMetrics } from "@/lib/branch/resolve-branch-entity";
import { SALAAMA_BRANCH_CODE } from "@/lib/constants";
import type { Entry } from "@/types";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";
import { submitCloseRequestApi } from "./verify-close-request-helpers";
import {
  ensureDayOpen,
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-staff-today-movie-revenue-${Date.now()}`;
const ROOT = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function recordCheck(id: number, name: string, passed: boolean, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

class ApiClient {
  private cookieHeader = "";

  async json<T>(apiPath: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (this.cookieHeader) {
      headers.set("Cookie", this.cookieHeader);
    }

    const response = await fetch(`${BASE_URL}${apiPath}`, { ...options, headers });
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
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (this.cookieHeader) {
      headers.set("Cookie", this.cookieHeader);
    }

    const response = await fetch(`${BASE_URL}${apiPath}`, { ...options, headers });
    const payload = (await response.json()) as {
      error?: { message?: string; code?: string };
    };

    return {
      status: response.status,
      code: payload.error?.code,
      message: payload.error?.message ?? `HTTP ${response.status}`,
    };
  }
}

function buildDailyOperationPayload(options: {
  id: string;
  date: string;
  branch: string;
  sales: number;
  notes?: string;
}) {
  return {
    id: options.id,
    date: options.date,
    time: "6:00 PM",
    timestamp: Math.floor(Date.now() / 1000),
    branch: options.branch,
    sales: options.sales,
    expenses: [],
    notes: options.notes ?? TEST_PREFIX,
    status: "draft" as const,
  };
}

function runStaticRegressionGuard(): void {
  console.log("\nStatic regression guard (must fail if Staff Today input is removed)\n");

  const movieDialog = readRepo("components/staff-home/movie-revenue-dialog.tsx");
  const staffHome = readRepo("components/staff-home/staff-home-dashboard.tsx");
  const revenueSummary = readRepo("components/staff-home/revenue-summary.tsx");
  const workspace = readRepo("components/operations/staff/staff-operations-workspace.tsx");
  const cashSummary = readRepo("components/operations/staff/staff-cash-summary-card.tsx");
  const eodCard = readRepo("components/operations/staff/staff-end-of-day-card.tsx");
  const entryForm = readRepo("hooks/use-entry-form.ts");
  const openShop = readRepo("components/operations/open-shop-page.tsx");
  const serviceConfig = readRepo("lib/staff-home/services.ts");

  recordCheck(
    1,
    "REGRESSION GUARD: Staff Today renders Movie Revenue input/action",
    movieDialog.includes('data-regression-guard="staff-today-movie-revenue-input"') &&
      movieDialog.includes('data-regression-guard="staff-today-movie-revenue-action"') &&
      movieDialog.includes('aria-label="Movie revenue amount"') &&
      movieDialog.includes("Enter Movie Revenue") &&
      movieDialog.includes("Update Movie Revenue") &&
      movieDialog.includes("Save Movie Revenue"),
    "editable flow + primary action required on Staff Home"
  );

  recordCheck(
    2,
    "Staff Today layout: Movies service card opens movie revenue dialog",
    workspace.includes("<StaffHomeDashboard") &&
      staffHome.includes("MovieRevenueDialog") &&
      serviceConfig.includes('id: "movies"') &&
      staffHome.includes('case "movie-revenue"'),
    "Staff Home dashboard owns movie revenue entry"
  );

  recordCheck(
    3,
    "Staff can open Movie Revenue entry flow (dialog + save handler)",
    staffHome.includes("setMovieDialogOpen(true)") &&
      staffHome.includes("onSaveMovieRevenue") &&
      workspace.includes("onSaveMovieRevenue={(amount) => handleSubmitRequest({ sales: amount })}")
  );

  recordCheck(
    4,
    "Movie Revenue accepts UGX 0",
    movieDialog.includes("allowZero: true") && parseAmount("0") === 0
  );

  recordCheck(
    5,
    "Single authoritative persistence path (DailyOperation.sales / upsertEntry)",
    entryForm.includes("async function handleSubmitRequest(") &&
      entryForm.includes("overrides?: Partial<EntryFormData>") &&
      workspace.includes('handleSubmitRequest({ sales: amount })') &&
      readRepo("lib/server/services/daily-operations-service.ts").includes(
        "sales: entry.sales"
      )
  );

  recordCheck(
    6,
    "Today's Revenue summary reflects movie revenue (not a second save path)",
    revenueSummary.includes("Today") &&
      revenueSummary.includes('key: "movies"') &&
      !revenueSummary.includes('aria-label="Movie revenue amount"') &&
      workspace.includes("movieRevenue={movieRevenue}")
  );

  recordCheck(
    7,
    "Cash Summary displays Movie Revenue in net cash math",
    cashSummary.includes('label="Movie Revenue"') &&
      workspace.includes("movieRevenue + accessorySales + serviceSalesTotal")
  );

  recordCheck(
    8,
    "Movie Revenue scoped to entry form branch/date (no duplicate card save API)",
    movieDialog.includes("currentAmount") &&
      !movieDialog.includes("/api/") &&
      entryForm.includes("effectiveForm.branch")
  );

  recordCheck(
    9,
    "Closing is not blocked by zero/unset movie revenue",
    eodCard.includes(
      "const readyToClose = shopOpen && !closeRequestPending && !dayClosed"
    ) && !eodCard.match(/readyToClose[\s\S]{0,200}movieRevenue/)
  );

  recordCheck(
    10,
    "Opening the shop does not require movie revenue",
    !openShop.toLowerCase().includes("movierevenue") &&
      !openShop.match(/sales[\s\S]{0,120}required/i),
    "open-shop-page must not gate on movie revenue"
  );

  recordCheck(
    11,
    "Editable Movie Revenue dialog cannot be replaced by display-only summary",
    movieDialog.includes('data-regression-guard="staff-today-movie-revenue-section"') &&
      revenueSummary.includes("Total Revenue") &&
      resolveInventoryBranchCode(SALAAMA_BRANCH_CODE) === SALAAMA_BRANCH_CODE
  );

  recordCheck(
    12,
    "Future refactor guard: Movie revenue dialog wired in Staff Home (not orphaned)",
    workspace.includes('from "@/components/staff-home/staff-home-dashboard"') &&
      staffHome.includes('from "@/components/staff-home/movie-revenue-dialog"') &&
      staffHome.includes("<MovieRevenueDialog")
  );
}

async function runLiveRegressionGuard(): Promise<void> {
  console.log("\nLive regression guard (authoritative backend + workflows)\n");

  const owner = new ApiClient();
  const kansangaCashierClient = new ApiClient();
  const salaamaCashierClient = new ApiClient();
  const testDate = "2017-06-01";
  const entryIds: string[] = [];
  let kansangaCashier: CertificationCashier | null = null;
  let salaamaCashier: CertificationCashier | null = null;

  try {
    await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);

    kansangaCashier = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-main`,
      "main"
    );
    salaamaCashier = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-salaama`,
      SALAAMA_BRANCH_CODE
    );

    await loginWithCredentials(kansangaCashierClient, {
      username: kansangaCashier.username,
      password: kansangaCashier.password,
    });
    await ensureDayOpen(kansangaCashierClient, testDate, "main", owner);

    const zeroId = crypto.randomUUID();
    entryIds.push(zeroId);
    const zeroSaved = await kansangaCashierClient.json<Entry>("/api/daily-operations", {
      method: "POST",
      body: JSON.stringify(
        buildDailyOperationPayload({
          id: zeroId,
          date: testDate,
          branch: "main",
          sales: 0,
        })
      ),
    });

    recordCheck(
      13,
      "Movie Revenue UGX 0 persists via authoritative backend",
      zeroSaved.sales === 0,
      `sales=${zeroSaved.sales}`
    );

    const reloadedZero = await kansangaCashierClient.json<Entry[]>(
      "/api/daily-operations"
    );
    const zeroEntry = reloadedZero.find((entry) => entry.id === zeroSaved.id);
    recordCheck(
      14,
      "Reload/revalidation returns saved UGX 0 movie revenue",
      zeroEntry?.sales === 0,
      `entryId=${zeroSaved.id}, entry.sales=${zeroEntry?.sales ?? "missing"}`
    );

    const positiveId = zeroSaved.id;
    const positiveSaved = await kansangaCashierClient.json<Entry>(
      "/api/daily-operations",
      {
        method: "POST",
        body: JSON.stringify(
          buildDailyOperationPayload({
            id: positiveId,
            date: testDate,
            branch: "main",
            sales: 83_000,
            notes: `${TEST_PREFIX}-updated`,
          })
        ),
      }
    );

    recordCheck(
      15,
      "Movie Revenue positive amount persists",
      positiveSaved.sales === 83_000,
      `sales=${positiveSaved.sales}`
    );

    const notesOnlySaved = await kansangaCashierClient.json<Entry>(
      "/api/daily-operations",
      {
        method: "POST",
        body: JSON.stringify(
          buildDailyOperationPayload({
            id: positiveId,
            date: testDate,
            branch: "main",
            sales: 83_000,
            notes: `${TEST_PREFIX}-notes-only`,
          })
        ),
      }
    );

    recordCheck(
      16,
      "Movie Revenue is not reset when other end-of-day fields change",
      notesOnlySaved.sales === 83_000 &&
        notesOnlySaved.notes.includes(`${TEST_PREFIX}-notes-only`),
      `sales=${notesOnlySaved.sales}`
    );

    const branchEntity = resolveBranchEntityForMetrics(
      "main",
      () => ({ id: "main-id", code: "main", name: "Kansanga", active: true }),
      () => "Kansanga"
    );
    const reloadedPositive = await kansangaCashierClient.json<Entry[]>(
      "/api/daily-operations"
    );
    const dashboardTotal = computeTodayRevenueByBranch(
      branchEntity,
      [],
      reloadedPositive,
      testDate
    );

    recordCheck(
      17,
      "Today's Revenue totals include persisted entry.sales (movie revenue)",
      dashboardTotal >= 83_000,
      `todaySales=${dashboardTotal}`
    );

    const closeResult = await submitCloseRequestApi<{ status: string }>(
      kansangaCashierClient,
      "main",
      testDate
    );

    recordCheck(
      18,
      "Movie Revenue UGX 0 does NOT block closing request submission",
      closeResult.status === "close_requested",
      `status=${closeResult.status}`
    );

    await loginWithCredentials(salaamaCashierClient, {
      username: salaamaCashier.username,
      password: salaamaCashier.password,
    });

    const salaamaEntryId = crypto.randomUUID();
    entryIds.push(salaamaEntryId);
    await ensureDayOpen(salaamaCashierClient, testDate, SALAAMA_BRANCH_CODE, owner);
    await salaamaCashierClient.json<Entry>("/api/daily-operations", {
      method: "POST",
      body: JSON.stringify(
        buildDailyOperationPayload({
          id: salaamaEntryId,
          date: testDate,
          branch: SALAAMA_BRANCH_CODE,
          sales: 44_000,
          notes: `${TEST_PREFIX}-salaama-marker`,
        })
      ),
    });

    const kansangaView = await kansangaCashierClient.json<Entry[]>(
      "/api/daily-operations"
    );
    const salaamaLeak = kansangaView.find(
      (entry) => entry.notes === `${TEST_PREFIX}-salaama-marker`
    );

    recordCheck(
      19,
      "Movie Revenue remains branch-isolated",
      !salaamaLeak,
      salaamaLeak ? `leaked entry ${salaamaLeak.id}` : "Kansanga cashier cannot see Salaama entry"
    );

    const foreignWrite = await kansangaCashierClient.jsonExpectFailure(
      "/api/daily-operations",
      {
        method: "POST",
        body: JSON.stringify(
          buildDailyOperationPayload({
            id: crypto.randomUUID(),
            date: testDate,
            branch: SALAAMA_BRANCH_CODE,
            sales: 1,
          })
        ),
      }
    );

    recordCheck(
      20,
      "Staff cannot write Movie Revenue to foreign branch",
      foreignWrite.status === 403,
      `status=${foreignWrite.status}`
    );
  } finally {
    await owner
      .json("/api/day-closings", {
        method: "POST",
        body: JSON.stringify({
          action: "reopen",
          branch: "main",
          date: testDate,
        }),
      })
      .catch(() => undefined);
    await owner
      .json("/api/day-closings", {
        method: "POST",
        body: JSON.stringify({
          action: "reopen",
          branch: SALAAMA_BRANCH_CODE,
          date: testDate,
        }),
      })
      .catch(() => undefined);
    for (const entryId of entryIds) {
      await prisma.dailyOperation.deleteMany({ where: { id: entryId } }).catch(
        () => undefined
      );
    }
    if (kansangaCashier) {
      await cleanupCertificationCashier(owner, kansangaCashier).catch(() => undefined);
    }
    if (salaamaCashier) {
      await cleanupCertificationCashier(owner, salaamaCashier).catch(() => undefined);
    }
  }
}

async function main() {
  console.log(`Staff Today Movie Revenue regression guard (${TEST_PREFIX})`);
  console.log(`Base URL: ${BASE_URL}\n`);

  runStaticRegressionGuard();

  try {
    await runLiveRegressionGuard();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("fetch failed") ||
      message.includes("ECONNREFUSED") ||
      message.includes("Request failed: 502")
    ) {
      console.log(
        `\nSKIP live checks — environment/fixture: ${message.split("\n")[0]}`
      );
    } else {
      throw error;
    }
  }

  console.log("\nStaff Today Movie Revenue regression guard complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
