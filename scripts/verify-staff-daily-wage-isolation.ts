import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import {
  buildStaffPayoutRows,
} from "@/lib/day-closing/calculations";
import {
  findStaffDailyWagePayment,
  hasStaffDailyWagePayment,
} from "@/lib/staff-payments/calculations";
import { mapStaffPaymentToEntity } from "@/lib/server/mappers/entities";
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
const TEST_PREFIX = `verify-staff-wage-${Date.now()}`;
const TEST_DATE = "2019-09-12";
const BRANCH = "main";

function recordCheck(id: number, name: string, passed: boolean, detail: string) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

class WageVerifier {
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

function scanStaticIsolation(): void {
  const workspace = readRepoFile("components/operations/staff/staff-operations-workspace.tsx");
  const calculations = readRepoFile("lib/staff-payments/calculations.ts");
  const service = readRepoFile("lib/server/services/staff-payments-service.ts");

  recordCheck(
    1,
    "Staff operations wageRecorded uses per-staff helper",
    workspace.includes("hasStaffDailyWagePayment") &&
      !workspace.includes("const wageRecorded = staffPayouts > 0"),
    ""
  );

  recordCheck(
    2,
    "Duplicate guard scopes staffId + branchId + date",
    service.includes("staffId: staff.id") &&
      service.includes("branchId,") &&
      service.includes("date: input.date"),
    ""
  );

  recordCheck(
    3,
    "Per-staff payout helpers exported",
    calculations.includes("hasStaffDailyWagePayment") &&
      calculations.includes("findStaffDailyWagePayment"),
    ""
  );
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

async function main() {
  console.log("Verifying staff daily wage isolation (Fix #24)...\n");
  scanStaticIsolation();

  const owner = new WageVerifier();
  await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);

  let staffA: CertificationCashier | null = null;
  let staffB: CertificationCashier | null = null;

  try {
    staffA = await createCertificationCashier(owner, `${TEST_PREFIX}-a`, BRANCH);
    staffB = await createCertificationCashier(owner, `${TEST_PREFIX}-b`, BRANCH);

    const clientA = new WageVerifier();
    await loginWithCredentials(clientA, {
      username: staffA.username,
      password: staffA.password,
    });

    const paymentA = await clientA.json<{ id: string; staffId: string }>(
      "/api/staff-payments",
      {
        method: "POST",
        body: JSON.stringify({
          staffId: staffA.staffId,
          amount: 10000,
          date: TEST_DATE,
          paymentType: "daily-wage",
          paymentMethod: "cash",
        }),
      }
    );

    recordCheck(
      4,
      "Staff A daily wage persists with staffId attribution",
      paymentA.staffId === staffA.staffId,
      `staffId=${paymentA.staffId}`
    );

    const clientB = new WageVerifier();
    await loginWithCredentials(clientB, {
      username: staffB.username,
      password: staffB.password,
    });

    const paymentB = await clientB.json<{ id: string; staffId: string }>(
      "/api/staff-payments",
      {
        method: "POST",
        body: JSON.stringify({
          staffId: staffB.staffId,
          amount: 10000,
          date: TEST_DATE,
          paymentType: "daily-wage",
          paymentMethod: "cash",
        }),
      }
    );

    recordCheck(
      5,
      "Staff B can pay after Staff A on same branch/date",
      paymentB.staffId === staffB.staffId,
      `staffId=${paymentB.staffId}`
    );

    const duplicateA = await clientA.jsonExpectFailure("/api/staff-payments", {
      method: "POST",
      body: JSON.stringify({
        staffId: staffA.staffId,
        amount: 10000,
        date: TEST_DATE,
        paymentType: "daily-wage",
        paymentMethod: "cash",
      }),
    });

    recordCheck(
      6,
      "Staff A duplicate payment rejected",
      duplicateA.status === 409,
      `status=${duplicateA.status}`
    );

    const duplicateB = await clientB.jsonExpectFailure("/api/staff-payments", {
      method: "POST",
      body: JSON.stringify({
        staffId: staffB.staffId,
        amount: 10000,
        date: TEST_DATE,
        paymentType: "daily-wage",
        paymentMethod: "cash",
      }),
    });

    recordCheck(
      7,
      "Staff B duplicate payment rejected",
      duplicateB.status === 409,
      `status=${duplicateB.status}`
    );

    const crossStaffPay = await clientA.jsonExpectFailure("/api/staff-payments", {
      method: "POST",
      body: JSON.stringify({
        staffId: staffB.staffId,
        amount: 10000,
        date: TEST_DATE,
        paymentType: "daily-wage",
        paymentMethod: "cash",
      }),
    });

    recordCheck(
      8,
      "Staff A cannot create Staff B payment",
      crossStaffPay.status === 403,
      `status=${crossStaffPay.status}`
    );

    const branch = await prisma.branch.findFirstOrThrow({
      where: { code: BRANCH },
    });
    const paymentRows = await prisma.staffPayment.findMany({
      where: {
        branchId: branch.id,
        date: TEST_DATE,
        staffId: { in: [staffA.staffId, staffB.staffId] },
      },
      include: { branch: true, staff: { include: { branch: true } } },
    });
    const scoped = paymentRows.map(mapStaffPaymentToEntity);

    recordCheck(
      9,
      "Both staff payments remain individually attributable",
      scoped.some((payment) => payment.staffId === staffA!.staffId) &&
        scoped.some((payment) => payment.staffId === staffB!.staffId),
      `count=${scoped.length}`
    );

    recordCheck(
      10,
      "Client helper detects Staff B paid while Staff A state unchanged",
      hasStaffDailyWagePayment(staffA.staffId, BRANCH, TEST_DATE, scoped as never) &&
        hasStaffDailyWagePayment(staffB.staffId, BRANCH, TEST_DATE, scoped as never),
      ""
    );

    const otherDate = "2019-09-13";

    const otherDatePayment = await clientB.json<{ staffId: string }>(
      "/api/staff-payments",
      {
        method: "POST",
        body: JSON.stringify({
          staffId: staffB.staffId,
          amount: 10000,
          date: otherDate,
          paymentType: "daily-wage",
          paymentMethod: "cash",
        }),
      }
    );

    recordCheck(
      11,
      "Same staff member can be paid on a different business date",
      otherDatePayment.staffId === staffB.staffId,
      `date=${otherDate}`
    );

    const salaamaStaff = await createCertificationCashier(
      owner,
      `${TEST_PREFIX}-salaama`,
      "salaama"
    );

    const salaamaClient = new WageVerifier();
    await loginWithCredentials(salaamaClient, {
      username: salaamaStaff.username,
      password: salaamaStaff.password,
    });

    const foreignBranchPay = await salaamaClient.jsonExpectFailure(
      "/api/staff-payments",
      {
        method: "POST",
        body: JSON.stringify({
          staffId: staffA.staffId,
          amount: 10000,
          date: TEST_DATE,
          paymentType: "daily-wage",
          paymentMethod: "cash",
        }),
      }
    );

    recordCheck(
      12,
      "Cross-branch staff payment rejected",
      foreignBranchPay.status === 403 || foreignBranchPay.status === 404,
      `status=${foreignBranchPay.status}`
    );

    await cleanupCertificationCashier(salaamaStaff, {
      branch: "salaama",
      date: TEST_DATE,
    });

    const staffRows = await prisma.staff.findMany({
      where: { id: { in: [staffA.staffId, staffB.staffId] } },
      include: { staffPayments: { where: { date: TEST_DATE } } },
    });

    recordCheck(
      13,
      "PostgreSQL stores one payment row per staff member for the date",
      staffRows.every((row) => row.staffPayments.length === 1),
      staffRows
        .map((row) => `${row.id}:${row.staffPayments.length}`)
        .join(", ")
    );

    const payoutRows = buildStaffPayoutRows(
      staffRows.map((row) => ({
        id: row.id,
        name: row.name,
        branch: BRANCH,
        role: "cashier",
        active: true,
        dailyWage: 10000,
      })) as never,
      BRANCH,
      scoped as never,
      TEST_DATE
    );

    recordCheck(
      14,
      "Close-day payout rows mark each staff paidToday independently",
      payoutRows.every((row) => row.paidToday),
      payoutRows.map((row) => `${row.staffId}:${row.paidToday}`).join(", ")
    );

    assert.equal(
      findStaffDailyWagePayment(staffA.staffId, BRANCH, TEST_DATE, scoped as never)
        ?.staffId,
      staffA.staffId
    );
    assert.equal(
      findStaffDailyWagePayment(staffB.staffId, BRANCH, TEST_DATE, scoped as never)
        ?.staffId,
      staffB.staffId
    );

    console.log("\nStaff daily wage isolation verification complete.");
  } finally {
    const staffIds = [staffA?.staffId, staffB?.staffId].filter(Boolean) as string[];
    if (staffIds.length > 0) {
      await prisma.staffPayment
        .deleteMany({ where: { staffId: { in: staffIds } } })
        .catch(() => undefined);
    }
    if (staffA) {
      await cleanupCertificationCashier(staffA, { branch: BRANCH, date: TEST_DATE });
    }
    if (staffB) {
      await cleanupCertificationCashier(staffB, { branch: BRANCH, date: TEST_DATE });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
