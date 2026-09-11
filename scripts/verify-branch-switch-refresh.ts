import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import {
  beginBranchScopedFetch,
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
const TEST_PREFIX = `verify-branch-refresh-${Date.now()}`;

const SCOPED_CONTEXT_FILES = [
  "context/sales-context.tsx",
  "context/expenses-module-context.tsx",
  "context/purchasing-context.tsx",
  "context/staff-payments-context.tsx",
  "context/entries-context.tsx",
];

type JsonRecord = Record<string, unknown>;

function recordCheck(id: number, name: string, passed: boolean, detail: string) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

class BranchRefreshVerifier {
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
      throw new Error(
        typeof payload.error === "object" &&
          payload.error &&
          typeof payload.error.message === "string"
          ? payload.error.message
          : `Request failed: ${response.status} ${apiPath}`
      );
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

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function scanContextsForBranchRefresh(): void {
  for (const file of SCOPED_CONTEXT_FILES) {
    const source = readRepoFile(file);
    recordCheck(
      SCOPED_CONTEXT_FILES.indexOf(file) + 1,
      `${file} refetches when activeBranch changes`,
      source.includes("activeBranch") &&
        source.includes("lastFetchedBranch") &&
        source.includes("shouldSkipBranchScopedFetch"),
      ""
    );
  }
}

function testBranchScopedLoadHelpers(): void {
  const hasLoaded = { current: false };
  const lastFetchedBranch = { current: null as Branch | null };

  assert.equal(shouldSkipBranchScopedFetch(hasLoaded, lastFetchedBranch, "main"), false);
  assert.equal(beginBranchScopedFetch(hasLoaded, lastFetchedBranch, "main"), false);
  assert.equal(shouldSkipBranchScopedFetch(hasLoaded, lastFetchedBranch, "main"), true);
  assert.equal(beginBranchScopedFetch(hasLoaded, lastFetchedBranch, "salaama"), true);
  resetBranchScopedFetchRefs(hasLoaded, lastFetchedBranch);
  assert.equal(shouldSkipBranchScopedFetch(hasLoaded, lastFetchedBranch, "main"), false);

  recordCheck(
    6,
    "Branch-scoped load helpers detect branch changes",
    true,
    "skip/fetch/reset helpers behave correctly"
  );
}

function buildExpensePayload(options: {
  categoryId: string;
  amount: number;
  description: string;
  date: string;
  branch: string;
}) {
  return {
    date: options.date,
    categoryId: options.categoryId,
    description: options.description,
    amount: options.amount,
    paymentMethod: "cash",
    branch: options.branch,
  };
}

async function cleanupExpenseIds(expenseIds: string[]) {
  for (const expenseId of expenseIds) {
    await prisma.expenseRecord.deleteMany({ where: { id: expenseId } });
  }
}

async function main() {
  const owner = new BranchRefreshVerifier();
  const staffClient = new BranchRefreshVerifier();
  const today = new Date().toISOString().slice(0, 10);
  const expenseIds: string[] = [];
  let kansangaCashier: CertificationCashier | null = null;
  let salaamaCashier: CertificationCashier | null = null;

  console.log("Verifying branch-switch data refresh...\n");

  scanContextsForBranchRefresh();
  testBranchScopedLoadHelpers();

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

    const kansangaClient = new BranchRefreshVerifier();
    await kansangaClient.loginAsCashier(kansangaCashier);
    await ensureDayOpen(kansangaClient, today, "main", owner);

    const kansangaMarker = `${TEST_PREFIX}-kansanga-expense`;
    const kansangaExpense = await kansangaClient.json<JsonRecord>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(
        buildExpensePayload({
          categoryId: "rent",
          amount: 7_001,
          description: kansangaMarker,
          date: today,
          branch: "main",
        })
      ),
    });
    expenseIds.push(String(kansangaExpense.id));

    await owner.setActiveBranch("main");

    await owner.setActiveBranch("main");
    const kansangaExpenses = await owner.json<Array<{ description: string; branch: string }>>(
      "/api/expenses"
    );
    recordCheck(
      7,
      "Owner starts on Kansanga and sees Kansanga-scoped API data",
      kansangaExpenses.some((expense) => expense.description === kansangaMarker),
      `kansanga marker visible among ${kansangaExpenses.length} expenses`
    );

    await owner.setActiveBranch("salaama");
    const salaamaClient = new BranchRefreshVerifier();
    await salaamaClient.loginAsCashier(salaamaCashier);
    await ensureDayOpen(salaamaClient, today, "salaama", owner);
    const salaamaMarker = `${TEST_PREFIX}-salaama-expense`;
    const salaamaExpense = await salaamaClient.json<JsonRecord>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(
        buildExpensePayload({
          categoryId: "rent",
          amount: 8_001,
          description: salaamaMarker,
          date: today,
          branch: "salaama",
        })
      ),
    });
    expenseIds.push(String(salaamaExpense.id));

    await owner.setActiveBranch("salaama");

    const salaamaExpenses = await owner.json<Array<{ description: string; branch: string }>>(
      "/api/expenses"
    );
    const salaamaHasMarker = salaamaExpenses.some(
      (expense) => expense.description === salaamaMarker
    );
    const salaamaHidesKansangaMarker = !salaamaExpenses.some(
      (expense) => expense.description === kansangaMarker
    );
    recordCheck(
      8,
      "Owner switches to Salaama and API returns Salaama data",
      salaamaHasMarker && salaamaHidesKansangaMarker,
      `salaama marker visible=${salaamaHasMarker}, kansanga marker hidden=${salaamaHidesKansangaMarker}`
    );

    await owner.setActiveBranch("main");
    const backToKansanga = await owner.json<Array<{ description: string; branch: string }>>(
      "/api/expenses"
    );
    recordCheck(
      9,
      "Owner switches back to Kansanga and API returns Kansanga data",
      backToKansanga.some((expense) => expense.description === kansangaMarker) &&
        !backToKansanga.some((expense) => expense.description === salaamaMarker),
      "Kansanga marker restored, Salaama marker hidden"
    );

    recordCheck(
      10,
      "Previous branch data is not served as the new branch data",
      salaamaHidesKansangaMarker,
      "Kansanga expenses absent while Salaama is active"
    );

    await staffClient.loginAsCashier(kansangaCashier);
    const staffSwitchAttempt = await staffClient.jsonExpectFailure(
      "/api/auth/session",
      {
        method: "POST",
        body: JSON.stringify({
          action: "set-active-branch",
          branchCode: "salaama",
        }),
      }
    );
    const staffSession = await staffClient.json<{ activeBranchCode?: string }>(
      "/api/auth/session"
    );
    recordCheck(
      11,
      "Staff cannot switch away from assigned branch",
      staffSwitchAttempt.status === 403 &&
        staffSession.activeBranchCode !== "salaama",
      `status=${staffSwitchAttempt.status}, activeBranch=${staffSession.activeBranchCode ?? "null"}`
    );

    const productsBefore = await owner.json<Array<{ id: string }>>(
      "/api/stock/products"
    );
    await owner.setActiveBranch("salaama");
    const productsAfter = await owner.json<Array<{ id: string }>>(
      "/api/stock/products"
    );
    recordCheck(
      12,
      "Product catalog remains unchanged across branch switches",
      productsBefore.length === productsAfter.length,
      `${productsBefore.length} products before and after switch`
    );

    recordCheck(
      13,
      "Branch-scoped load clears stale data on fetch failure",
      readRepoFile("context/sales-context.tsx").includes(
        "setSales([])"
      ) &&
        readRepoFile("context/sales-context.tsx").includes(
          "getDataSourceErrorMessage(error)"
        ),
      "Sales context clears cached records when refresh fails"
    );

    console.log("\nBranch-switch refresh verification complete.");
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
