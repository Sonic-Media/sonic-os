import "dotenv/config";
import assert from "node:assert/strict";
import { loadEnvFiles } from "../lib/env/load-env";
import { prisma } from "../lib/db";
import {
  computeBranchOperationsSnapshot,
  formatBranchOperationsStatusLabel,
} from "../lib/branch/operations-state";
import { loginWithCredentials, VERIFY_OWNER_CREDENTIALS } from "./verify-session";

loadEnvFiles();

if (/neon/i.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("Refusing to run branch operations verification against Neon.");
}

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TODAY = new Date().toISOString().slice(0, 10);

type JsonClient = {
  json: <T>(path: string, options?: RequestInit) => Promise<T>;
};

class OperationsVerifier implements JsonClient {
  private cookieHeader = "";

  async json<T>(path: string, options: RequestInit = {}): Promise<T> {
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

    const payload = (await response.json()) as { data?: T; error?: unknown };
    if (!response.ok) {
      throw new Error(
        `${path} failed (${response.status}): ${JSON.stringify(payload.error ?? payload)}`
      );
    }

    return payload.data as T;
  }
}

async function setActiveBranch(client: OperationsVerifier, branch: string) {
  await client.json("/api/auth/session", {
    method: "POST",
    body: JSON.stringify({
      action: "set-active-branch",
      branchCode: branch,
    }),
  });
}

async function main() {
  const client = new OperationsVerifier();
  await loginWithCredentials(client, VERIFY_OWNER_CREDENTIALS);

  const closings = await client.json<
    Array<{
      branch: string;
      date: string;
      status: string;
      openedByName?: string;
      openedAt?: string;
    }>
  >("/api/day-closings");

  const todayClosings = closings.filter((record) => record.date === TODAY);
  const branchCodes = [...new Set(todayClosings.map((record) => record.branch))];

  console.log("Owner day closings for today:", branchCodes.join(", ") || "(none)");

  assert.ok(
    todayClosings.some((record) => record.branch === "main"),
    "Owner must receive Kansanga day closing records"
  );
  assert.ok(
    todayClosings.some((record) => record.branch === "salaama"),
    "Owner must receive Salaama day closing records"
  );

  const auditRecords = await client.json<
    Array<{
      id: string;
      timestamp: string;
      userId: string;
      userName: string;
      role: string;
      branch: string;
      action: string;
      module: string;
    }>
  >("/api/system-audit-log");

  const staff = await client.json<
    Array<{ id: string; name: string; branch: string; active: boolean }>
  >("/api/staff");

  const auditMapped = auditRecords.map((record) => ({
    id: record.id,
    timestamp: record.timestamp,
    staffId: record.userId,
    staffName: record.userName,
    role: record.role as never,
    branch: record.branch as never,
    action: record.action,
    module: record.module as never,
  }));

  const kansanga = computeBranchOperationsSnapshot(
    "main",
    TODAY,
    todayClosings as never,
    staff as never,
    auditMapped
  );
  const salaama = computeBranchOperationsSnapshot(
    "salaama",
    TODAY,
    todayClosings as never,
    staff as never,
    auditMapped
  );

  console.log(
    "Kansanga:",
    formatBranchOperationsStatusLabel(kansanga.status),
    "| opened by:",
    kansanga.openedByName ?? "—",
    "| staff:",
    kansanga.activeStaff.map((s) => s.staffName).join(", ") || "(none)"
  );
  console.log(
    "Salaama:",
    formatBranchOperationsStatusLabel(salaama.status),
    "| opened by:",
    salaama.openedByName ?? "—",
    "| staff:",
    salaama.activeStaff.map((s) => s.staffName).join(", ") || "(none)"
  );

  assert.equal(
    kansanga.activeStaff.some((staffMember) => staffMember.staffName === "Tony"),
    true,
    "Tony must appear only on Kansanga when on shift there"
  );
  assert.equal(
    salaama.activeStaff.some((staffMember) => staffMember.staffName === "Fazil"),
    true,
    "Fazil must appear only on Salaama when on shift there"
  );
  assert.equal(
    kansanga.activeStaff.some((staffMember) => staffMember.staffName === "Fazil"),
    false,
    "Fazil must not leak into Kansanga staff list"
  );
  assert.equal(
    salaama.activeStaff.some((staffMember) => staffMember.staffName === "Tony"),
    false,
    "Tony must not leak into Salaama staff list"
  );

  if (kansanga.status === "open") {
    assert.ok(kansanga.openedAt, "Open Kansanga must include openedAt");
  }

  await setActiveBranch(client, "main");
  const kansangaAfterSwitch = computeBranchOperationsSnapshot(
    "main",
    TODAY,
    await client.json("/api/day-closings"),
    staff as never,
    auditMapped
  );
  assert.equal(kansangaAfterSwitch.status, kansanga.status);

  console.log("PASS branch operations isolation verification");
}

main()
  .catch((error) => {
    console.error("FAIL branch operations verification:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
