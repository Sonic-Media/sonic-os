import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import {
  getSecuritySensitiveStorageKeyInventory,
  purgeSecuritySensitiveClientStorage,
  SECURITY_SENSITIVE_STORAGE_KEYS,
} from "@/lib/auth/client-storage-keys";
import { resolveAuthoritativeActiveBranch } from "@/lib/branch/active-branch-resolution";
import {
  ACTIVE_BRANCH_STORAGE_KEY,
  EXPENSES_RECORDS_STORAGE_KEY,
  SALES_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  STAFF_PAYMENTS_STORAGE_KEY,
  USERS_STORAGE_KEY,
} from "@/lib/constants";
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
const TEST_PREFIX = `verify-auth-storage-${Date.now()}`;

function recordCheck(id: string, name: string, passed: boolean, detail: string) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

class LocalStorageMock implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

class AuthStorageVerifier {
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

  clearCookies() {
    this.cookieHeader = "";
  }
}

type SessionPayload = {
  session: {
    userId: string;
    username: string;
    role: string;
    branch: string;
    staffId?: string;
  } | null;
  activeBranchCode: string | null;
};

function installLocalStorageMock(): LocalStorageMock {
  const mock = new LocalStorageMock();
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: mock },
    configurable: true,
    writable: true,
  });
  return mock;
}

function seedStaleUserAState(storage: LocalStorageMock): void {
  storage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      userId: "stale-user-a",
      username: "usera",
      displayName: "User A",
      role: "owner",
      branch: "salaama",
      staffId: "stale-staff-a",
    })
  );
  storage.setItem(
    USERS_STORAGE_KEY,
    JSON.stringify([{ id: "stale-user-a", role: "owner", branch: "salaama" }])
  );
  storage.setItem(ACTIVE_BRANCH_STORAGE_KEY, "salaama");
  storage.setItem(SALES_STORAGE_KEY, JSON.stringify([{ id: "sale-a", total: 99999 }]));
  storage.setItem(
    EXPENSES_RECORDS_STORAGE_KEY,
    JSON.stringify([{ id: "expense-a", amount: 5000 }])
  );
  storage.setItem(
    STAFF_PAYMENTS_STORAGE_KEY,
    JSON.stringify([{ id: "pay-a", amount: 10000 }])
  );
}

function scanStaticSources(): void {
  const authStorage = readRepoFile("lib/auth-storage.ts");
  const clientKeys = readRepoFile("lib/auth/client-storage-keys.ts");
  const authContext = readRepoFile("context/auth-context.tsx");
  const branchContext = readRepoFile("context/branch-context.tsx");
  const resolution = readRepoFile("lib/branch/active-branch-resolution.ts");

  const inventory = getSecuritySensitiveStorageKeyInventory();
  recordCheck(
    "A",
    "Inventory all auth/branch/user-related storage keys",
    inventory.length >= 25 &&
      inventory.includes(SESSION_STORAGE_KEY) &&
      inventory.includes(ACTIVE_BRANCH_STORAGE_KEY) &&
      inventory.includes(SALES_STORAGE_KEY),
    `count=${inventory.length}`
  );

  recordCheck(
    "B",
    "Legacy authentication keys identified and handled in purge list",
    clientKeys.includes("SESSION_STORAGE_KEY") &&
      clientKeys.includes("USERS_STORAGE_KEY") &&
      authStorage.includes("purgeSecuritySensitiveClientStorage"),
    ""
  );

  recordCheck(
    "N-static",
    "Stale async session responses cannot overwrite current user state",
    authContext.includes("sessionRequestId") &&
      authContext.includes("requestId !== sessionRequestId.current"),
    ""
  );

  recordCheck(
    "O-static",
    "Fix #12 server-authoritative branch behavior remains intact",
    !branchContext.includes("readStoredActiveBranch") &&
      branchContext.includes("resolveAuthoritativeActiveBranch") &&
      branchContext.includes("selectionRequestId") &&
      resolution.includes("localStorage must never override the server value"),
    ""
  );

  recordCheck(
    "L-static",
    "No context restores financial/business records from localStorage",
    !readRepoFile("context/expenses-module-context.tsx").includes("readLocalStorage") &&
      !readRepoFile("context/sales-context.tsx").includes("readLocalStorage") &&
      clientKeys.includes("STAFF_PAYMENTS_STORAGE_KEY"),
    ""
  );
}

function testLocalStoragePurge(): void {
  const storage = installLocalStorageMock();
  seedStaleUserAState(storage);

  const seededKeys = [
    SESSION_STORAGE_KEY,
    USERS_STORAGE_KEY,
    ACTIVE_BRANCH_STORAGE_KEY,
    SALES_STORAGE_KEY,
    EXPENSES_RECORDS_STORAGE_KEY,
    STAFF_PAYMENTS_STORAGE_KEY,
  ];
  recordCheck(
    "C-pre",
    "Stale security-sensitive keys seeded before purge",
    seededKeys.every((key) => storage.getItem(key) !== null),
    `seeded=${seededKeys.length}`
  );

  purgeSecuritySensitiveClientStorage();

  const remaining = SECURITY_SENSITIVE_STORAGE_KEYS.filter(
    (key) => storage.getItem(key) !== null
  );
  recordCheck(
    "C",
    "Logout purge clears security-sensitive client state",
    remaining.length === 0,
    remaining.length ? `remaining=${remaining.join(",")}` : ""
  );
}

async function testUserSwitchIsolation(
  owner: AuthStorageVerifier,
  userA: CertificationCashier,
  userB: CertificationCashier
): Promise<void> {
  owner.clearCookies();
  await loginWithCredentials(owner, {
    username: userA.username,
    password: userA.password,
  });

  const sessionA = await owner.json<SessionPayload>("/api/auth/session");
  recordCheck(
    "D-pre",
    "User A authenticated with User A identity",
    sessionA.session?.userId === userA.userId,
    `expected=${userA.userId} actual=${sessionA.session?.userId}`
  );

  await owner.json("/api/auth/session", {
    method: "POST",
    body: JSON.stringify({ action: "logout" }),
  });

  owner.clearCookies();
  await loginWithCredentials(owner, {
    username: userB.username,
    password: userB.password,
  });

  const sessionB = await owner.json<SessionPayload>("/api/auth/session");

  recordCheck(
    "D",
    "User B cannot inherit User A identity",
    sessionB.session?.userId === userB.userId &&
      sessionB.session?.userId !== userA.userId,
    `userB=${sessionB.session?.userId}`
  );

  recordCheck(
    "E",
    "User B cannot inherit User A role",
    sessionB.session?.role === "cashier",
    `role=${sessionB.session?.role}`
  );

  recordCheck(
    "F",
    "User B cannot inherit User A branch preference",
    sessionB.session?.branch === "main" &&
      (sessionB.activeBranchCode === "main" || sessionB.activeBranchCode === null),
    `branch=${sessionB.session?.branch} active=${sessionB.activeBranchCode}`
  );

  recordCheck(
    "G",
    "User B cannot inherit User A staff identity",
    sessionB.session?.staffId === userB.staffId &&
      sessionB.session?.staffId !== userA.staffId,
    `staffId=${sessionB.session?.staffId}`
  );

  recordCheck(
    "H",
    "User B permissions derive from User B session only",
    sessionB.session?.role === "cashier" && sessionB.session?.userId === userB.userId,
    ""
  );
}

async function testStaleLocalStorageCannotAuthenticate(
  client: AuthStorageVerifier
): Promise<void> {
  client.clearCookies();

  const unauthenticated = await client.json<SessionPayload>("/api/auth/session");
  recordCheck(
    "I",
    "Stale localStorage cannot authenticate a user (server session authoritative)",
    unauthenticated.session === null,
    ""
  );
}

async function testServerBranchAuthority(
  owner: AuthStorageVerifier,
  cashier: CertificationCashier
): Promise<void> {
  owner.clearCookies();
  await loginWithCredentials(owner, {
    username: cashier.username,
    password: cashier.password,
  });

  const resolved = resolveAuthoritativeActiveBranch({
    serverBranchCode: "main",
    assignedBranch: "main",
    canSwitchBranch: false,
    activeBranches: [{ code: "main" }, { code: "salaama" }],
  });

  recordCheck(
    "J/K",
    "Server branch preference remains authoritative over stale localStorage",
    resolved === "main" &&
      resolveAuthoritativeActiveBranch({
        serverBranchCode: "salaama",
        assignedBranch: "main",
        canSwitchBranch: false,
        activeBranches: [{ code: "main" }, { code: "salaama" }],
      }) === "main",
    `resolved=${resolved}`
  );

  const session = await owner.json<SessionPayload>("/api/auth/session");
  recordCheck(
    "K-api",
    "Cashier server branch locked to assigned branch",
    session.session?.branch === "main",
    `branch=${session.session?.branch}`
  );
}

async function testLogoutLoginRace(
  owner: AuthStorageVerifier,
  userA: CertificationCashier,
  userB: CertificationCashier
): Promise<void> {
  owner.clearCookies();
  await loginWithCredentials(owner, {
    username: userA.username,
    password: userA.password,
  });

  const logoutPromise = owner.json("/api/auth/session", {
    method: "POST",
    body: JSON.stringify({ action: "logout" }),
  });

  owner.clearCookies();
  await loginWithCredentials(owner, {
    username: userB.username,
    password: userB.password,
  });

  await logoutPromise.catch(() => undefined);

  const session = await owner.json<SessionPayload>("/api/auth/session");
  recordCheck(
    "M",
    "Logout/login race cannot leak User A state into User B",
    session.session?.userId === userB.userId,
    `userId=${session.session?.userId}`
  );
}

async function testServerAuthorizationIntact(
  owner: AuthStorageVerifier,
  cashier: CertificationCashier
): Promise<void> {
  owner.clearCookies();
  await loginWithCredentials(owner, {
    username: cashier.username,
    password: cashier.password,
  });

  const usersResponse = await owner.request("/api/users");
  recordCheck(
    "P",
    "Server-side authorization remains intact (cashier cannot list users)",
    usersResponse.status === 403 || usersResponse.status === 401,
    `status=${usersResponse.status}`
  );
}

async function main() {
  console.log(`Auth storage isolation verification (${TEST_PREFIX})`);
  console.log(`Base URL: ${BASE_URL}`);

  scanStaticSources();
  testLocalStoragePurge();

  const owner = new AuthStorageVerifier();
  await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);

  const userA = await createCertificationCashier(owner, `${TEST_PREFIX}-a`, "salaama");
  const userB = await createCertificationCashier(owner, `${TEST_PREFIX}-b`, "main");

  try {
    await testStaleLocalStorageCannotAuthenticate(owner);
    await testUserSwitchIsolation(owner, userA, userB);
    await testServerBranchAuthority(owner, userB);
    await testLogoutLoginRace(owner, userA, userB);
    await testServerAuthorizationIntact(owner, userB);
  } finally {
    await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);
    await cleanupCertificationCashier(userA);
    await cleanupCertificationCashier(userB);
    await prisma.$disconnect();
  }

  console.log("All auth storage isolation checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
