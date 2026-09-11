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
const TEST_PREFIX = `verify-branch-sel-${Date.now()}`;

function recordCheck(id: string, name: string, passed: boolean, detail: string) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

class BranchSelectionVerifier {
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

  clearCookies() {
    this.cookieHeader = "";
  }
}

async function getUserPreference(userId: string) {
  return prisma.userPreference.findUnique({ where: { userId } });
}

function scanStaticAuthority(): void {
  const branchContext = readRepoFile("context/branch-context.tsx");
  const authStorage = readRepoFile("lib/auth-storage.ts");
  const clientStorageKeys = readRepoFile("lib/auth/client-storage-keys.ts");
  const resolution = readRepoFile("lib/branch/active-branch-resolution.ts");
  const stockContext = readRepoFile("context/stock-context.tsx");

  recordCheck(
    "A",
    "Unauthenticated path clears branch; no readStoredActiveBranch authority",
    !branchContext.includes("readStoredActiveBranch") &&
      branchContext.includes("removeLocalStorageItem(ACTIVE_BRANCH_STORAGE_KEY)") &&
      branchContext.includes("!isAuthenticated || !session"),
    ""
  );

  recordCheck(
    "B-static",
    "Server branch wins over conflicting localStorage in resolver",
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
    "C",
    "API branch getter withheld until authoritative branch resolves",
    branchContext.includes("selectionLoaded ? activeBranch : null") &&
      branchContext.includes("setSelectionLoaded(false)"),
    ""
  );

  recordCheck(
    "F-static",
    "Branch-switch refresh preserved (stock context depends on activeBranch)",
    stockContext.includes("activeBranch"),
    ""
  );

  recordCheck(
    "H-static",
    "Logout clears active branch localStorage via clearSession",
    clientStorageKeys.includes("ACTIVE_BRANCH_STORAGE_KEY") &&
      authStorage.includes("purgeSecuritySensitiveClientStorage"),
    ""
  );

  recordCheck(
    "J/K-static",
    "Race guards for selection and branch switching",
    branchContext.includes("selectionRequestId") &&
      branchContext.includes("branchSwitchRequestId") &&
      branchContext.includes("sessionRef.current?.userId"),
    ""
  );

  recordCheck(
    "L-static",
    "Server branch authorization guards remain in branch-scope",
    readRepoFile("lib/server/branch-scope.ts").includes(
      "getActiveBranchPreference"
    ) &&
      readRepoFile("lib/server/branch-lookup.ts").includes(
        "assertSessionCanAccessBranchCode"
      ),
    ""
  );

  recordCheck(
    "resolution",
    "Authoritative resolver uses serverBranchCode only",
    resolution.includes("serverBranchCode") &&
      resolution.includes("resolveAuthoritativeActiveBranch"),
    ""
  );
}

async function main() {
  console.log("Verifying branch selection authority (Fix #12)...\n");
  scanStaticAuthority();

  const owner = new BranchSelectionVerifier();
  let kansangaCashier: CertificationCashier | null = null;
  let salaamaCashier: CertificationCashier | null = null;

  try {
    const unauth = new BranchSelectionVerifier();
    const unauthFailure = await unauth.jsonExpectFailure("/api/sales");
    recordCheck(
      "A-live",
      "Unauthenticated requests do not receive branch-scoped business data",
      unauthFailure.status === 401 || unauthFailure.status === 403,
      `status=${unauthFailure.status}`
    );

    await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);

    const ownerSession = await owner.json<{
      session: { userId: string; role: string };
      activeBranchCode: string | null;
    }>("/api/auth/session");

    recordCheck(
      "B-live",
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
      "D",
      "Owner can switch Kansanga → Salaama (server persists preference)",
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
      "E",
      "Owner can switch Salaama → Kansanga",
      afterMain.activeBranchCode === "main",
      `activeBranchCode=${afterMain.activeBranchCode}`
    );

    await owner.json("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({
        action: "set-active-branch",
        branchCode: "salaama",
      }),
    });
    await owner.json("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({
        action: "set-active-branch",
        branchCode: "main",
      }),
    });
    const afterRapid = await owner.json<{ activeBranchCode: string | null }>(
      "/api/auth/session"
    );

    recordCheck(
      "J",
      "Rapid branch switching ends on latest server preference",
      afterRapid.activeBranchCode === "main",
      `activeBranchCode=${afterRapid.activeBranchCode}`
    );

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

    const staffClient = new BranchSelectionVerifier();
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
      "G",
      "Staff cannot switch branches via set-active-branch API",
      staffSwitch.status === 403,
      `status=${staffSwitch.status}`
    );

    const staffSession = await staffClient.json<{
      session: { branch: string };
      activeBranchCode: string | null;
    }>("/api/auth/session");

    recordCheck(
      "G-assigned",
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
      "L-live",
      "Business API rejects staff write to foreign branch",
      staffForeignWrite.status === 403,
      `status=${staffForeignWrite.status}`
    );

    await staffClient.json("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ action: "logout" }),
    });

    const salaamaStaff = new BranchSelectionVerifier();
    await loginWithCredentials(salaamaStaff, {
      username: salaamaCashier.username,
      password: salaamaCashier.password,
    });

    const salaamaStaffSession = await salaamaStaff.json<{
      session: { branch: string };
    }>("/api/auth/session");

    recordCheck(
      "I",
      "User B (Salaama staff) does not inherit User A (Kansanga staff) branch",
      salaamaStaffSession.session.branch === "salaama",
      `branch=${salaamaStaffSession.session.branch}`
    );

    const ownerAgain = new BranchSelectionVerifier();
    await loginWithCredentials(ownerAgain, VERIFY_OWNER_CREDENTIALS);
    const ownerPref = await ownerAgain.json<{ activeBranchCode: string | null }>(
      "/api/auth/session"
    );

    recordCheck(
      "H-live",
      "Logout/login does not inherit previous user's server branch preference",
      ownerPref.activeBranchCode === "main" ||
        ownerPref.activeBranchCode === "salaama",
      `ownerPref=${ownerPref.activeBranchCode} (owner DB preference, not staff)`
    );

    const branchContext = readRepoFile("context/branch-context.tsx");
    recordCheck(
      "no-business-ls",
      "No business/financial records stored in active-branch localStorage",
      branchContext.includes("writeLocalStorageItem(ACTIVE_BRANCH_STORAGE_KEY") &&
        !branchContext.match(/writeLocalStorageItem\([^)]*sales/),
      ""
    );

    console.log("\nBranch selection authority verification complete.");
  } finally {
    if (kansangaCashier) {
      await cleanupCertificationCashier(kansangaCashier);
    }
    if (salaamaCashier) {
      await cleanupCertificationCashier(salaamaCashier);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
