import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvFiles } from "../lib/env/load-env";
import { ApiError } from "../lib/api/errors";
import {
  assertSessionCanAccessBranchCode,
  getBranchIdForSession,
} from "../lib/server/branch-lookup";
import { assertRecordInSessionBranchScope } from "../lib/server/branch-record-guard";
import { removeDailyOperationsByIds } from "../lib/server/services/daily-operations-service";
import { prisma } from "../lib/db";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";
import { loginWithCredentials, VERIFY_OWNER_CREDENTIALS } from "./verify-session";

loadEnvFiles();

if (/neon/i.test(process.env.DATABASE_URL ?? "")) {
  throw new Error(
    "Refusing to run branch authorization verification against Neon."
  );
}

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";

type JsonClient = {
  json: <T>(path: string, options?: RequestInit) => Promise<T>;
  raw: (path: string, options?: RequestInit) => Promise<Response>;
};

class AuthClient implements JsonClient {
  private cookieHeader = "";

  async raw(path: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (this.cookieHeader) {
      headers.set("Cookie", this.cookieHeader);
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      this.cookieHeader = setCookie
        .split(",")
        .map((part) => part.split(";")[0]?.trim())
        .filter(Boolean)
        .join("; ");
    }

    return response;
  }

  async json<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await this.raw(path, options);
    const payload = (await response.json()) as { data?: T; error?: unknown };

    if (!response.ok) {
      throw new ApiError(
        JSON.stringify(payload.error ?? payload),
        { status: response.status }
      );
    }

    return payload.data as T;
  }
}

function expectForbidden(run: () => void | Promise<void>, label: string): void {
  try {
    const result = run();
    if (result instanceof Promise) {
      throw new Error(`${label}: expected rejection, got promise`);
    }
    assert.fail(`${label}: expected rejection, got success`);
  } catch (error) {
    if (error instanceof ApiError) {
      assert.equal(error.status, 403, `${label}: expected 403`);
      return;
    }
    if (error instanceof assert.AssertionError) {
      throw error;
    }
    assert.ok(true, `${label}: rejected`);
  }
}

function testSessionBranchCodeMatrix(): void {
  const ownerSession = {
    userId: "owner-test",
    username: "owner",
    displayName: "Owner",
    role: "owner" as const,
    branch: "main" as const,
    loggedInAt: new Date().toISOString(),
  };

  const salaamaStaffSession = {
    userId: "staff-salaama",
    username: "staff-salaama",
    displayName: "Salaama Staff",
    role: "cashier" as const,
    branch: "salaama" as const,
    loggedInAt: new Date().toISOString(),
  };

  const kansangaStaffSession = {
    userId: "staff-kansanga",
    username: "staff-kansanga",
    displayName: "Kansanga Staff",
    role: "cashier" as const,
    branch: "main" as const,
    loggedInAt: new Date().toISOString(),
  };

  assert.doesNotThrow(
    () => assertSessionCanAccessBranchCode(ownerSession, "main"),
    "owner → Kansanga/main"
  );
  assert.doesNotThrow(
    () => assertSessionCanAccessBranchCode(ownerSession, "salaama"),
    "owner → Salaama"
  );
  assert.doesNotThrow(
    () => assertSessionCanAccessBranchCode(ownerSession, "kansanga"),
    "owner → kansanga alias"
  );

  assert.doesNotThrow(
    () => assertSessionCanAccessBranchCode(salaamaStaffSession, "salaama"),
    "Salaama staff → Salaama"
  );
  expectForbidden(
    () => assertSessionCanAccessBranchCode(salaamaStaffSession, "main"),
    "Salaama staff → Kansanga/main"
  );
  expectForbidden(
    () => assertSessionCanAccessBranchCode(salaamaStaffSession, "kansanga"),
    "Salaama staff → kansanga alias"
  );

  assert.doesNotThrow(
    () => assertSessionCanAccessBranchCode(kansangaStaffSession, "main"),
    "Kansanga staff → main"
  );
  assert.doesNotThrow(
    () => assertSessionCanAccessBranchCode(kansangaStaffSession, "kansanga"),
    "Kansanga staff → kansanga alias"
  );
  expectForbidden(
    () => assertSessionCanAccessBranchCode(kansangaStaffSession, "salaama"),
    "Kansanga staff → Salaama"
  );
}

async function resolveBranchId(code: string): Promise<string> {
  const branch = await prisma.branch.findFirst({
    where: { code, active: true },
    select: { id: true },
  });
  assert.ok(branch, `Branch ${code} must exist`);
  return branch.id;
}

async function testOwnerBranchResolution(): Promise<void> {
  const ownerSession = {
    userId: "owner-test",
    username: "owner",
    displayName: "Owner",
    role: "owner" as const,
    branch: "main" as const,
    loggedInAt: new Date().toISOString(),
  };

  const mainBranchId = await getBranchIdForSession(ownerSession, "main");
  const salaamaBranchId = await getBranchIdForSession(ownerSession, "salaama");
  const kansangaBranchId = await getBranchIdForSession(ownerSession, "kansanga");

  assert.ok(mainBranchId, "Owner must resolve Kansanga/main branch");
  assert.ok(salaamaBranchId, "Owner must resolve Salaama branch");
  assert.equal(
    mainBranchId,
    kansangaBranchId,
    "Owner kansanga alias must resolve to main branch"
  );
  assert.notEqual(mainBranchId, salaamaBranchId, "Main and Salaama differ");
}

async function testRecordScopeAndBulkDelete(): Promise<void> {
  const salaamaBranchId = await resolveBranchId("salaama");
  const mainBranchId = await resolveBranchId("main");

  const salaamaStaffSession = {
    userId: "staff-salaama",
    username: "staff-salaama",
    displayName: "Salaama Staff",
    role: "cashier" as const,
    branch: "salaama" as const,
    loggedInAt: new Date().toISOString(),
  };

  await assertRecordInSessionBranchScope(salaamaStaffSession, salaamaBranchId);

  await assert.rejects(
    () => assertRecordInSessionBranchScope(salaamaStaffSession, mainBranchId),
    (error: unknown) => error instanceof ApiError && error.status === 404,
    "Unauthorized branch record scope"
  );

  const salaamaOp = await prisma.dailyOperation.create({
    data: {
      id: randomUUID(),
      date: "2099-01-01",
      time: "09:00",
      timestamp: BigInt(Date.now()),
      branchId: salaamaBranchId,
      sales: 1,
      staffName: "Verify",
      status: "draft",
    },
  });

  const mainOp = await prisma.dailyOperation.create({
    data: {
      id: randomUUID(),
      date: "2099-01-02",
      time: "09:00",
      timestamp: BigInt(Date.now()),
      branchId: mainBranchId,
      sales: 1,
      staffName: "Verify",
      status: "draft",
    },
  });

  try {
    await assert.rejects(
      () => removeDailyOperationsByIds([mainOp.id], salaamaStaffSession),
      (error: unknown) => error instanceof ApiError && error.status === 404,
      "Bulk delete must not cross branch boundaries"
    );

    const ownBranchDeleted = await removeDailyOperationsByIds(
      [salaamaOp.id],
      salaamaStaffSession
    );
    assert.equal(ownBranchDeleted, 1, "Staff may delete within own branch");
  } finally {
    await prisma.dailyOperation.deleteMany({
      where: { id: { in: [salaamaOp.id, mainOp.id] } },
    });
  }
}

async function testApiAuthorization(): Promise<void> {
  const testPrefix = `verify-branch-auth-${Date.now()}`;
  const owner = new AuthClient();
  await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);

  let kansangaStaff: CertificationCashier | null = null;
  let salaamaStaff: CertificationCashier | null = null;
  let manager: CertificationCashier | null = null;

  try {
    kansangaStaff = await createCertificationCashier(
      owner,
      `${testPrefix}-kansanga`,
      "main"
    );
    salaamaStaff = await createCertificationCashier(
      owner,
      `${testPrefix}-salaama`,
      "salaama"
    );
    manager = await createCertificationCashier(
      owner,
      `${testPrefix}-manager`,
      "main",
      "branch-manager"
    );

    const kansangaClient = new AuthClient();
    await loginWithCredentials(kansangaClient, {
      username: kansangaStaff.username,
      password: kansangaStaff.password,
    });

    const salaamaClient = new AuthClient();
    await loginWithCredentials(salaamaClient, {
      username: salaamaStaff.username,
      password: salaamaStaff.password,
    });

    const managerClient = new AuthClient();
    await loginWithCredentials(managerClient, {
      username: manager.username,
      password: manager.password,
    });

    const kansangaOpenOwn = await kansangaClient.raw("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "main",
        date: "2099-06-01",
      }),
    });
    assert.ok(
      kansangaOpenOwn.ok || kansangaOpenOwn.status === 409,
      "Kansanga staff may open own branch day"
    );

    const salaamaOpenOwn = await salaamaClient.raw("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "salaama",
        date: "2099-06-01",
      }),
    });
    assert.ok(
      salaamaOpenOwn.ok || salaamaOpenOwn.status === 409,
      "Salaama staff may open own branch day"
    );

    const kansangaCrossSalaama = await kansangaClient.raw("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "salaama",
        date: "2099-06-02",
      }),
    });
    assert.equal(
      kansangaCrossSalaama.status,
      403,
      "Kansanga staff → Salaama day open must be rejected"
    );

    const salaamaCrossKansanga = await salaamaClient.raw("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "main",
        date: "2099-06-02",
      }),
    });
    assert.equal(
      salaamaCrossKansanga.status,
      403,
      "Salaama staff → Kansanga day open must be rejected"
    );

    const kansangaCrossAttendance = await kansangaClient.raw(
      "/api/staff/attendance",
      {
        method: "POST",
        body: JSON.stringify({
          action: "clock-in",
          branch: "salaama",
          date: "2099-06-01",
        }),
      }
    );
    assert.equal(
      kansangaCrossAttendance.status,
      403,
      "Kansanga staff attendance on Salaama must be rejected"
    );

    const mainBranchId = await resolveBranchId("main");
    const crossBranchOp = await prisma.dailyOperation.create({
      data: {
        id: randomUUID(),
        date: "2099-01-03",
        time: "09:00",
        timestamp: BigInt(Date.now()),
        branchId: mainBranchId,
        sales: 1,
        staffName: "Verify",
        status: "draft",
      },
    });

    try {
      const unauthorizedDelete = await salaamaClient.raw(
        `/api/daily-operations/${crossBranchOp.id}`,
        { method: "DELETE" }
      );
      assert.equal(
        unauthorizedDelete.status,
        404,
        "Unauthorized record delete must be rejected"
      );
    } finally {
      await prisma.dailyOperation.deleteMany({
        where: { id: crossBranchOp.id },
      });
    }

    const bulkDeleteForbidden = await managerClient.raw(
      "/api/daily-operations/bulk-delete",
      {
        method: "POST",
        body: JSON.stringify({ ids: [randomUUID()] }),
      }
    );
    assert.equal(
      bulkDeleteForbidden.status,
      403,
      "Bulk delete must be owner-only"
    );

    const ownerBulkDelete = await owner.raw(
      "/api/daily-operations/bulk-delete",
      {
        method: "POST",
        body: JSON.stringify({ ids: [] }),
      }
    );
    assert.ok(ownerBulkDelete.ok, "Owner may call bulk delete endpoint");
  } finally {
    if (kansangaStaff) {
      await cleanupCertificationCashier(kansangaStaff, {
        branch: "main",
        date: "2099-06-01",
      });
    }
    if (salaamaStaff) {
      await cleanupCertificationCashier(salaamaStaff, {
        branch: "salaama",
        date: "2099-06-01",
      });
    }
    if (manager) {
      await cleanupCertificationCashier(manager);
    }
  }
}

async function main() {
  console.log("[verify-branch-authorization] Session branch matrix...");
  testSessionBranchCodeMatrix();

  console.log("[verify-branch-authorization] Owner branch resolution...");
  await testOwnerBranchResolution();

  console.log("[verify-branch-authorization] Record scope + bulk delete...");
  await testRecordScopeAndBulkDelete();

  console.log("[verify-branch-authorization] API authorization...");
  await testApiAuthorization();

  console.log("[verify-branch-authorization] All checks passed.");
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "[verify-branch-authorization] failed"
  );
  process.exit(1);
});
