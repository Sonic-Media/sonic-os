import * as XLSX from "xlsx";
import type { Branch } from "@/types";
import type { ImportParseResult } from "@/types/historical-import";
import {
  LEDGER_HEADERS,
  LEDGER_SUMMARY_MARKERS,
  normalizeLedgerHeader,
} from "@/lib/historical-import/ledger-columns";
import { parseLedgerDate } from "@/lib/historical-import/validation";

function isBlankRow(cells: unknown[]): boolean {
  return cells.every((cell) => String(cell ?? "").trim() === "");
}

function isSummaryRow(dateValue: unknown): boolean {
  const normalized = String(dateValue ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  return LEDGER_SUMMARY_MARKERS.some(
    (marker) => normalized === marker || normalized.startsWith(`${marker} `)
  );
}

function resolveColumnIndexes(headerRow: unknown[]): Record<string, number> {
  const indexes: Record<string, number> = {};
  const normalizedHeaders = headerRow.map(normalizeLedgerHeader);

  for (const [field, aliases] of Object.entries(LEDGER_HEADERS)) {
    const matchIndex = normalizedHeaders.findIndex((header) =>
      aliases.includes(header)
    );
    if (matchIndex >= 0) {
      indexes[field] = matchIndex;
    }
  }

  return indexes;
}

function cellValue(row: unknown[], index: number | undefined): unknown {
  if (index === undefined) return "";
  return row[index] ?? "";
}

function buildExpenseList(raw: {
  lunchFood: unknown;
  home: unknown;
  rent: unknown;
  transport: unknown;
  otherLabel: unknown;
  otherAmount: unknown;
}): Array<{ name: string; amount: unknown }> {
  const expenses: Array<{ name: string; amount: unknown }> = [
    { name: "Lunch/Food", amount: raw.lunchFood },
    { name: "Home", amount: raw.home },
    { name: "Rent", amount: raw.rent },
    { name: "Transport", amount: raw.transport },
  ];

  const otherLabel = String(raw.otherLabel ?? "").trim();
  const otherAmount = raw.otherAmount;
  if (otherLabel || String(otherAmount ?? "").trim() !== "") {
    expenses.push({
      name: otherLabel || "Other",
      amount: otherAmount,
    });
  }

  return expenses;
}

export function parseXlsxLedger(
  buffer: ArrayBuffer,
  branch: Branch
): ImportParseResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return {
      success: false,
      rows: [],
      errors: ["The workbook does not contain any sheets."],
      blankRowsSkipped: 0,
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  if (matrix.length === 0) {
    return {
      success: false,
      rows: [],
      errors: ["The spreadsheet is empty."],
      blankRowsSkipped: 0,
    };
  }

  const headerRow = matrix[0] ?? [];
  const columnIndexes = resolveColumnIndexes(headerRow);

  if (columnIndexes.date === undefined || columnIndexes.sales === undefined) {
    return {
      success: false,
      rows: [],
      errors: [
        "Could not find required Daily Ledger columns (Date and Total Sales).",
      ],
      blankRowsSkipped: 0,
    };
  }

  const rows: Record<string, unknown>[] = [];
  const errors: string[] = [];
  let blankRowsSkipped = 0;

  matrix.slice(1).forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const cells = Array.isArray(rawRow) ? rawRow : [];

    if (isBlankRow(cells)) {
      blankRowsSkipped += 1;
      return;
    }

    const dateCell = cellValue(cells, columnIndexes.date);
    if (isSummaryRow(dateCell)) {
      blankRowsSkipped += 1;
      return;
    }

    const dateText = String(dateCell ?? "").trim();
    if (!dateText) {
      blankRowsSkipped += 1;
      return;
    }

    const isoDate = parseLedgerDate(dateText);
    if (!isoDate) {
      errors.push(`Row ${rowNumber}: Date "${dateText}" is not valid.`);
      return;
    }

    const sales = cellValue(cells, columnIndexes.sales);
    const hasSales = String(sales ?? "").trim() !== "";

    if (!hasSales) {
      blankRowsSkipped += 1;
      return;
    }

    const expenseInputs = {
      lunchFood: cellValue(cells, columnIndexes.lunchFood),
      home: cellValue(cells, columnIndexes.home),
      rent: cellValue(cells, columnIndexes.rent),
      transport: cellValue(cells, columnIndexes.transport),
      otherLabel: cellValue(cells, columnIndexes.otherLabel),
      otherAmount: cellValue(cells, columnIndexes.otherAmount),
    };

    rows.push({
      date: isoDate,
      branch,
      sales,
      ...expenseInputs,
      totalExpenses: cellValue(cells, columnIndexes.totalExpenses),
      totalBalance: cellValue(cells, columnIndexes.totalBalance),
      notes: cellValue(cells, columnIndexes.notes),
      expenses: buildExpenseList(expenseInputs),
      sourceRowNumber: rowNumber,
    });
  });

  if (rows.length === 0) {
    return {
      success: false,
      rows: [],
      errors:
        errors.length > 0
          ? errors
          : ["No importable daily ledger rows were found."],
      blankRowsSkipped,
    };
  }

  return {
    success: true,
    rows,
    errors,
    blankRowsSkipped,
  };
}
