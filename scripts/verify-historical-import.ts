import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import { aggregateEntries } from "@/lib/aggregations";
import { parseAmount } from "@/lib/amounts";
import { prisma } from "@/lib/db";
import { HISTORICAL_IMPORT_STAFF_NAME } from "@/lib/historical-import/constants";
import { buildEntryFromImportRow } from "@/lib/historical-import/build-entry";
import { isImportablePreviewRow } from "@/lib/historical-import/duplicates";
import { parseXlsxLedger } from "@/lib/historical-import/parse-xlsx";
import { buildImportPreview } from "@/lib/historical-import/preview";
import {
  listDailyOperations,
  listDailyOperationsByBranchDate,
  listDailyOperationsInPeriod,
} from "@/lib/server/services/daily-operations-service";
import type { Entry, Staff } from "@/types";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const LEDGER_PATH =
  process.env.VERIFY_LEDGER_PATH ??
  "/Users/kvisualz/Documents/KVisualz Sales Ledger.xlsx";
const BRANCH = "main";

type JsonRecord = Record<string, unknown>;

interface LedgerMismatch {
  date: string;
  field: string;
  expected: string | number | null;
  actual: string | number | null;
}

class HistoricalImportVerifier {
  private cookieHeader = "";

  private async request(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
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

  private async json<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await this.request(path, options);
    const payload = (await response.json()) as { data?: T; error?: JsonRecord };

    if (!response.ok) {
      const message =
        typeof payload.error === "object" &&
        payload.error &&
        typeof payload.error.message === "string"
          ? payload.error.message
          : `Request failed: ${response.status} ${path}`;
      throw new Error(message);
    }

    return payload.data as T;
  }

  async login() {
    await this.json("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({
        action: "login",
        username: "owner",
        password: "owner",
      }),
    });
  }

  async importEntries(entries: Entry[]) {
    return this.json<Entry[]>("/api/daily-operations/import", {
      method: "POST",
      body: JSON.stringify({ entries }),
    });
  }

  async importEntriesExpectFailure(entries: Entry[]) {
    const response = await this.request("/api/daily-operations/import", {
      method: "POST",
      body: JSON.stringify({ entries }),
    });
    const payload = (await response.json()) as { error?: JsonRecord };
    return {
      status: response.status,
      message:
        typeof payload.error === "object" &&
        payload.error &&
        typeof payload.error.message === "string"
          ? payload.error.message
          : "",
    };
  }

  async bulkDelete(ids: string[]) {
    if (ids.length === 0) return;
    await this.json("/api/daily-operations/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  }
}

function parseLedgerAmount(value: unknown): number {
  return parseAmount(
    String(value ?? "")
      .trim()
      .replace(/,/g, "")
      .replace(/^\((\d+)\)$/, "-$1")
  );
}

function expenseMap(entry: Entry): Map<string, number> {
  const map = new Map<string, number>();
  for (const expense of entry.expenses) {
    map.set(expense.name, (map.get(expense.name) ?? 0) + expense.amount);
  }
  return map;
}

function compareEntryToSpreadsheet(
  raw: Record<string, unknown>,
  entry: Entry,
  expected: Entry
): LedgerMismatch[] {
  const mismatches: LedgerMismatch[] = [];
  const date = String(raw.date);

  const expectedSales = parseLedgerAmount(raw.sales);
  const expectedBalance = parseLedgerAmount(raw.totalBalance);
  const expectedNotes = String(raw.notes ?? "").trim();
  const expectedExpenses = expenseMap(expected);

  if (entry.sales !== expectedSales) {
    mismatches.push({
      date,
      field: "sales",
      expected: expectedSales,
      actual: entry.sales,
    });
  }

  const actualExpenseTotal = entry.expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  const expectedExpenseTotal = [...expectedExpenses.values()].reduce(
    (sum, amount) => sum + amount,
    0
  );

  if (actualExpenseTotal !== expectedExpenseTotal) {
    mismatches.push({
      date,
      field: "expense-total",
      expected: expectedExpenseTotal,
      actual: actualExpenseTotal,
    });
  }

  for (const [name, amount] of expectedExpenses) {
    const actualAmount = expenseMap(entry).get(name) ?? 0;
    if (actualAmount !== amount) {
      mismatches.push({
        date,
        field: `expense:${name}`,
        expected: amount,
        actual: actualAmount,
      });
    }
  }

  for (const [name, amount] of expenseMap(entry)) {
    if (!expectedExpenses.has(name)) {
      mismatches.push({
        date,
        field: `unexpected-expense:${name}`,
        expected: null,
        actual: amount,
      });
    }
  }

  if ((entry.savingsAllocation ?? 0) !== expectedBalance) {
    mismatches.push({
      date,
      field: "net-balance",
      expected: expectedBalance,
      actual: entry.savingsAllocation ?? 0,
    });
  }

  if ((entry.notes ?? "").trim() !== expectedNotes) {
    mismatches.push({
      date,
      field: "notes",
      expected: expectedNotes,
      actual: (entry.notes ?? "").trim(),
    });
  }

  if (entry.staffName !== HISTORICAL_IMPORT_STAFF_NAME) {
    mismatches.push({
      date,
      field: "staff",
      expected: HISTORICAL_IMPORT_STAFF_NAME,
      actual: entry.staffName ?? "",
    });
  }

  return mismatches;
}

async function loadImportStaff(): Promise<Staff[]> {
  const members = await prisma.staff.findMany({
    where: { active: true },
    include: { branch: true, role: true },
  });

  return members.map((member) => ({
    id: member.id,
    name: member.name,
    username: member.username ?? undefined,
    branch: member.branch.code as Staff["branch"],
    role: member.role.slug as Staff["role"],
    loginEnabled: member.loginEnabled,
    status: member.status as Staff["status"],
    active: member.active,
    dateJoined: member.dateJoined,
  }));
}

function sumEntries(entries: Entry[]) {
  return entries.reduce(
    (totals, entry) => {
      totals.sales += entry.sales;
      totals.expenses += entry.expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
      totals.balance += entry.savingsAllocation ?? 0;
      return totals;
    },
    { sales: 0, expenses: 0, balance: 0 }
  );
}

function sumSpreadsheetRows(rows: Record<string, unknown>[]) {
  return rows.reduce(
    (totals, raw) => {
      totals.sales += parseLedgerAmount(raw.sales);
      totals.expenses += parseLedgerAmount(raw.totalExpenses);
      totals.balance += parseLedgerAmount(raw.totalBalance);
      return totals;
    },
    { sales: 0, expenses: 0, balance: 0 }
  );
}

async function deleteBranchRecordsInRange(
  branchCode: string,
  start: string,
  end: string
): Promise<number> {
  const branch = await prisma.branch.findUniqueOrThrow({
    where: { code: branchCode },
  });

  const result = await prisma.dailyOperation.deleteMany({
    where: {
      branchId: branch.id,
      date: {
        gte: start,
        lte: end,
      },
    },
  });

  return result.count;
}

async function main() {
  assert.ok(fs.existsSync(LEDGER_PATH), `Ledger file not found: ${LEDGER_PATH}`);

  const staff = await loadImportStaff();
  const penny = staff.find(
    (member) =>
      member.name.toLowerCase() === HISTORICAL_IMPORT_STAFF_NAME.toLowerCase()
  );
  assert.ok(
    penny,
    `${HISTORICAL_IMPORT_STAFF_NAME} must exist as an active staff member.`
  );

  const buffer = fs.readFileSync(LEDGER_PATH);
  const parsed = parseXlsxLedger(
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ),
    BRANCH
  );
  assert.equal(parsed.success, true, parsed.errors.join("; "));
  assert.ok(parsed.rows.length > 0, "No rows parsed from ledger");

  const preview = buildImportPreview(
    parsed.rows,
    [],
    [
      {
        code: BRANCH,
        name: "Kansanga",
        active: true,
        id: "verify",
        createdAt: "",
        updatedAt: "",
      },
    ],
    () => "Kansanga",
    parsed.blankRowsSkipped
  );

  const importableRows = preview.rows.filter(isImportablePreviewRow);
  assert.ok(importableRows.length > 0, "No importable rows in preview");

  const expectedEntries = importableRows.map((row) =>
    buildEntryFromImportRow(row, staff)
  );

  const sheetDates = parsed.rows.map((row) => String(row.date)).sort();
  const rangeStart = sheetDates[0]!;
  const rangeEnd = sheetDates[sheetDates.length - 1]!;
  const expectedSheetTotals = sumSpreadsheetRows(parsed.rows);

  const verifier = new HistoricalImportVerifier();
  await verifier.login();

  const removed = await deleteBranchRecordsInRange(
    BRANCH,
    rangeStart,
    rangeEnd
  );

  const imported = await verifier.importEntries(expectedEntries);
  assert.equal(
    imported.length,
    expectedEntries.length,
    "Import count mismatch after clean import"
  );

  const mismatches: LedgerMismatch[] = [];

  for (const raw of parsed.rows) {
    const expected = expectedEntries.find((entry) => entry.date === String(raw.date));
    assert.ok(expected, `Missing expected entry for ${String(raw.date)}`);

    const operations = await listDailyOperationsByBranchDate(
      BRANCH,
      String(raw.date)
    );

    if (operations.length !== 1) {
      mismatches.push({
        date: String(raw.date),
        field: "duplicate-or-missing",
        expected: 1,
        actual: operations.length,
      });
      continue;
    }

    mismatches.push(
      ...compareEntryToSpreadsheet(raw, operations[0]!, expected)
    );
  }

  const branchRecords = (await listDailyOperations()).filter(
    (entry) =>
      entry.branch === BRANCH &&
      entry.date >= rangeStart &&
      entry.date <= rangeEnd
  );

  if (branchRecords.length !== parsed.rows.length) {
    mismatches.push({
      date: `${rangeStart}..${rangeEnd}`,
      field: "record-count",
      expected: parsed.rows.length,
      actual: branchRecords.length,
    });
  }

  const sheetDateSet = new Set(sheetDates);
  for (const entry of branchRecords) {
    if (!sheetDateSet.has(entry.date)) {
      mismatches.push({
        date: entry.date,
        field: "unexpected-record",
        expected: null,
        actual: entry.id,
      });
    }
  }

  const importedTotals = sumEntries(branchRecords);
  if (importedTotals.sales !== expectedSheetTotals.sales) {
    mismatches.push({
      date: "TOTAL",
      field: "sales-total",
      expected: expectedSheetTotals.sales,
      actual: importedTotals.sales,
    });
  }
  if (importedTotals.balance !== expectedSheetTotals.balance) {
    mismatches.push({
      date: "TOTAL",
      field: "net-balance-total",
      expected: expectedSheetTotals.balance,
      actual: importedTotals.balance,
    });
  }

  const julyEntries = branchRecords.filter((entry) =>
    entry.date.startsWith("2026-07")
  );
  const augustEntries = branchRecords.filter((entry) =>
    entry.date.startsWith("2026-08")
  );
  const julySheet = parsed.rows.filter((row) =>
    String(row.date).startsWith("2026-07")
  );
  const augustSheet = parsed.rows.filter((row) =>
    String(row.date).startsWith("2026-08")
  );

  const julyAggregate = aggregateEntries(julyEntries, { branchIds: [BRANCH] });
  const augustAggregate = aggregateEntries(augustEntries, {
    branchIds: [BRANCH],
  });
  const julySheetTotals = sumSpreadsheetRows(julySheet);
  const augustSheetTotals = sumSpreadsheetRows(augustSheet);

  if (julyAggregate.totalSales !== julySheetTotals.sales) {
    mismatches.push({
      date: "2026-07",
      field: "report-sales",
      expected: julySheetTotals.sales,
      actual: julyAggregate.totalSales,
    });
  }

  if (augustAggregate.totalSales !== augustSheetTotals.sales) {
    mismatches.push({
      date: "2026-08",
      field: "report-sales",
      expected: augustSheetTotals.sales,
      actual: augustAggregate.totalSales,
    });
  }

  const julyPeriodEntries = await listDailyOperationsInPeriod(
    "monthly",
    new Date("2026-07-31T12:00:00")
  );
  const augustPeriodEntries = await listDailyOperationsInPeriod(
    "monthly",
    new Date("2026-08-31T12:00:00")
  );
  const julyPeriodMain = julyPeriodEntries.filter(
    (entry) => entry.branch === BRANCH
  );
  const augustPeriodMain = augustPeriodEntries.filter(
    (entry) => entry.branch === BRANCH
  );

  if (julyPeriodMain.length !== julyEntries.length) {
    mismatches.push({
      date: "2026-07",
      field: "daily-operations-period-count",
      expected: julyEntries.length,
      actual: julyPeriodMain.length,
    });
  }

  if (augustPeriodMain.length !== augustEntries.length) {
    mismatches.push({
      date: "2026-08",
      field: "daily-operations-period-count",
      expected: augustEntries.length,
      actual: augustPeriodMain.length,
    });
  }

  const duplicateAttempt = await verifier.importEntriesExpectFailure([
    expectedEntries[0]!,
  ]);
  if (duplicateAttempt.status !== 409) {
    mismatches.push({
      date: expectedEntries[0]!.date,
      field: "duplicate-import-guard",
      expected: 409,
      actual: duplicateAttempt.status,
    });
  }

  if (mismatches.length > 0) {
    console.error("Historical import verification failed.");
    console.error(`Removed ${removed} existing records in range before import.`);
    console.error(`Mismatches (${mismatches.length}):`);
    for (const mismatch of mismatches) {
      console.error(
        `- ${mismatch.date} ${mismatch.field}: expected ${JSON.stringify(mismatch.expected)} actual ${JSON.stringify(mismatch.actual)}`
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log("Historical import verification passed.");
  console.log(`Ledger file: ${LEDGER_PATH}`);
  console.log(`Removed ${removed} existing records in ${rangeStart}..${rangeEnd}`);
  console.log(`Imported rows: ${imported.length}`);
  console.log(`Blank rows skipped: ${parsed.blankRowsSkipped}`);
  console.log(`Spreadsheet totals: sales ${expectedSheetTotals.sales}, expenses ${expectedSheetTotals.expenses}, net balance ${expectedSheetTotals.balance}`);
  console.log(`July report sales: ${julyAggregate.totalSales}`);
  console.log(`August report sales: ${augustAggregate.totalSales}`);
  console.log(`Duplicate import rejected with HTTP ${duplicateAttempt.status}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
