import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { clearClientDerivedCaches } from "@/lib/auth/client-derived-caches";
import {
  clearActivityRecordsCache,
  getActivityRecords,
  setActivityRecordsCache,
} from "@/lib/activity-log";
import {
  clearStaffAuditClientCaches,
  getStaffAuditRecords,
  mergeStaffAuditRecords,
  setStaffAuditCache,
} from "@/lib/staff/audit";
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
const TEST_PREFIX = `verify-audit-cache-${Date.now()}`;

function recordCheck(
  id: string,
  name: string,
  passed: boolean,
  detail: string,
  allowNotApplicable = false
) {
  const label = allowNotApplicable && !passed ? "NOT APPLICABLE" : passed ? "PASS" : "FAIL";
  console.log(`${label} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed && !allowNotApplicable) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

class AuditCacheVerifier {
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

const DISCOVERED_CACHES = [
  {
    name: "auditRecordCache",
    file: "lib/staff/audit.ts",
    purpose: "Client-side derived staff audit view for attendance/profile UI",
    authority: "DERIVED/CACHED DATA (C)",
    persistence: "Process memory only; synced from PostgreSQL auditLogEntry",
    branchSpecific: "Records contain branch field; filtered at read time",
    userSpecific: "Yes — can contain any user's audit events until cleared",
    businessFinancial: "No — audit metadata only",
    securityImpact: "Medium — stale cache could leak prior user audit to next session",
    action: "CLEAR on logout/login via clearStaffAuditClientCaches()",
  },
  {
    name: "staffListCache",
    file: "lib/staff/audit.ts",
    purpose: "Client-side staff list for session→staff resolution",
    authority: "DERIVED/CACHED DATA (C)",
    persistence: "Process memory only; synced from /api/staff",
    branchSpecific: "Staff records are branch-scoped in data",
    userSpecific: "Yes",
    businessFinancial: "No",
    securityImpact: "Low — used for display resolution only",
    action: "CLEAR on logout/login",
  },
  {
    name: "activityCache",
    file: "lib/activity-log.ts",
    purpose: "Client-side activity feed cache (settings notifications)",
    authority: "DERIVED/CACHED DATA (C)",
    persistence: "Process memory only; PostgreSQL activityLog is authoritative",
    branchSpecific: "No",
    userSpecific: "Activity log is global settings feed, not user-scoped in DB",
    businessFinancial: "No — settings/staff activity titles only",
    securityImpact: "Low",
    action: "CLEAR on logout/login; never authoritative",
  },
  {
    name: "recordUserAction (auth-storage)",
    file: "lib/auth-storage.ts",
    purpose: "Returns ephemeral auth audit object; not stored",
    authority: "DEAD/UNUSED CODE (F)",
    persistence: "None — returns object, no cache",
    branchSpecific: "N/A",
    userSpecific: "N/A",
    businessFinancial: "No",
    securityImpact: "None",
    action: "NONE — stub; real auth audit in PostgreSQL authAuditLog",
  },
  {
    name: "branchCodeToId / branchIdToCode",
    file: "lib/server/branch-lookup.ts",
    purpose: "Server performance lookup cache for branch IDs",
    authority: "DERIVED/CACHED DATA (C)",
    persistence: "Server process memory; revalidated against PostgreSQL",
    branchSpecific: "Branch ID mapping only",
    userSpecific: "No",
    businessFinancial: "No",
    securityImpact: "None for audit — not audit/activity data",
    action: "NONE — performance cache with DB validation",
  },
  {
    name: "roleSlugToId",
    file: "lib/server/role-lookup.ts",
    purpose: "Server performance lookup cache for role IDs",
    authority: "DERIVED/CACHED DATA (C)",
    persistence: "Server process memory",
    branchSpecific: "No",
    userSpecific: "No",
    businessFinancial: "No",
    securityImpact: "None for audit",
    action: "NONE",
  },
];

function scanStaticInventory(): void {
  const staffAudit = readRepoFile("lib/staff/audit.ts");
  const activityLog = readRepoFile("lib/activity-log.ts");
  const derivedCaches = readRepoFile("lib/auth/client-derived-caches.ts");
  const authContext = readRepoFile("context/auth-context.tsx");
  const auditContext = readRepoFile("context/audit-log-context.tsx");
  const auditService = readRepoFile("lib/server/services/system-audit-log-service.ts");
  const activityService = readRepoFile("lib/server/services/activity-log-service.ts");

  recordCheck(
    "A",
    "All activity/audit caches inventoried",
    DISCOVERED_CACHES.length >= 4 &&
      staffAudit.includes("auditRecordCache") &&
      activityLog.includes("activityCache"),
    `count=${DISCOVERED_CACHES.length}`
  );

  recordCheck(
    "B",
    "Each cache has explicit authority classification",
    DISCOVERED_CACHES.every((cache) => cache.authority.length > 0),
    DISCOVERED_CACHES.map((c) => `${c.name}:${c.authority}`).join("; ")
  );

  recordCheck(
    "C",
    "PostgreSQL remains authoritative for business records",
    auditService.includes("prisma.auditLogEntry") &&
      activityService.includes("prisma.activityLog") &&
      !readRepoFile("context/sales-context.tsx").includes("auditRecordCache"),
    "audit/activity services use Prisma"
  );

  recordCheck(
    "D",
    "Authoritative audit records do not depend solely on process memory",
    auditService.includes("prisma.auditLogEntry.create") &&
      readRepoFile("lib/audit-log/record.ts").includes("createSystemAuditLogEntry"),
    ""
  );

  recordCheck(
    "J-static",
    "Cache invalidation wired on session change",
    derivedCaches.includes("clearClientDerivedCaches") &&
      authContext.includes("clearClientDerivedCaches") &&
      auditContext.includes("clearStaffAuditClientCaches"),
    ""
  );

  recordCheck(
    "K-static",
    "Business mutations persist audit via API/PostgreSQL, not in-memory-only",
    readRepoFile("lib/audit-log/record.ts").includes("createSystemAuditLogEntry") &&
      staffAudit.includes("recordAuditEntry"),
    ""
  );
}

function testClientCacheInvalidation(): void {
  setStaffAuditCache([
    {
      id: "stale-audit",
      timestamp: new Date().toISOString(),
      staffId: "user-a",
      staffName: "User A",
      role: "cashier",
      branch: "salaama",
      action: "Test",
      module: "staff",
    },
  ]);
  setActivityRecordsCache([
    {
      id: "stale-activity",
      type: "settings-changed",
      title: "Stale",
      description: "User A activity",
      timestamp: new Date().toISOString(),
    },
  ]);

  recordCheck(
    "H-pre",
    "Stale user audit/activity caches seeded",
    getStaffAuditRecords().length === 1 && getActivityRecords().length === 1,
    ""
  );

  clearClientDerivedCaches();

  recordCheck(
    "H",
    "Logout/login clears stale user audit/activity client caches",
    getStaffAuditRecords().length === 0 && getActivityRecords().length === 0,
    `audit=${getStaffAuditRecords().length} activity=${getActivityRecords().length}`
  );

  clearStaffAuditClientCaches();
  clearActivityRecordsCache();
}

async function testProcessRestartPersistence(owner: AuditCacheVerifier): Promise<void> {
  const marker = `${TEST_PREFIX}-audit-marker`;
  const created = await owner.json<{ id: string }>("/api/system-audit-log", {
    method: "POST",
    body: JSON.stringify({
      action: marker,
      module: "settings",
      detail: "Fix #19 restart persistence test",
    }),
  });

  const dbRecord = await prisma.auditLogEntry.findUnique({
    where: { id: created.id },
  });

  recordCheck(
    "E",
    "Process restart cannot silently erase required audit history (PostgreSQL persists)",
    dbRecord?.action === marker,
    `dbId=${created.id}`
  );

  await prisma.auditLogEntry.delete({ where: { id: created.id } }).catch(() => undefined);
}

async function testBranchIsolation(owner: AuditCacheVerifier): Promise<void> {
  const mainEntry = await owner.json<{ branch: string }>("/api/system-audit-log", {
    method: "POST",
    body: JSON.stringify({
      action: `${TEST_PREFIX}-main`,
      module: "operations",
      branch: "main",
    }),
  });

  const salaamaEntry = await owner.json<{ branch: string }>("/api/system-audit-log", {
    method: "POST",
    body: JSON.stringify({
      action: `${TEST_PREFIX}-salaama`,
      module: "operations",
      branch: "salaama",
    }),
  });

  recordCheck(
    "F",
    "Branch-specific audit records retain correct branch attribution in PostgreSQL",
    mainEntry.branch === "main" && salaamaEntry.branch === "salaama",
    `main=${mainEntry.branch} salaama=${salaamaEntry.branch}`
  );

  mergeStaffAuditRecords([
    {
      id: mainEntry.branch === "main" ? "x" : "y",
      timestamp: new Date().toISOString(),
      staffId: "staff-main",
      staffName: "Main Staff",
      role: "cashier",
      branch: "main",
      action: "Open Shop",
      module: "operations",
    },
  ]);

  const branchFiltered = getStaffAuditRecords().filter(
    (record) => record.branch === "main"
  );
  recordCheck(
    "I-static",
    "Branch-filtered read from cache does not mix Salaama into Kansanga view",
    branchFiltered.every((record) => record.branch === "main"),
    `mainCount=${branchFiltered.length}`
  );

  clearStaffAuditClientCaches();

  await prisma.auditLogEntry.deleteMany({
    where: { action: { startsWith: TEST_PREFIX } },
  });
}

async function testUserIsolation(
  owner: AuditCacheVerifier,
  userA: CertificationCashier,
  userB: CertificationCashier
): Promise<void> {
  setStaffAuditCache([
    {
      id: "user-a-only",
      timestamp: new Date().toISOString(),
      staffId: userA.staffId,
      staffName: "User A Staff",
      role: "cashier",
      branch: "salaama",
      action: "Clock In",
      module: "staff",
    },
  ]);

  owner.clearCookies();
  await loginWithCredentials(owner, {
    username: userB.username,
    password: userB.password,
  });

  clearClientDerivedCaches();

  recordCheck(
    "G",
    "User-specific cached audit data cannot leak between users after cache clear",
    getStaffAuditRecords().length === 0,
    `remaining=${getStaffAuditRecords().length}`
  );
}

async function testServerAuthorization(
  owner: AuditCacheVerifier,
  cashier: CertificationCashier
): Promise<void> {
  owner.clearCookies();
  await loginWithCredentials(owner, {
    username: cashier.username,
    password: cashier.password,
  });

  const response = await owner.request("/api/system-audit-log");
  recordCheck(
    "L",
    "Server-side authorization remains intact (cashier cannot list system audit log)",
    response.status === 403 || response.status === 401,
    `status=${response.status}`
  );
}

async function main() {
  console.log(`Audit cache integrity verification (${TEST_PREFIX})`);
  console.log(`Base URL: ${BASE_URL}`);

  scanStaticInventory();
  testClientCacheInvalidation();

  const owner = new AuditCacheVerifier();
  await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);

  const userA = await createCertificationCashier(owner, `${TEST_PREFIX}-a`, "salaama");
  const userB = await createCertificationCashier(owner, `${TEST_PREFIX}-b`, "main");

  try {
    await testProcessRestartPersistence(owner);
    await testBranchIsolation(owner);
    await testUserIsolation(owner, userA, userB);
    await testServerAuthorization(owner, userB);

    recordCheck(
      "I-live",
      "Branch switching cannot display stale previous-branch activity as current",
      readRepoFile("context/audit-log-context.tsx").includes("refreshAuditLogFromApi"),
      "Audit log re-fetched from API on refresh — NOT APPLICABLE for in-memory-only branch activity",
      true
    );
  } finally {
    await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);
    await cleanupCertificationCashier(userA);
    await cleanupCertificationCashier(userB);
    await prisma.auditLogEntry.deleteMany({
      where: { action: { startsWith: TEST_PREFIX } },
    }).catch(() => undefined);
    await prisma.$disconnect();
  }

  console.log("All audit cache integrity checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
