#!/usr/bin/env tsx
import "dotenv/config";
import { prisma } from "@/lib/db";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
} from "./verify-bootstrap";
import { loginWithCredentials, VERIFY_OWNER_CREDENTIALS } from "./verify-session";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `v312-detail-${Date.now()}`;
const DATE = "2099-03-25";

function recordCheck(id: string, name: string, passed: boolean, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

class Client {
  cookieHeader = "";
  private async request(apiPath: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (this.cookieHeader) headers.set("Cookie", this.cookieHeader);
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
    const payload = (await response.json()) as {
      data?: T;
      error?: { message?: string; code?: string };
    };
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `Request failed ${response.status}`);
    }
    return payload.data as T;
  }
  async jsonExpectFailure(apiPath: string, options: RequestInit = {}) {
    const response = await this.request(apiPath, options);
    const payload = (await response.json()) as { error?: { message?: string; code?: string } };
    return { status: response.status, code: payload.error?.code };
  }
}

async function cleanup(branchCode: string) {
  const branch = await prisma.branch.findFirst({ where: { code: branchCode } });
  if (!branch) return;
  await prisma.expenseRecord.deleteMany({ where: { branchId: branch.id, date: DATE } }).catch(() => undefined);
  await prisma.dailyOperation.deleteMany({ where: { branchId: branch.id, date: DATE } }).catch(() => undefined);
  await prisma.dayClosing.deleteMany({ where: { branchId: branch.id, date: DATE } }).catch(() => undefined);
}

async function main() {
  console.log("Verifying financial detail visibility...\n");
  const owner = new Client();
  const staff = new Client();
  let cashier: Awaited<ReturnType<typeof createCertificationCashier>> | null = null;

  try {
    await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);
    cashier = await createCertificationCashier(owner, TEST_PREFIX, "main");
    await loginWithCredentials(staff, {
      username: cashier.username,
      password: cashier.password,
    });
    await staff.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({ action: "open", branch: "main", date: DATE }),
    });
    await staff.json("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        date: DATE,
        categoryId: "transport",
        description: "Transport",
        amount: 12000,
        paymentMethod: "cash",
        branch: "main",
      }),
    });
    await staff.json("/api/daily-operations", {
      method: "POST",
      body: JSON.stringify({
        id: crypto.randomUUID(),
        date: DATE,
        time: "10:14",
        timestamp: Date.now(),
        branch: "main",
        sales: 20000,
        staffName: TEST_PREFIX,
        expenses: [{ id: crypto.randomUUID(), name: "Transport", amount: 12000 }],
        notes: "",
        status: "draft",
        createdAt: new Date().toISOString(),
      }),
    });

    const denied = await staff.jsonExpectFailure(
      `/api/admin/financial-detail?branch=main&date=${DATE}`
    );
    recordCheck("A", "Staff cannot load owner financial detail", denied.status === 403, String(denied.status));

    const detail = await owner.json<{
      totals: { movieRevenue: number; totalExpenditure: number };
      expenditureByCategory: Array<{ category: string; lines: Array<{ description: string; staffName: string | null; timestamp: string }> }>;
      incomeBySource: Array<{ source: string }>;
      expenditureByStaff: Array<{ staffName: string }>;
    }>(`/api/admin/financial-detail?branch=main&date=${DATE}`);

    const transport = detail.expenditureByCategory
      .flatMap((group) => group.lines)
      .find((line) => line.description === "Transport");
    recordCheck("B", "Exact expenditure is visible", Boolean(transport), transport?.description);
    recordCheck("C", "Staff attribution is visible", Boolean(transport?.staffName), transport?.staffName ?? "");
    recordCheck("D", "Timestamp is visible", Boolean(transport?.timestamp), transport?.timestamp ?? "");
    recordCheck(
      "E",
      "Movie revenue is visible",
      detail.totals.movieRevenue === 20000 &&
        detail.incomeBySource.some((group) => group.source === "Movie Revenue"),
      String(detail.totals.movieRevenue)
    );
    recordCheck(
      "F",
      "Income source/service uses existing names",
      detail.incomeBySource.every((group) => group.source.length > 0),
      detail.incomeBySource.map((group) => group.source).join(",")
    );

    const salaama = await owner.json<{ totals: { totalExpenditure: number; movieRevenue: number } }>(
      `/api/admin/financial-detail?branch=salaama&date=${DATE}`
    );
    recordCheck(
      "G",
      "Branch scoping keeps Salaama empty for this fixture",
      salaama.totals.totalExpenditure === 0 && salaama.totals.movieRevenue === 0,
      JSON.stringify(salaama.totals)
    );
  } finally {
    if (cashier) {
      await cleanupCertificationCashier(cashier, { branch: "main", date: DATE });
    }
    await cleanup("main");
  }

  console.log("\nFinancial detail verification complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
