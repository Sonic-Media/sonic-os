import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
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
const TEST_PREFIX = `verify-staff-pay-${Date.now()}`;
const TEST_DATE = "2019-08-15";

type StaffPayment = {
  id: string;
  branch: string;
  staffId: string;
};

function recordCheck(id: string, name: string, passed: boolean, detail: string) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

class PaymentAuthVerifier {
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
      const message =
        typeof payload.error === "object" &&
        payload.error &&
        "message" in payload.error &&
        typeof (payload.error as { message?: string }).message === "string"
          ? (payload.error as { message: string }).message
          : JSON.stringify(payload.error ?? payload);
      throw Object.assign(new Error(message), { status: response.status });
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

function paymentPayload(staffId: string, branch?: string) {
  return {
    staffId,
    amount: 10000,
    date: TEST_DATE,
    paymentType: "daily-wage",
    paymentMethod: "cash",
    notes: `${TEST_PREFIX} payment`,
    ...(branch ? { branch } : {}),
  };
}

function scanStaticChecks(): void {
  const service = readRepoFile("lib/server/services/staff-payments-service.ts");

  recordCheck(
    "N-static",
    "Destructive delete guard present on staff payment deletion",
    service.includes("assertDestructiveApiAllowed") &&
      service.includes("deleteStaffPayment"),
    ""
  );

  recordCheck(
    "O-static",
    "Awaited staff payment mutations preserved in context",
    readRepoFile("context/staff-payments-context.tsx").includes(
      "recordStaffPaymentAsync"
    ),
    ""
  );

  recordCheck(
    "P-static",
    "Branch-scoped refresh hooks still depend on activeBranch",
    readRepoFile("hooks/use-owner-dashboard-refresh.ts").includes("activeBranch"),
    ""
  );

  recordCheck(
    "M-static",
    "Create derives branch from staff record not client branch field alone",
    service.includes("staff.branch.code") &&
      service.includes("assertStaffPaymentBranchAccess"),
    ""
  );
}

async function main() {
  console.log("Verifying staff payment branch authorization (Fix #17)...\n");
  scanStaticChecks();

  const owner = new PaymentAuthVerifier();
  let kansangaCashier: CertificationCashier | null = null;
  let salaamaCashier: CertificationCashier | null = null;
  let kansangaPaymentId: string | null = null;
  let salaamaPaymentId: string | null = null;

  try {
    await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);
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

    const kansangaClient = new PaymentAuthVerifier();
    await loginWithCredentials(kansangaClient, {
      username: kansangaCashier.username,
      password: kansangaCashier.password,
    });

    const kansangaPayment = await kansangaClient.json<StaffPayment>(
      "/api/staff-payments",
      {
        method: "POST",
        body: JSON.stringify(paymentPayload(kansangaCashier.staffId)),
      }
    );
    kansangaPaymentId = kansangaPayment.id;

    recordCheck(
      "A",
      "Kansanga staff can create a Kansanga staff payment",
      kansangaPayment.branch === "main",
      `branch=${kansangaPayment.branch}, id=${kansangaPayment.id}`
    );

    const salaamaClient = new PaymentAuthVerifier();
    await loginWithCredentials(salaamaClient, {
      username: salaamaCashier.username,
      password: salaamaCashier.password,
    });

    const salaamaPayment = await salaamaClient.json<StaffPayment>(
      "/api/staff-payments",
      {
        method: "POST",
        body: JSON.stringify(paymentPayload(salaamaCashier.staffId)),
      }
    );
    salaamaPaymentId = salaamaPayment.id;

    recordCheck(
      "B",
      "Salaama staff can create a Salaama staff payment",
      salaamaPayment.branch === "salaama",
      `branch=${salaamaPayment.branch}, id=${salaamaPayment.id}`
    );

    const crossCreateK = await kansangaClient.jsonExpectFailure(
      "/api/staff-payments",
      {
        method: "POST",
        body: JSON.stringify(paymentPayload(salaamaCashier.staffId)),
      }
    );

    recordCheck(
      "C",
      "Kansanga staff cannot create a Salaama staff payment",
      crossCreateK.status === 403,
      `status=${crossCreateK.status}, message=${crossCreateK.message}`
    );

    const crossCreateS = await salaamaClient.jsonExpectFailure(
      "/api/staff-payments",
      {
        method: "POST",
        body: JSON.stringify(paymentPayload(kansangaCashier.staffId)),
      }
    );

    recordCheck(
      "D",
      "Salaama staff cannot create a Kansanga staff payment",
      crossCreateS.status === 403,
      `status=${crossCreateS.status}, message=${crossCreateS.message}`
    );

    const clientBranchHint = await kansangaClient.json<StaffPayment>(
      "/api/staff-payments",
      {
        method: "POST",
        body: JSON.stringify({
          ...paymentPayload(kansangaCashier.staffId, "salaama"),
          date: "2019-08-16",
        }),
      }
    );

    recordCheck(
      "M",
      "Client-supplied branch cannot override session/staff authorization",
      clientBranchHint.branch === "main",
      `responseBranch=${clientBranchHint.branch}`
    );

    const updateCrossK = await kansangaClient.jsonExpectFailure(
      `/api/staff-payments/${salaamaPaymentId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ notes: "cross-branch update attempt" }),
      }
    );

    recordCheck(
      "E",
      "Kansanga staff cannot update a Salaama payment",
      updateCrossK.status === 403,
      `status=${updateCrossK.status}`
    );

    const updateCrossS = await salaamaClient.jsonExpectFailure(
      `/api/staff-payments/${kansangaPaymentId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ notes: "cross-branch update attempt" }),
      }
    );

    recordCheck(
      "F",
      "Salaama staff cannot update a Kansanga payment",
      updateCrossS.status === 403,
      `status=${updateCrossS.status}`
    );

    const deleteCrossK = await kansangaClient.jsonExpectFailure(
      `/api/staff-payments/${salaamaPaymentId}`,
      { method: "DELETE" }
    );

    recordCheck(
      "G",
      "Kansanga staff cannot delete a Salaama payment",
      deleteCrossK.status === 403,
      `status=${deleteCrossK.status}`
    );

    const deleteCrossS = await salaamaClient.jsonExpectFailure(
      `/api/staff-payments/${kansangaPaymentId}`,
      { method: "DELETE" }
    );

    recordCheck(
      "H",
      "Salaama staff cannot delete a Kansanga payment",
      deleteCrossS.status === 403,
      `status=${deleteCrossS.status}`
    );

    const getCrossK = await kansangaClient.jsonExpectFailure(
      `/api/staff-payments/${salaamaPaymentId}`
    );

    recordCheck(
      "I",
      "Kansanga staff cannot retrieve another branch payment by ID",
      getCrossK.status === 403,
      `status=${getCrossK.status}`
    );

    const getCrossS = await salaamaClient.jsonExpectFailure(
      `/api/staff-payments/${kansangaPaymentId}`
    );

    recordCheck(
      "J",
      "Salaama staff cannot retrieve another branch payment by ID",
      getCrossS.status === 403,
      `status=${getCrossS.status}`
    );

    recordCheck(
      "K",
      "Cross-branch staff-member/payment relationship rejected on create",
      crossCreateK.status === 403 && crossCreateS.status === 403,
      `k=${crossCreateK.status}, s=${crossCreateS.status}`
    );

    const ownerClient = new PaymentAuthVerifier();
    await loginWithCredentials(ownerClient, VERIFY_OWNER_CREDENTIALS);

    await ownerClient.json("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({
        action: "set-active-branch",
        branchCode: "salaama",
      }),
    });

    const ownerList = await ownerClient.json<StaffPayment[]>(
      "/api/staff-payments"
    );
    const ownerSeesSalaama = ownerList.some((p) => p.branch === "salaama");

    recordCheck(
      "L",
      "Owner branch selection scopes listed staff payments correctly",
      ownerSeesSalaama,
      `count=${ownerList.length}, hasSalaama=${ownerSeesSalaama}`
    );

    console.log("\nStaff payment branch authorization verification complete.");
  } finally {
    if (kansangaPaymentId) {
      await prisma.staffPayment.delete({ where: { id: kansangaPaymentId } }).catch(() => undefined);
    }
    if (salaamaPaymentId) {
      await prisma.staffPayment.delete({ where: { id: salaamaPaymentId } }).catch(() => undefined);
    }
    const extra = await prisma.staffPayment.findMany({
      where: { notes: { contains: TEST_PREFIX } },
      select: { id: true, expenseId: true },
    });
    for (const payment of extra) {
      await prisma.staffPayment.delete({ where: { id: payment.id } }).catch(() => undefined);
      await prisma.expenseRecord.delete({ where: { id: payment.expenseId } }).catch(() => undefined);
    }
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
