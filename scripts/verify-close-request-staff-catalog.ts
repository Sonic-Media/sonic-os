import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { buildBranchEntityFallback } from "@/lib/branch/resolve-branch-entity";
import { computeDayClosingMetrics } from "@/lib/day-closing/calculations";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";
import {
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";
import {
  EMPTY_CLOSE_PAYLOAD,
  submitCloseRequestApi,
  approveCloseDayApi,
} from "./verify-close-request-helpers";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-staff-catalog-${Date.now()}`;
const MAIN_BRANCH = "main";

function recordCheck(id: string, name: string, passed: boolean, detail: string) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

class JsonClient {
  private cookieHeader = "";

  async request(apiPath: string, options: RequestInit = {}): Promise<Response> {
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

    const payload = (await response.json()) as { data?: T; error?: unknown };
    if (!response.ok) {
      throw new Error(
        `${apiPath} failed (${response.status}): ${JSON.stringify(payload.error ?? payload)}`
      );
    }

    return payload.data as T;
  }

  async jsonExpectFailure(apiPath: string, options: RequestInit = {}) {
    const response = await this.request(apiPath, options);
    const payload = (await response.json()) as {
      error?: { message?: string; code?: string };
    };
    return {
      status: response.status,
      code: payload.error?.code ?? "",
      message: payload.error?.message ?? "",
    };
  }

  clearCookies() {
    this.cookieHeader = "";
  }
}

async function resetDayClosing(branch: string, date: string) {
  const branchRow = await prisma.branch.findUnique({ where: { code: branch } });
  if (!branchRow) return;
  await prisma.dayClosing.deleteMany({
    where: { branchId: branchRow.id, date },
  });
}

async function openDay(client: JsonClient, branch: string, date: string) {
  await client.json("/api/day-closings", {
    method: "POST",
    body: JSON.stringify({
      action: "open",
      branch,
      date,
    }),
  });
}

async function main() {
  console.log("Verifying close-request staff branch catalog behavior...\n");

  const staffHookSource = readRepoFile("hooks/use-staff-close-day.ts");
  const branchContextSource = readRepoFile("context/branch-context.tsx");
  const resolverSource = readRepoFile("lib/branch/resolve-branch-entity.ts");

  recordCheck(
    "1-static",
    "Staff close hook resolves metrics without activeBranches.find",
    staffHookSource.includes("resolveBranchEntityForMetrics") &&
      !staffHookSource.includes("activeBranches.find"),
    "use-staff-close-day.ts"
  );

  recordCheck(
    "2-static",
    "Branch context falls back to assigned branch when catalog fetch fails",
    branchContextSource.includes("buildAssignedBranchFallback") &&
      branchContextSource.includes("canSwitchActiveBranch"),
    "branch-context.tsx"
  );

  recordCheck(
    "3-static",
    "Metrics resolver provides branch.code fallback entity",
    resolverSource.includes("buildBranchEntityFallback") &&
      resolverSource.includes("resolveBranchEntityForMetrics"),
    "resolve-branch-entity.ts"
  );

  const fallbackEntity = buildBranchEntityFallback(MAIN_BRANCH, "Kansanga");
  const metrics = computeDayClosingMetrics(fallbackEntity, [], [], [], [], [], "2020-08-24");
  recordCheck(
    "4-static",
    "Fallback branch entity supports computeDayClosingMetrics",
    typeof metrics.todaySales === "number",
    `todaySales=${metrics.todaySales}`
  );

  let cashier: CertificationCashier | null = null;
  const testDate = "2020-08-24";
  const ownerClient = new JsonClient();
  const staffClient = new JsonClient();

  try {
    await loginWithCredentials(ownerClient, VERIFY_OWNER_CREDENTIALS);
    cashier = await createCertificationCashier(
      ownerClient,
      TEST_PREFIX,
      MAIN_BRANCH
    );

    await resetDayClosing(MAIN_BRANCH, testDate);

    await loginWithCredentials(staffClient, {
      username: cashier.username,
      password: cashier.password,
    });

    await openDay(staffClient, MAIN_BRANCH, testDate);

    const branchesDenied = await staffClient.jsonExpectFailure("/api/branches");
    recordCheck(
      "5-live",
      "Cashier cannot fetch full branches catalog (403)",
      branchesDenied.status === 403,
      `status=${branchesDenied.status}`
    );

    const submitted = await submitCloseRequestApi<{ status: string; date: string }>(
      staffClient,
      MAIN_BRANCH,
      testDate,
      EMPTY_CLOSE_PAYLOAD
    );
    recordCheck(
      "6-live",
      "Cashier can still submit close request via API",
      submitted.status === "close_requested",
      `status=${submitted.status}`
    );

    const pgRecord = await prisma.dayClosing.findFirst({
      where: {
        branch: { code: MAIN_BRANCH },
        date: testDate,
      },
    });
    recordCheck(
      "7-live",
      "DayClosing persisted as close_requested",
      pgRecord?.status === "close_requested",
      `pg=${pgRecord?.status ?? "null"}`
    );

    ownerClient.clearCookies();
    await loginWithCredentials(ownerClient, VERIFY_OWNER_CREDENTIALS);

    const closings = await ownerClient.json<Array<{ status: string; branch: string; date: string }>>(
      "/api/day-closings"
    );
    const pending = closings.filter(
      (record) =>
        record.status === "close_requested" &&
        record.branch === MAIN_BRANCH &&
        record.date === testDate
    );
    recordCheck(
      "8-live",
      "Owner management query returns pending request",
      pending.length === 1,
      `count=${pending.length}`
    );

    const approved = await approveCloseDayApi<{ status: string; closedAt?: string }>(
      ownerClient,
      MAIN_BRANCH,
      testDate,
      EMPTY_CLOSE_PAYLOAD
    );
    recordCheck(
      "9-live",
      "Owner can approve after staff submit",
      approved.status === "closed" && Boolean(approved.closedAt),
      `status=${approved.status}`
    );

    await resetDayClosing(MAIN_BRANCH, testDate);
  } finally {
    if (cashier) {
      await cleanupCertificationCashier(cashier);
    }
  }

  console.log("\nClose-request staff branch catalog verification complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
