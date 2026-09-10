import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import {
  beginBranchScopedFetch,
  beginFetchGeneration,
  isCurrentFetchGeneration,
  resetBranchScopedFetchRefs,
  shouldSkipBranchScopedFetch,
} from "@/lib/context/branch-scoped-load";
import type { Branch } from "@/types";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";
import {
  ensureDayOpen,
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-auth-gate-${Date.now()}`;

const TARGET_CONTEXTS = [
  {
    file: "context/expenses-module-context.tsx",
    fetchPatterns: ["fetchExpenseCategories", "fetchExpenses"],
    apiPaths: ["/api/expenses", "/api/expense-categories"],
  },
  {
    file: "context/staff-payments-context.tsx",
    fetchPatterns: ["fetchStaffPayments"],
    apiPaths: ["/api/staff-payments"],
  },
];

type JsonRecord = Record<string, unknown>;

function recordCheck(id: number, name: string, passed: boolean, detail: string) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function scanAuthGateInContext(
  file: string,
  fetchPatterns: string[],
  checks: { label: string; passed: boolean; detail?: string }[]
): void {
  const source = readRepoFile(file);
  const authGateIndex = source.indexOf("if (!authLoaded) return;");
  const loadIndex = source.indexOf("loadFromApi(");

  checks.push({
    label: `${file} waits for authLoaded before business-data fetch`,
    passed:
      source.includes("isLoaded: authLoaded") &&
      authGateIndex !== -1 &&
      loadIndex !== -1 &&
      authGateIndex < loadIndex,
  });

  checks.push({
    label: `${file} skips fetch when session is not authenticated`,
    passed:
      source.includes("if (!isAuthenticated)") &&
      source.includes("resetBranchScopedFetchRefs") &&
      (source.includes("setExpenses([])") || source.includes("setPayments([])")),
  });

  checks.push({
    label: `${file} requires branchLoaded before fetch`,
    passed:
      source.includes("isLoaded: branchLoaded") &&
      source.includes("if (!branchLoaded)") &&
      source.includes("activeBranch"),
  });

  for (const pattern of fetchPatterns) {
    checks.push({
      label: `${file} does not mount-fetch ${pattern} without auth gate`,
      passed: !source.match(
        new RegExp(`useEffect\\(\\(\\) => \\{[\\s\\S]{0,120}${pattern}`, "m")
      ),
      detail: pattern,
    });
  }

  checks.push({
    label: `${file} protects against stale fetch overwrites`,
    passed:
      source.includes("beginFetchGeneration") &&
      source.includes("isCurrentFetchGeneration"),
  });
}

function testFetchGenerationHelpers(startId: number): number {
  const fetchGeneration = { current: 0 };
  const first = beginFetchGeneration(fetchGeneration);
  const second = beginFetchGeneration(fetchGeneration);

  assert.equal(isCurrentFetchGeneration(fetchGeneration, first), false);
  assert.equal(isCurrentFetchGeneration(fetchGeneration, second), true);

  recordCheck(
    startId,
    "Fetch generation helpers discard stale in-flight responses",
    true,
    `generations ${first} invalidated, ${second} current`
  );
  return startId + 1;
}

function testBranchScopedLoadHelpers(startId: number): number {
  const hasLoaded = { current: false };
  const lastFetchedBranch = { current: null as Branch | null };

  assert.equal(shouldSkipBranchScopedFetch(hasLoaded, lastFetchedBranch, "main"), false);
  assert.equal(beginBranchScopedFetch(hasLoaded, lastFetchedBranch, "main"), false);
  assert.equal(shouldSkipBranchScopedFetch(hasLoaded, lastFetchedBranch, "main"), true);
  assert.equal(beginBranchScopedFetch(hasLoaded, lastFetchedBranch, "salaama"), true);
  resetBranchScopedFetchRefs(hasLoaded, lastFetchedBranch);
  assert.equal(shouldSkipBranchScopedFetch(hasLoaded, lastFetchedBranch, "main"), false);

  recordCheck(
    startId,
    "Branch-scoped load helpers detect branch changes",
    true,
    "skip/fetch/reset helpers behave correctly"
  );
  return startId + 1;
}

class AuthGateVerifier {
  private cookieHeader = "";

  private async request(
    apiPath: string,
    options: RequestInit = {}
  ): Promise<Response> {
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

    const payload = (await response.json()) as { data?: T; error?: JsonRecord };
    if (!response.ok) {
      const message =
        typeof payload.error === "object" &&
        payload.error &&
        typeof payload.error.message === "string"
          ? payload.error.message
          : `Request failed: ${response.status} ${apiPath}`;
      throw new Error(message);
    }

    return payload.data as T;
  }

  async jsonExpectFailure(apiPath: string, options: RequestInit = {}) {
    const response = await this.request(apiPath, options);
    const payload = (await response.json()) as { error?: JsonRecord };
    return { status: response.status, payload };
  }

  async loginAsOwner() {
    await loginWithCredentials(this, VERIFY_OWNER_CREDENTIALS);
  }

  async loginAsCashier(cashier: CertificationCashier) {
    await loginWithCredentials(this, {
      username: cashier.username,
      password: cashier.password,
    });
  }

  async setActiveBranch(branch: string) {
    await this.json("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({
        action: "set-active-branch",
        branchCode: branch,
      }),
    });
  }
}

async function cleanupExpenseIds(expenseIds: string[]) {
  if (expenseIds.length === 0) return;
  await prisma.expenseRecord.deleteMany({ where: { id: { in: expenseIds } } });
}

async function main() {
  const unauthenticated = new AuthGateVerifier();
  const owner = new AuthGateVerifier();
  const staffClient = new AuthGateVerifier();
  const today = new Date().toISOString().slice(0, 10);
  const expenseIds: string[] = [];
  let kansangaCashier: CertificationCashier | null = null;
  let salaamaCashier: CertificationCashier | null = null;

  console.log("Verifying auth-gated branch-scoped data loading...\n");

  const staticChecks: {
    label: string;
    passed: boolean;
    detail?: string;
  }[] = [];

  scanAuthGateInContext(
    TARGET_CONTEXTS[0]!.file,
    TARGET_CONTEXTS[0]!.fetchPatterns,
    staticChecks
  );
  scanAuthGateInContext(
    TARGET_CONTEXTS[1]!.file,
    TARGET_CONTEXTS[1]!.fetchPatterns,
    staticChecks
  );

  let nextCheckId = 1;
  for (const check of staticChecks) {
    recordCheck(nextCheckId, check.label, check.passed, check.detail ?? "");
    nextCheckId += 1;
  }

  nextCheckId = testFetchGenerationHelpers(nextCheckId);
  nextCheckId = testBranchScopedLoadHelpers(nextCheckId);

  const unauthExpenses = await unauthenticated.jsonExpectFailure("/api/expenses");
  const unauthPayments = await unauthenticated.jsonExpectFailure(
    "/api/staff-payments"
  );
  recordCheck(
    nextCheckId,
    "Unauthenticated requests do not load business data",
    unauthExpenses.status === 401 && unauthPayments.status === 401,
    `expenses=${unauthExpenses.status}, staff-payments=${unauthPayments.status}`
  );
  nextCheckId += 1;

  try {
    await owner.loginAsOwner();
    kansangaCashier = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-k`,
      "main"
    );
    salaamaCashier = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-s`,
      "salaama"
    );

    const kansangaClient = new AuthGateVerifier();
    await kansangaClient.loginAsCashier(kansangaCashier);
    await ensureDayOpen(kansangaClient, today, "main", owner);

    const categories = await kansangaClient.json<Array<{ id: string }>>(
      "/api/expense-categories"
    );
    const categoryId = categories[0]?.id;
    assert.ok(categoryId);

    const mainExpense = await kansangaClient.json<{ id: string; branch: string }>(
      "/api/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          date: today,
          categoryId,
          description: `${TEST_PREFIX} main expense`,
          amount: 500,
          paymentMethod: "cash",
          branch: "main",
        }),
      }
    );
    expenseIds.push(mainExpense.id);

    const salaamaClient = new AuthGateVerifier();
    await salaamaClient.loginAsCashier(salaamaCashier);
    await ensureDayOpen(salaamaClient, today, "salaama", owner);

    const salaamaExpense = await salaamaClient.json<{ id: string; branch: string }>(
      "/api/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          date: today,
          categoryId,
          description: `${TEST_PREFIX} salaama expense`,
          amount: 700,
          paymentMethod: "cash",
          branch: "salaama",
        }),
      }
    );
    expenseIds.push(salaamaExpense.id);

    await owner.setActiveBranch("main");

    await owner.setActiveBranch("main");
    const mainScopedExpenses = await owner.json<Array<{ id: string; branch: string }>>(
      "/api/expenses"
    );
    recordCheck(
      nextCheckId++,
      "Authenticated owner loads branch-scoped expenses for active branch",
      mainScopedExpenses.some((item) => item.id === mainExpense.id) &&
        !mainScopedExpenses.some((item) => item.id === salaamaExpense.id),
      `main count=${mainScopedExpenses.length}`
    );

    await owner.setActiveBranch("salaama");
    const salaamaScopedExpenses = await owner.json<Array<{ id: string; branch: string }>>(
      "/api/expenses"
    );
    recordCheck(
      nextCheckId++,
      "Owner branch switch returns new branch expenses without stale records",
      salaamaScopedExpenses.some((item) => item.id === salaamaExpense.id) &&
        !salaamaScopedExpenses.some((item) => item.id === mainExpense.id),
      `salaama count=${salaamaScopedExpenses.length}`
    );

    await staffClient.loginAsCashier(kansangaCashier);
    await ensureDayOpen(staffClient, today, "main", owner);
    const staffExpenses = await staffClient.json<Array<{ branch: string }>>(
      "/api/expenses"
    );
    recordCheck(
      nextCheckId++,
      "Authenticated staff loads only authorized branch expenses",
      staffExpenses.every((item) => item.branch === "main"),
      `count=${staffExpenses.length}`
    );

    const staffPayments = await staffClient.json<Array<{ branch: string }>>(
      "/api/staff-payments"
    );
    recordCheck(
      nextCheckId++,
      "Authenticated staff loads only authorized branch staff payments",
      staffPayments.every((item) => item.branch === "main"),
      `count=${staffPayments.length}`
    );

    const foreignBranchRead = await staffClient.json<Array<{ branch: string }>>(
      "/api/expenses?branch=salaama"
    );
    recordCheck(
      nextCheckId++,
      "Staff cannot load foreign-branch business data via branch query",
      foreignBranchRead.every((item) => item.branch === "main"),
      `count=${foreignBranchRead.length}`
    );

    const refreshedPayments = await staffClient.json<Array<{ branch: string }>>(
      "/api/staff-payments"
    );
    recordCheck(
      nextCheckId++,
      "Existing staff-payments behavior remains intact",
      Array.isArray(refreshedPayments) &&
        refreshedPayments.every((item) => item.branch === "main"),
      `count=${refreshedPayments.length}`
    );

    const refreshedCategories = await owner.json<Array<{ id: string }>>(
      "/api/expense-categories"
    );
    recordCheck(
      nextCheckId++,
      "Existing expenses behavior remains intact",
      refreshedCategories.length > 0,
      `categories=${refreshedCategories.length}`
    );

    console.log("\nAuth-gated loading verification complete.");
  } finally {
    if (kansangaCashier) {
      await cleanupCertificationCashier(kansangaCashier);
    }
    if (salaamaCashier) {
      await cleanupCertificationCashier(salaamaCashier);
    }
    await cleanupExpenseIds(expenseIds);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
