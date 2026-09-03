import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvFiles } from "../lib/env/load-env";
import { prisma } from "../lib/db";
import { loginWithCredentials, VERIFY_OWNER_CREDENTIALS } from "./verify-session";

loadEnvFiles();

if (/neon/i.test(process.env.DATABASE_URL ?? "")) {
  throw new Error(
    "Refusing to run historical operations save verification against Neon."
  );
}

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const HISTORICAL_DATE = `2019-06-${String(Math.floor(Math.random() * 20) + 1).padStart(2, "0")}`;
const BRANCH = "main";
const OTHER_BRANCH = "salaama";

type EntryPayload = {
  id: string;
  date: string;
  branch: string;
  sales: number;
  expenses: Array<{ id: string; name: string; amount: number }>;
  status: "draft" | "completed";
  notes: string;
  savingsAllocation: number;
  time: string;
  timestamp: number;
  createdAt: string;
};

type JsonClient = {
  json: <T>(path: string, options?: RequestInit) => Promise<T>;
};

class SaveVerifier implements JsonClient {
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

function buildEntry(
  id: string,
  branch: string,
  status: "draft" | "completed",
  sales = 50000
): EntryPayload {
  const now = new Date().toISOString();
  return {
    id,
    date: HISTORICAL_DATE,
    branch,
    sales,
    expenses: [{ id: randomUUID(), name: "Rent", amount: 10000 }],
    status,
    notes: "Historical verification entry",
    savingsAllocation: sales - 10000,
    time: "09:00 AM",
    timestamp: Math.floor(Date.now() / 1000),
    createdAt: now,
  };
}

async function readDbStatus(id: string): Promise<string | null> {
  const record = await prisma.dailyOperation.findUnique({
    where: { id },
    select: { status: true, branchId: true },
  });
  return record?.status ?? null;
}

async function cleanup(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.dailyOperationExpense.deleteMany({
    where: { dailyOperationId: { in: ids } },
  });
  await prisma.dailyOperation.deleteMany({
    where: { id: { in: ids } },
  });
}

async function main() {
  const client = new SaveVerifier();
  await loginWithCredentials(client, VERIFY_OWNER_CREDENTIALS);

  const draftId = randomUUID();
  const completedId = randomUUID();
  const otherBranchId = randomUUID();
  const createdIds = [draftId, completedId, otherBranchId];

  await cleanup(createdIds);

  const draftEntry = buildEntry(draftId, BRANCH, "draft", 30000);
  const savedDraft = await client.json<{ id: string; status: string }>(
    "/api/daily-operations",
    {
      method: "POST",
      body: JSON.stringify(draftEntry),
    }
  );

  assert.equal(savedDraft.status, "draft");
  assert.equal(await readDbStatus(savedDraft.id), "draft");
  console.log("PASS historical draft save persists draft status");

  const completedEntry = buildEntry(savedDraft.id, BRANCH, "completed", 45000);
  const savedCompleted = await client.json<{ id: string; status: string }>(
    "/api/daily-operations",
    {
      method: "POST",
      body: JSON.stringify(completedEntry),
    }
  );

  assert.equal(savedCompleted.status, "completed");
  assert.equal(await readDbStatus(savedCompleted.id), "completed");
  console.log("PASS historical finalize save persists completed status");

  const editedCompleted = buildEntry(savedCompleted.id, BRANCH, "completed", 47000);
  const savedEdit = await client.json<{ id: string; status: string }>(
    "/api/daily-operations",
    {
      method: "POST",
      body: JSON.stringify(editedCompleted),
    }
  );

  assert.equal(savedEdit.status, "completed");
  assert.equal(await readDbStatus(savedEdit.id), "completed");
  console.log("PASS editing completed historical record stays completed");

  const otherBranchEntry = buildEntry(otherBranchId, OTHER_BRANCH, "completed");
  const savedOtherBranch = await client.json<{ id: string; status: string; branch: string }>(
    "/api/daily-operations",
    {
      method: "POST",
      body: JSON.stringify(otherBranchEntry),
    }
  );

  assert.equal(savedOtherBranch.branch, OTHER_BRANCH);
  assert.equal(savedOtherBranch.status, "completed");
  assert.equal(await readDbStatus(savedOtherBranch.id), "completed");
  assert.equal(await readDbStatus(savedCompleted.id), "completed");
  console.log("PASS branch isolation preserved for historical saves");

  const freshCompleted = buildEntry(completedId, BRANCH, "completed", 60000);
  const savedFresh = await client.json<{ id: string; status: string }>(
    "/api/daily-operations",
    {
      method: "POST",
      body: JSON.stringify({ ...freshCompleted, date: `2019-07-${String(Math.floor(Math.random() * 20) + 1).padStart(2, "0")}` }),
    }
  );

  assert.equal(savedFresh.status, "completed");
  assert.equal(await readDbStatus(savedFresh.id), "completed");
  console.log("PASS new historical record saved directly as completed");

  await cleanup([
    savedDraft.id,
    savedCompleted.id,
    savedOtherBranch.id,
    savedFresh.id,
  ]);
  console.log("PASS historical operations save verification");
}

main()
  .catch((error) => {
    console.error("FAIL historical operations save verification:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
