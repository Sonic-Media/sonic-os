import "dotenv/config";
import assert from "node:assert/strict";
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
const TEST_PREFIX = `verify-import-undo-${Date.now()}`;

type JsonRecord = Record<string, unknown>;

function recordCheck(id: number, name: string, passed: boolean, detail: string) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

class ImportUndoVerifier {
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

    const payload = (await response.json()) as { data?: T; error?: JsonRecord };
    if (!response.ok) {
      const message =
        typeof payload.error === "object" &&
        payload.error &&
        typeof payload.error.message === "string"
          ? payload.error.message
          : `Request failed: ${response.status} ${apiPath}`;
      throw new Error(message);
    }

    return payload.data as T;
  }

  async jsonExpectFailure(apiPath: string, options: RequestInit = {}) {
    const response = await this.request(apiPath, options);
    const payload = (await response.json()) as { error?: JsonRecord };
    const message =
      typeof payload.error === "object" &&
      payload.error &&
      typeof payload.error.message === "string"
        ? payload.error.message
        : "";
    return { status: response.status, message };
  }

  async loginAsOwner() {
    await loginWithCredentials(this, VERIFY_OWNER_CREDENTIALS);
  }

  async loginAsCashier(cashier: CertificationCashier) {
    await loginWithCredentials(this, {
      username: cashier.username,
      password: cashier.password,
    });
  }
}

function buildTestEntry(id: string, date: string, branch: string) {
  return {
    id,
    date,
    time: "09:00",
    timestamp: Date.now(),
    branch,
    sales: 1000,
    expenses: [{ id: crypto.randomUUID(), name: "Test", amount: 100 }],
    staffName: `${TEST_PREFIX} Staff`,
    status: "completed",
  };
}

async function countOperations(ids: string[]) {
  return prisma.dailyOperation.count({
    where: { id: { in: ids } },
  });
}

function scanAwaitedUndoPattern(): void {
  const entriesSource = fs.readFileSync(
    path.join(process.cwd(), "context/entries-context.tsx"),
    "utf8"
  );
  const hookSource = fs.readFileSync(
    path.join(process.cwd(), "hooks/use-historical-import.ts"),
    "utf8"
  );

  recordCheck(
    1,
    "removeEntriesByIds awaits bulk delete before updating state",
    entriesSource.includes("async (ids: string[])") &&
      entriesSource.includes("await bulkDeleteDailyOperationsApi") &&
      !entriesSource.includes("void (async () => {\n      try {\n        await runOnApi(async () => {\n          await bulkDeleteDailyOperationsApi"),
    ""
  );

  recordCheck(
    2,
    "undoLastImport awaits removeEntriesByIds",
    hookSource.includes("await removeEntriesByIds") &&
      hookSource.includes("if (!result.success)"),
    ""
  );

  recordCheck(
    3,
    "Server bulk delete validates branch scope",
    fs
      .readFileSync(
        path.join(process.cwd(), "lib/server/services/daily-operations-service.ts"),
        "utf8"
      )
      .includes("assertRecordInSessionBranchScope(session, operation.branchId)"),
    ""
  );
}

async function main() {
  const owner = new ImportUndoVerifier();
  const staffClient = new ImportUndoVerifier();
  const testDate = `2018-06-${String(Math.floor(Math.random() * 20) + 1).padStart(2, "0")}`;
  const entryIds: string[] = [];
  let kansangaCashier: CertificationCashier | null = null;
  let salaamaCashier: CertificationCashier | null = null;

  console.log("Verifying historical import undo persistence...\n");
  scanAwaitedUndoPattern();

  try {
    await owner.loginAsOwner();
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

    const kansangaEntryId = crypto.randomUUID();
    const kansangaEntry = buildTestEntry(kansangaEntryId, testDate, "main");
    entryIds.push(kansangaEntryId);

    const imported = await owner.json<Array<{ id: string }>>(
      "/api/daily-operations/import",
      {
        method: "POST",
        body: JSON.stringify({ entries: [kansangaEntry] }),
      }
    );
    assert.equal(imported.length, 1);

    const beforeUndo = await countOperations([kansangaEntryId]);
    recordCheck(
      4,
      "Authorized owner import persists to PostgreSQL",
      beforeUndo === 1,
      `count=${beforeUndo}`
    );

    const undoDelete = await owner.json<{ deleted: number }>(
      "/api/daily-operations/bulk-delete",
      {
        method: "POST",
        body: JSON.stringify({ ids: [kansangaEntryId] }),
      }
    );
    const afterUndo = await countOperations([kansangaEntryId]);
    recordCheck(
      5,
      "Successful undo waits for server/database deletion confirmation",
      undoDelete.deleted === 1 && afterUndo === 0,
      `deleted=${undoDelete.deleted}, remaining=${afterUndo}`
    );

    entryIds.length = 0;

    const salaamaDate = `2018-07-${String(Math.floor(Math.random() * 20) + 1).padStart(2, "0")}`;
    const salaamaEntryId = crypto.randomUUID();
    const salaamaEntry = buildTestEntry(salaamaEntryId, salaamaDate, "salaama");
    entryIds.push(salaamaEntryId);

    await owner.json("/api/daily-operations/import", {
      method: "POST",
      body: JSON.stringify({ entries: [salaamaEntry] }),
    });

    await staffClient.loginAsCashier(kansangaCashier);
    const foreignDelete = await staffClient.jsonExpectFailure(
      "/api/daily-operations/bulk-delete",
      {
        method: "POST",
        body: JSON.stringify({ ids: [salaamaEntryId] }),
      }
    );
    const salaamaStillExists = await countOperations([salaamaEntryId]);
    recordCheck(
      6,
      "Staff cannot undo/delete foreign-branch records by ID",
      foreignDelete.status === 403 && salaamaStillExists === 1,
      `status=${foreignDelete.status}, remaining=${salaamaStillExists}`
    );

    recordCheck(
      7,
      "Failed foreign-branch deletion leaves records in PostgreSQL",
      salaamaStillExists === 1,
      `remaining=${salaamaStillExists}`
    );

    const duplicateUndo = await owner.json<{ deleted: number }>(
      "/api/daily-operations/bulk-delete",
      {
        method: "POST",
        body: JSON.stringify({ ids: [salaamaEntryId] }),
      }
    );
    const alreadyDeleted = await owner.jsonExpectFailure(
      "/api/daily-operations/bulk-delete",
      {
        method: "POST",
        body: JSON.stringify({ ids: [salaamaEntryId] }),
      }
    );
    recordCheck(
      8,
      "Repeated undo cannot delete additional records",
      duplicateUndo.deleted === 1 && alreadyDeleted.status >= 400,
      `first deleted=${duplicateUndo.deleted}, repeat status=${alreadyDeleted.status}`
    );

    entryIds.length = 0;

    const reimportDate = `2018-08-${String(Math.floor(Math.random() * 20) + 1).padStart(2, "0")}`;
    const reimportId = crypto.randomUUID();
    const reimportEntry = buildTestEntry(reimportId, reimportDate, "main");
    entryIds.push(reimportId);
    const reimported = await owner.json<Array<{ id: string }>>(
      "/api/daily-operations/import",
      {
        method: "POST",
        body: JSON.stringify({ entries: [reimportEntry] }),
      }
    );
    recordCheck(
      9,
      "Existing historical import behavior remains intact",
      reimported.length === 1 && reimported[0]?.id === reimportId,
      `imported=${reimported.length}`
    );

    console.log("\nHistorical import undo verification complete.");
  } finally {
    if (kansangaCashier) {
      await cleanupCertificationCashier(kansangaCashier);
    }
    if (salaamaCashier) {
      await cleanupCertificationCashier(salaamaCashier);
    }

    if (entryIds.length > 0) {
      await prisma.dailyOperation.deleteMany({
        where: { id: { in: entryIds } },
      });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
