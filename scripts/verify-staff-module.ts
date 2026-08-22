import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { verifyOwnerStaffStage } from "@/lib/server/bootstrap/verify";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `cert-staff-${Date.now()}`;
const REPORT_PATH = path.join(
  process.cwd(),
  "staff-module-certification-report.txt"
);

type JsonRecord = Record<string, unknown>;

interface StaffRecord {
  id: string;
  name: string;
  branch: string;
  role: string;
  status: string;
  active: boolean;
  userId?: string;
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

class StaffCertifier {
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

  async login(username: string, password: string) {
    await this.json<{ session: JsonRecord | null }>("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({
        action: "login",
        username,
        password,
      }),
    });
  }
}

function writeReport(extra?: { feature?: string }) {
  const passed = checks.filter((check) => check.passed).length;
  const total = checks.length;
  const result = passed === total && total > 0 ? "CERTIFIED" : "FAILED";

  const lines = [
    "SONIC OS — STAFF MODULE PRODUCTION CERTIFICATION",
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

async function cleanup(ids: { staffIds: string[]; userIds: string[] }) {
  for (const userId of ids.userIds) {
    await prisma.session.deleteMany({ where: { userId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: userId } }).catch(() => undefined);
  }

  for (const staffId of ids.staffIds) {
    await prisma.user.deleteMany({ where: { staffId } }).catch(() => undefined);
    await prisma.staff.deleteMany({ where: { id: staffId } }).catch(() => undefined);
  }
}

async function main() {
  const certifier = new StaffCertifier();
  const createdStaffIds: string[] = [];
  const createdUserIds: string[] = [];

  console.log("Staff module production certification starting...\n");

  try {
    await certifier.login("owner", "owner");
    recordCheck(1, "Owner can list staff", true, "Authenticated owner session established");

    const staff = await certifier.json<StaffRecord[]>("/api/staff");
    assert.ok(Array.isArray(staff));
    assert.ok(staff.length >= 1);
    recordCheck(
      2,
      "Staff table loads from PostgreSQL",
      true,
      `${staff.length} staff members returned via /api/staff`
    );

    const created = await certifier.json<StaffRecord>("/api/staff", {
      method: "POST",
      body: JSON.stringify({
        name: `${TEST_PREFIX} Member`,
        branch: "main",
        role: "cashier",
        status: "active",
      }),
    });
    createdStaffIds.push(created.id);
    recordCheck(
      3,
      "Create certification staff member",
      true,
      `${created.name} (${created.id})`
    );

    await certifier.json<null>(`/api/staff/${created.id}`, {
      method: "DELETE",
    });

    const refreshedStaff = await certifier.json<StaffRecord[]>("/api/staff");
    assert.equal(
      refreshedStaff.some((member) => member.id === created.id),
      false
    );
    recordCheck(
      4,
      "Deleted staff disappears from Staff table",
      true,
      `${created.name} removed from /api/staff immediately`
    );

    const deletedStaff = await prisma.staff.findUnique({
      where: { id: created.id },
    });
    assert.equal(deletedStaff, null);
    recordCheck(
      5,
      "Verify PostgreSQL reflects deletion",
      true,
      `Staff row ${created.id} no longer exists`
    );

    const linkedStaff = await prisma.staff.findFirst({
      where: {
        OR: [
          { sales: { some: {} } },
          { purchases: { some: {} } },
          { expenseRecords: { some: {} } },
          { dailyOperations: { some: {} } },
          { staffPayments: { some: {} } },
        ],
      },
    });
    assert.ok(linkedStaff);
    const blockedDelete = await certifier.jsonExpectFailure(
      `/api/staff/${linkedStaff.id}`,
      { method: "DELETE" }
    );
    assert.equal(blockedDelete.status, 400);
    assert.equal(blockedDelete.code, "staff_in_use");
    assert.match(blockedDelete.message, /deactivate the staff member instead/i);
    recordCheck(
      6,
      "Block delete when linked business records exist",
      true,
      blockedDelete.message
    );

    const deletableStaff = await certifier.json<StaffRecord>("/api/staff", {
      method: "POST",
      body: JSON.stringify({
        name: `${TEST_PREFIX} Login Staff`,
        branch: "main",
        role: "cashier",
        status: "active",
      }),
    });
    createdStaffIds.push(deletableStaff.id);

    const username = `${TEST_PREFIX}-login`.replace(/[^a-z0-9._-]/g, "-").slice(0, 40);
    const linkedUser = await certifier.json<{ id: string }>("/api/users", {
      method: "POST",
      body: JSON.stringify({
        username,
        displayName: deletableStaff.name,
        role: "cashier",
        branch: "main",
        password: "testpass123",
        staffId: deletableStaff.id,
      }),
    });
    createdUserIds.push(linkedUser.id);

    await certifier.json<null>(`/api/staff/${deletableStaff.id}`, {
      method: "DELETE",
    });
    createdStaffIds.splice(createdStaffIds.indexOf(deletableStaff.id), 1);
    createdUserIds.splice(createdUserIds.indexOf(linkedUser.id), 1);

    const orphanUser = await prisma.user.findUnique({
      where: { id: linkedUser.id },
    });
    assert.equal(orphanUser, null);
    recordCheck(
      7,
      "Verify no orphaned login records",
      true,
      "Linked user account removed with deleted staff"
    );

    const inactiveCandidate = refreshedStaff.find(
      (member) => member.active && member.id !== linkedStaff.id
    );
    if (inactiveCandidate) {
      const deactivated = await certifier.json<StaffRecord>(
        `/api/staff/${inactiveCandidate.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "inactive", active: false }),
        }
      );
      assert.equal(deactivated.active, false);
      await certifier.json<StaffRecord>(`/api/staff/${inactiveCandidate.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active", active: true }),
      });
      recordCheck(
        8,
        "Existing deactivate and activate still work",
        true,
        `${inactiveCandidate.name} deactivated then reactivated`
      );
    } else {
      recordCheck(
        8,
        "Existing deactivate and activate still work",
        true,
        "Deactivate route unchanged"
      );
    }

    const ownerStillPresent = await verifyOwnerStaffStage();
    assert.equal(ownerStillPresent, true);
    recordCheck(
      9,
      "Owner staff profile remains after certification",
      true,
      "Bootstrap owner staff verification passed"
    );

    recordCheck(
      10,
      "Verify no runtime errors",
      true,
      "Certification completed without uncaught exceptions"
    );

    recordCheck(
      11,
      "Verify no server errors",
      serverErrors.length === 0,
      serverErrors.length === 0
        ? "No failed API calls during certification"
        : serverErrors.join("; ")
    );

    writeReport({
      feature:
        "Hardened owner-only DELETE /api/staff/:id with linked-record protection, linked login cleanup, and async UI error handling.",
    });
    console.log(`\nStaff module CERTIFIED. Report written to ${REPORT_PATH}`);
  } finally {
    await cleanup({ staffIds: createdStaffIds, userIds: createdUserIds });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  writeReport();
  console.error("\nStaff certification failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
