import "dotenv/config";
import assert from "node:assert/strict";
import { loadEnvFiles } from "../lib/env/load-env";
import { prisma } from "../lib/db";
import { getTodayISO } from "../lib/dates";
import { loginWithCredentials, VERIFY_OWNER_CREDENTIALS } from "./verify-session";

loadEnvFiles();

if (/neon/i.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("Refusing to run historical staff payment verification against Neon.");
}

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";

type JsonClient = {
  json: <T>(path: string, options?: RequestInit) => Promise<T>;
  request: (path: string, options?: RequestInit) => Promise<Response>;
};

class PaymentVerifier implements JsonClient {
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
    const payload = (await response.json()) as { data?: T; error?: unknown };
    if (!response.ok) {
      throw new Error(
        `${path} failed (${response.status}): ${JSON.stringify(payload.error ?? payload)}`
      );
    }
    return payload.data as T;
  }
}

async function main() {
  const client = new PaymentVerifier();
  await loginWithCredentials(client, VERIFY_OWNER_CREDENTIALS);

  const staff = await client.json<Array<{ id: string; name: string; branch: string }>>(
    "/api/staff"
  );
  const tony = staff.find((member) => member.name === "Tony");
  assert.ok(tony, "Tony must exist for verification");

  const today = getTodayISO();
  const historicalDate = "2020-01-15";

  const liveBlocked = await client.request("/api/staff-payments", {
    method: "POST",
    body: JSON.stringify({
      staffId: tony.id,
      date: today,
      branch: tony.branch,
      amount: 1000,
      paymentType: "daily-wage",
      paymentMethod: "cash",
    }),
  });

  assert.equal(liveBlocked.status, 403, "Owner must be blocked from live staff payments");
  const livePayload = (await liveBlocked.json()) as {
    error?: { message?: string };
  };
  assert.match(
    livePayload.error?.message ?? "",
    /Owners cannot perform staff operational actions/i
  );
  console.log("PASS owner blocked from live-day staff payment");

  await prisma.staffPayment.deleteMany({
    where: { staffId: tony.id, date: historicalDate },
  });
  await prisma.expenseRecord.deleteMany({
    where: { staffId: tony.id, date: historicalDate },
  });

  const created = await client.json<{ id: string; amount: number; branch: string; date: string }>(
    "/api/staff-payments",
    {
      method: "POST",
      body: JSON.stringify({
        staffId: tony.id,
        date: historicalDate,
        branch: tony.branch,
        amount: 10000,
        paymentType: "daily-wage",
        paymentMethod: "cash",
      }),
    }
  );

  assert.equal(created.amount, 10000);
  assert.equal(created.date, historicalDate);
  assert.equal(created.branch, tony.branch);
  console.log("PASS owner can record historical staff payment");

  await prisma.staffPayment.delete({ where: { id: created.id } }).catch(() => undefined);
  await prisma.expenseRecord.deleteMany({ where: { staffPaymentId: created.id } });

  console.log("PASS historical staff payment verification");
}

main()
  .catch((error) => {
    console.error("FAIL historical staff payment verification:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
