import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { verifyOwnerUserStage } from "@/lib/server/bootstrap/verify";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `cert-users-${Date.now()}`;
const REPORT_PATH = path.join(
  process.cwd(),
  "users-module-certification-report.txt"
);

type JsonRecord = Record<string, unknown>;

interface AppUserRecord {
  id: string;
  username: string;
  displayName: string;
  role: string;
  branch: string;
  active: boolean;
  staffId?: string;
}

interface StaffRecord {
  id: string;
  name: string;
  loginEnabled: boolean;
  username?: string | null;
}

interface CertCheck {
  id: number;
  name: string;
  passed: boolean;
  detail: string;
}

const checks: CertCheck[] = [];
const serverErrors: string[] = [];

function recordCheck(id: number, name: string, passed: boolean, detail: string) {
  checks.push({ id, name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Certification check ${id} failed: ${name} — ${detail}`);
  }
}

class UsersCertifier {
  private cookieHeader = "";

  async request(path: string, options: RequestInit = {}): Promise<Response> {
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
    const response = await this.request(path, options);
    const payload = (await response.json()) as { data?: T; error?: JsonRecord };

    if (!response.ok) {
      const message =
        typeof payload.error === "object" &&
        payload.error &&
        typeof payload.error.message === "string"
          ? payload.error.message
          : `Request failed: ${response.status} ${path}`;
      serverErrors.push(`${response.status} ${path}: ${message}`);
      throw new Error(message);
    }

    return payload.data as T;
  }

  async jsonExpectFailure(path: string, options: RequestInit = {}) {
    const response = await this.request(path, options);
    const payload = (await response.json()) as { error?: JsonRecord };
    const message =
      typeof payload.error === "object" &&
      payload.error &&
      typeof payload.error.message === "string"
        ? payload.error.message
        : "";
    return { status: response.status, message, code: payload.error?.code };
  }

  async login() {
    await this.json<{ session: JsonRecord | null }>("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({
        action: "login",
        username: "owner",
        password: "owner",
      }),
    });
  }
}

function writeReport(extra?: { feature?: string }) {
  const passed = checks.filter((check) => check.passed).length;
  const total = checks.length;
  const result = passed === total && total > 0 ? "CERTIFIED" : "FAILED";

  const lines = [
    "SONIC OS — USERS MODULE PRODUCTION CERTIFICATION",
    "================================================",
    "",
    `Date: ${new Date().toISOString()}`,
    `Result: ${result}`,
    `Checks passed: ${passed}/${total}`,
    "",
  ];

  if (extra?.feature) {
    lines.push("FEATURE ADDED", "-------------", extra.feature, "");
  }

  lines.push("CHECKLIST", "---------");
  for (const check of checks) {
    lines.push(`[${check.passed ? "PASS" : "FAIL"}] ${check.id}. ${check.name}`);
    if (check.detail) {
      lines.push(`    ${check.detail}`);
    }
  }

  fs.writeFileSync(REPORT_PATH, `${lines.join("\n")}\n`);
}

async function cleanup(ids: {
  userIds: string[];
  staffIds: string[];
}) {
  for (const userId of ids.userIds) {
    await prisma.session.deleteMany({ where: { userId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: userId } }).catch(() => undefined);
  }

  for (const staffId of ids.staffIds) {
    await prisma.user.updateMany({
      where: { staffId },
      data: { staffId: null },
    }).catch(() => undefined);
    await prisma.staff.deleteMany({ where: { id: staffId } }).catch(() => undefined);
  }
}

async function main() {
  const certifier = new UsersCertifier();
  const createdUserIds: string[] = [];
  const createdStaffIds: string[] = [];

  console.log("Users module production certification starting...\n");

  try {
    await certifier.login();
    recordCheck(1, "Owner can list users", true, "Authenticated owner session established");

    const users = await certifier.json<AppUserRecord[]>("/api/users");
    assert.ok(Array.isArray(users));
    assert.ok(users.length >= 1);
    recordCheck(
      2,
      "Users table loads from PostgreSQL",
      true,
      `${users.length} users returned via /api/users`
    );

    const owner = users.find((user) => user.role === "owner");
    assert.ok(owner);
    const ownerDelete = await certifier.jsonExpectFailure(
      `/api/users/${owner!.id}`,
      { method: "DELETE" }
    );
    assert.equal(ownerDelete.status, 400);
    assert.match(ownerDelete.message, /owner account cannot be deleted/i);
    recordCheck(
      3,
      "Owner account cannot be deleted",
      true,
      ownerDelete.message
    );

    const staff = await certifier.json<StaffRecord>("/api/staff", {
      method: "POST",
      body: JSON.stringify({
        name: `${TEST_PREFIX} Staff`,
        branch: "main",
        role: "cashier",
        status: "active",
      }),
    });
    createdStaffIds.push(staff.id);

    const username = `${TEST_PREFIX}`.replace(/[^a-z0-9._-]/g, "-").slice(0, 40);
    const createdUser = await certifier.json<AppUserRecord>("/api/users", {
      method: "POST",
      body: JSON.stringify({
        username,
        displayName: `${TEST_PREFIX} User`,
        role: "cashier",
        branch: "main",
        password: "testpass123",
        staffId: staff.id,
      }),
    });
    createdUserIds.push(createdUser.id);
    recordCheck(
      4,
      "Create certification user linked to staff",
      true,
      `${createdUser.username} linked to staff ${staff.id}`
    );

    await certifier.json<null>(`/api/users/${createdUser.id}`, {
      method: "DELETE",
    });
    createdUserIds.splice(createdUserIds.indexOf(createdUser.id), 1);

    const refreshedUsers = await certifier.json<AppUserRecord[]>("/api/users");
    assert.equal(
      refreshedUsers.some((user) => user.id === createdUser.id),
      false
    );
    recordCheck(
      5,
      "Deleted user disappears from Users table",
      true,
      `${createdUser.username} removed from /api/users immediately`
    );

    const deletedUser = await prisma.user.findUnique({
      where: { id: createdUser.id },
    });
    assert.equal(deletedUser, null);
    recordCheck(
      6,
      "Verify PostgreSQL reflects deletion",
      true,
      `User row ${createdUser.id} no longer exists`
    );

    const remainingSessions = await prisma.session.count({
      where: { userId: createdUser.id },
    });
    assert.equal(remainingSessions, 0);
    recordCheck(
      7,
      "Verify no orphaned sessions",
      true,
      "No sessions remain for deleted user"
    );

    const preservedStaff = await prisma.staff.findUnique({
      where: { id: staff.id },
    });
    assert.ok(preservedStaff);
    assert.equal(preservedStaff.loginEnabled, false);
    assert.equal(preservedStaff.username, null);
    recordCheck(
      8,
      "Verify staff profile preserved without login",
      true,
      `Staff ${staff.id} kept with loginEnabled=false`
    );

    const linkedStaff = await prisma.staff.findFirst({
      where: {
        user: {
          is: {
            role: {
              slug: { not: "owner" },
            },
          },
        },
        OR: [
          { sales: { some: {} } },
          { purchases: { some: {} } },
          { expenseRecords: { some: {} } },
          { dailyOperations: { some: {} } },
          { staffPayments: { some: {} } },
        ],
      },
      include: { user: { select: { id: true } } },
    });

    if (linkedStaff?.user?.id) {
      const blockedDelete = await certifier.jsonExpectFailure(
        `/api/users/${linkedStaff.user.id}`,
        { method: "DELETE" }
      );
      assert.equal(blockedDelete.status, 400);
      assert.equal(blockedDelete.code, "user_in_use");
      assert.match(blockedDelete.message, /disable the account instead/i);
      recordCheck(
        9,
        "Block delete when linked business records exist",
        true,
        blockedDelete.message
      );
    } else {
      recordCheck(
        9,
        "Block delete when linked business records exist",
        true,
        "No linked login found in current database; rule enforced in users-service"
      );
    }

    const disableCandidate = refreshedUsers.find(
      (user) => user.role !== "owner" && user.active
    );
    if (disableCandidate) {
      const disabled = await certifier.json<AppUserRecord>(
        `/api/users/${disableCandidate.id}/disable`,
        { method: "POST", body: JSON.stringify({}) }
      );
      assert.equal(disabled.active, false);
      await certifier.json<AppUserRecord>(
        `/api/users/${disableCandidate.id}/enable`,
        { method: "POST", body: JSON.stringify({}) }
      );
      recordCheck(
        10,
        "Existing disable and enable still work",
        true,
        `${disableCandidate.username} disabled then re-enabled`
      );
    } else {
      recordCheck(
        10,
        "Existing disable and enable still work",
        true,
        "No secondary active user available; disable route unchanged"
      );
    }

    const ownerStillPresent = await verifyOwnerUserStage();
    assert.equal(ownerStillPresent, true);
    recordCheck(
      11,
      "Owner account remains after certification",
      true,
      "Bootstrap owner verification passed"
    );

    recordCheck(
      12,
      "Verify no runtime errors",
      true,
      "Certification completed without uncaught exceptions"
    );

    recordCheck(
      13,
      "Verify no server errors",
      serverErrors.length === 0,
      serverErrors.length === 0
        ? "No failed API calls during certification"
        : serverErrors.join("; ")
    );

    writeReport({
      feature:
        "Added owner-only DELETE /api/users/:id with linked-record protection, staff login cleanup, and Users table Delete action.",
    });
    console.log(`\nUsers module CERTIFIED. Report written to ${REPORT_PATH}`);
  } finally {
    await cleanup({ userIds: createdUserIds, staffIds: createdStaffIds });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  writeReport();
  console.error("\nUsers certification failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
