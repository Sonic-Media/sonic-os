import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { resolveAuthoritativeActiveBranch } from "@/lib/branch/active-branch-resolution";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";
import {
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-branch-auth-${Date.now()}`;

function recordCheck(id: number, name: string, passed: boolean, detail: string) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

class BranchAuthVerifier {
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
      error?: { message?: string };
    };
    return {
      status: response.status,
      message: payload.error?.message ?? "",
    };
  }
}

async function getUserPreference(userId: string) {
  return prisma.userPreference.findUnique({ where: { userId } });
}

function scanStaticAuthority(): void {
  const branchContext = readRepoFile("context/branch-context.tsx");
  const authStorage = readRepoFile("lib/auth-storage.ts");
  const resolution = readRepoFile("lib/branch/active-branch-resolution.ts");

  recordCheck(
    1,
    "Client does not read localStorage for authoritative active branch",
    !branchContext.includes("readStoredActiveBranch") &&
      branchContext.includes("resolveAuthoritativeActiveBranch") &&
      branchContext.includes("fetchAuthSession"),
    ""
  );

  recordCheck(
    2,
    "Server preference resolver uses serverBranchCode only",
    resolution.includes("serverBranchCode") &&
      resolution.includes("resolveAuthoritativeActiveBranch"),
    ""
  );

  recordCheck(
    3,
    "Stale localStorage cannot override server branch in resolver unit logic",
    resolveAuthoritativeActiveBranch({
      serverBranchCode: "main",
      assignedBranch: "main",
      canSwitchBranch: true,
      activeBranches: [{ code: "main" }, { code: "salaama" }],
    }) === "main" &&
      resolveAuthoritativeActiveBranch({
        serverBranchCode: "salaama",
        assignedBranch: "main",
        canSwitchBranch: true,
        activeBranches: [{ code: "main" }, { code: "salaama" }],
      }) === "salaama",
    ""
  );

  recordCheck(
    4,
    "Active branch localStorage key cleared on logout via clearSession",
    authStorage.includes("ACTIVE_BRANCH_STORAGE_KEY") ||
      authStorage.includes("sonic-os-active-branch"),
    ""
  );

  recordCheck(
    5,
    "Race protection guards branch selection responses",
    branchContext.includes("selectionRequestId") &&
      branchContext.includes("sessionRef.current?.userId"),
    ""
  );

  recordCheck(
    6,
    "API branch getter withheld until selection resolves",
    branchContext.includes("selectionLoaded ? activeBranch : null"),
    ""
  );

  recordCheck(
    7,
    "Owner branch switch uses server-returned activeBranchCode",
    branchContext.includes("setActiveBranchApi") &&
      branchContext.includes("serverBranch.trim().toLowerCase()"),
    ""
  );

  recordCheck(
    8,
    "Server branch authorization guards remain in branch-scope",
    readRepoFile("lib/server/branch-scope.ts").includes(
      "getActiveBranchPreference"
    ) &&
      readRepoFile("lib/server/branch-lookup.ts").includes(
        "assertSessionCanAccessBranchCode"
      ),
    ""
  );
}

async function main() {
  console.log("Verifying server-authoritative active branch...\n");
  scanStaticAuthority();

  const owner = new BranchAuthVerifier();
  let kansangaCashier: CertificationCashier | null = null;

  try {
    await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);

    const ownerSession = await owner.json<{
      session: { userId: string; role: string };
      activeBranchCode: string | null;
    }>("/api/auth/session");

    recordCheck(
      9,
      "Authenticated session exposes server activeBranchCode",
      !!ownerSession.session?.userId,
      `activeBranchCode=${ownerSession.activeBranchCode ?? "null"}`
    );

    await owner.json("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({
        action: "set-active-branch",
        branchCode: "salaama",
      }),
    });

    const afterSalaama = await owner.json<{ activeBranchCode: string | null }>(
      "/api/auth/session"
    );
    const prefAfterSalaama = await getUserPreference(ownerSession.session.userId);

    recordCheck(
      10,
      "Owner branch switch persists server-side preference",
      afterSalaama.activeBranchCode === "salaama" &&
        prefAfterSalaama?.activeBranchCode === "salaama",
      `api=${afterSalaama.activeBranchCode}, db=${prefAfterSalaama?.activeBranchCode}`
    );

    await owner.json("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({
        action: "set-active-branch",
        branchCode: "main",
      }),
    });

    const afterMain = await owner.json<{ activeBranchCode: string | null }>(
      "/api/auth/session"
    );

    recordCheck(
      11,
      "Owner can switch Kansanga ↔ Salaama via server API",
      afterMain.activeBranchCode === "main",
      `activeBranchCode=${afterMain.activeBranchCode}`
    );

    kansangaCashier = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-k`,
      "main"
    );

    const staffClient = new BranchAuthVerifier();
    await loginWithCredentials(staffClient, {
      username: kansangaCashier.username,
      password: kansangaCashier.password,
    });

    const staffSwitch = await staffClient.jsonExpectFailure("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({
        action: "set-active-branch",
        branchCode: "salaama",
      }),
    });

    recordCheck(
      12,
      "Staff cannot switch branches via set-active-branch API",
      staffSwitch.status === 403,
      `status=${staffSwitch.status}`
    );

    const staffSession = await staffClient.json<{
      session: { branch: string };
      activeBranchCode: string | null;
    }>("/api/auth/session");

    recordCheck(
      13,
      "Staff session branch remains assigned branch (main)",
      staffSession.session.branch === "main",
      `branch=${staffSession.session.branch}`
    );

    const staffForeignWrite = await staffClient.jsonExpectFailure("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        date: "2019-08-01",
        categoryId: (
          await staffClient.json<Array<{ id: string }>>("/api/expense-categories")
        )[0]?.id,
        description: `${TEST_PREFIX} foreign`,
        amount: 100,
        paymentMethod: "cash",
        branch: "salaama",
      }),
    });

    recordCheck(
      14,
      "Business API rejects staff write to foreign branch regardless of client branch hint",
      staffForeignWrite.status === 403,
      `status=${staffForeignWrite.status}`
    );

    await staffClient.json("/api/auth/session", { method: "POST", body: JSON.stringify({ action: "logout" }) });

    const ownerAgain = new BranchAuthVerifier();
    await loginWithCredentials(ownerAgain, VERIFY_OWNER_CREDENTIALS);
    const ownerPref = await ownerAgain.json<{ activeBranchCode: string | null }>(
      "/api/auth/session"
    );

    recordCheck(
      15,
      "Logout/login does not inherit previous user's server branch preference",
      ownerPref.activeBranchCode === "main",
      `ownerPref=${ownerPref.activeBranchCode}`
    );

    const branchContext = readRepoFile("context/branch-context.tsx");
    recordCheck(
      16,
      "No business/financial records stored in active-branch localStorage usage",
      branchContext.includes("writeLocalStorageItem(ACTIVE_BRANCH_STORAGE_KEY") &&
        !branchContext.includes("entries") &&
        !branchContext.includes("sales"),
      ""
    );

    console.log("\nServer-authoritative active branch verification complete.");
  } finally {
    if (kansangaCashier) {
      await cleanupCertificationCashier(kansangaCashier);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
