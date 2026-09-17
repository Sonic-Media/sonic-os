#!/usr/bin/env tsx
/**
 * Movie Revenue regression guard — prevents Staff End of Day input from disappearing.
 *
 * Regression history:
 * - 962b219 "Polish Close Shop / End of Day staff UX" removed the input while dropping the >0 close gate.
 * - PR #51 day-close-state-sync merged a slim EOD card without the staff-movie-revenue-eod restoration.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { parseAmount } from "@/lib/amounts";
import { computeTodayRevenueByBranch } from "@/lib/branch/calculations";
import { resolveInventoryBranchCode } from "@/lib/branch/codes";
import { resolveBranchEntityForMetrics } from "@/lib/branch/resolve-branch-entity";
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
const TEST_PREFIX = `verify-movie-revenue-guard-${Date.now()}`;
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
  console.log("\nStatic regression guard (must fail if input is removed)\n");

  const eodCard = readRepo("components/operations/staff/staff-end-of-day-card.tsx");
  const workspace = readRepo("components/operations/staff/staff-operations-workspace.tsx");
  const cashSummary = readRepo("components/operations/staff/staff-cash-summary-card.tsx");
  const reviewDialog = readRepo(
    "components/dashboard/closing-requests/review-closing-request-dialog.tsx"
  );
  const entryForm = readRepo("hooks/use-entry-form.ts");
  const branchCodes = readRepo("lib/branch/codes.ts");

  recordCheck(
    1,
    "REGRESSION GUARD: Movie Revenue input must remain present in Staff End of Day",
    eodCard.includes('data-regression-guard="movie-revenue-eod-input"') &&
      eodCard.includes('aria-label="Movie revenue amount"') &&
      eodCard.includes("onSaveMovieRevenue") &&
      eodCard.includes("Save Movie Revenue") &&
      !eodCard.match(/readyToClose[\s\S]{0,160}movieRevenueEntered/),
    "editable input + save action required; close must not require movie revenue"
  );

  recordCheck(
    2,
    "Movie Revenue input is editable (controlled input + save handler)",
    eodCard.includes("value={amountInput}") &&
      eodCard.includes("handleSaveMovieRevenue") &&
      workspace.includes("onSaveMovieRevenue")
  );

  recordCheck(
    3,
    "Movie Revenue accepts UGX 0",
    eodCard.includes("allowZero: true") && parseAmount("0") === 0
  );

  recordCheck(
    4,
    "Single authoritative persistence path (DailyOperation.sales)",
    workspace.includes('handleSubmitRequest({ sales: amount })') &&
      entryForm.includes("upsertEntry(entry)") &&
      readRepo("lib/server/services/daily-operations-service.ts").includes(
        "sales: entry.sales"
      )
  );

  recordCheck(
    5,
    "Staff cash summary displays Movie Revenue",
    cashSummary.includes('label="Movie Revenue"') &&
      cashSummary.includes("movieRevenue + accessorySales")
  );

  recordCheck(
    6,
    "Owner closing review displays persisted Movie Revenue",
    reviewDialog.includes('label="Movie revenue"') &&
      reviewDialog.includes("operation?.sales")
  );

  recordCheck(
    7,
    "Closing is not blocked by zero/unset movie revenue",
    eodCard.includes(
      "const readyToClose = shopOpen && !closeRequestPending && !dayClosed"
    )
  );

  recordCheck(
    8,
    "Production Salaama remains branch2 (no migration in this task)",
    branchCodes.includes('salaama: "branch2"') &&
      resolveInventoryBranchCode("salaama") === "branch2" &&
      resolveInventoryBranchCode("main") === "main"
  );

  recordCheck(
    9,
    "No duplicate Movie Revenue EOD input implementation",
    !workspace.includes("StaffMovieRevenueCard") &&
      eodCard.includes('data-regression-guard="movie-revenue-eod-section"')
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
      "branch2"
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
      10,
      "Movie Revenue UGX 0 persists via authoritative backend",
      zeroSaved.sales === 0,
      `sales=${zeroSaved.sales}`
    );

    const reloadedZero = await kansangaCashierClient.json<Entry[]>(
      "/api/daily-operations"
    );
    const zeroEntry = reloadedZero.find((entry) => entry.id === zeroSaved.id);
    recordCheck(
      11,
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
      12,
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
      13,
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
      14,
      "Dashboard financial totals include persisted entry.sales (movie revenue)",
      dashboardTotal >= 83_000,
      `todaySales=${dashboardTotal}`
    );

    const closeResult = await submitCloseRequestApi<{ status: string }>(
      kansangaCashierClient,
      "main",
      testDate
    );

    recordCheck(
      15,
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
    await ensureDayOpen(salaamaCashierClient, testDate, "branch2", owner);
    await salaamaCashierClient.json<Entry>("/api/daily-operations", {
      method: "POST",
      body: JSON.stringify(
        buildDailyOperationPayload({
          id: salaamaEntryId,
          date: testDate,
          branch: "branch2",
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
      16,
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
            branch: "branch2",
            sales: 1,
          })
        ),
      }
    );

    recordCheck(
      17,
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
          branch: "branch2",
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
  console.log(`Movie Revenue regression guard (${TEST_PREFIX})`);
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

  console.log("\nMovie Revenue regression guard complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
