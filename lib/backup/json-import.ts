import { bigIntJsonReplacer } from "@/lib/backup/json-serialize";
import { getAdminPrismaClient } from "@/lib/db/admin-prisma";
import type { JsonBackupPayload } from "@/lib/backup/json-export";

const BIGINT_FIELDS: Record<string, readonly string[]> = {
  DailyOperation: ["timestamp"],
  BackupRecord: ["fileSizeBytes"],
};

function toBigIntFields(
  table: string,
  row: Record<string, unknown>
): Record<string, unknown> {
  const copy = { ...row };

  for (const field of BIGINT_FIELDS[table] ?? []) {
    const value = copy[field];
    if (typeof value === "string" && value.trim()) {
      copy[field] = BigInt(value);
    }
  }

  return copy;
}

export function parseJsonBackupPayload(raw: string): JsonBackupPayload {
  return JSON.parse(raw) as JsonBackupPayload;
}

function sanitizeBackupRecordRow(row: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...row };
  delete copy.payload;
  copy.storageType = "filesystem";
  return copy;
}

/** FK-safe delete order (children before parents). */
const DELETE_ORDER = [
  "DailyOperationExpense",
  "SaleLineItem",
  "PurchaseLineItem",
  "StockPriceChange",
  "StockMovement",
  "StaffPayment",
  "ExpenseRecord",
  "Sale",
  "Purchase",
  "DailyOperation",
  "DayClosing",
  "Staff",
  "Session",
  "UserPreference",
  "AuthAuditLog",
  "Product",
  "ProductCategory",
  "Customer",
  "Supplier",
  "ExpenseCategory",
  "ExpenseTemplate",
  "AuditLogEntry",
  "ActivityLog",
  "BackupRecord",
  "AppSetting",
  "User",
  "Branch",
  "Role",
] as const;

/** FK-safe insert order (parents before children). */
const INSERT_ORDER = [
  "Role",
  "Branch",
  "User",
  "AppSetting",
  "ExpenseTemplate",
  "ExpenseCategory",
  "Supplier",
  "Customer",
  "ProductCategory",
  "Product",
  "Staff",
  "Session",
  "UserPreference",
  "AuthAuditLog",
  "DailyOperation",
  "DailyOperationExpense",
  "StockMovement",
  "StockPriceChange",
  "Sale",
  "SaleLineItem",
  "Purchase",
  "PurchaseLineItem",
  "ExpenseRecord",
  "StaffPayment",
  "DayClosing",
  "AuditLogEntry",
  "ActivityLog",
  "BackupRecord",
] as const;

type PrismaModelName =
  | "role"
  | "branch"
  | "user"
  | "session"
  | "userPreference"
  | "authAuditLog"
  | "staff"
  | "appSetting"
  | "expenseTemplate"
  | "dailyOperation"
  | "dailyOperationExpense"
  | "productCategory"
  | "product"
  | "stockMovement"
  | "stockPriceChange"
  | "customer"
  | "sale"
  | "saleLineItem"
  | "supplier"
  | "purchase"
  | "purchaseLineItem"
  | "expenseCategory"
  | "expenseRecord"
  | "dayClosing"
  | "auditLogEntry"
  | "activityLog"
  | "staffPayment"
  | "backupRecord";

const TABLE_TO_MODEL: Record<string, PrismaModelName> = {
  Role: "role",
  Branch: "branch",
  User: "user",
  Session: "session",
  UserPreference: "userPreference",
  AuthAuditLog: "authAuditLog",
  Staff: "staff",
  AppSetting: "appSetting",
  ExpenseTemplate: "expenseTemplate",
  DailyOperation: "dailyOperation",
  DailyOperationExpense: "dailyOperationExpense",
  ProductCategory: "productCategory",
  Product: "product",
  StockMovement: "stockMovement",
  StockPriceChange: "stockPriceChange",
  Customer: "customer",
  Sale: "sale",
  SaleLineItem: "saleLineItem",
  Supplier: "supplier",
  Purchase: "purchase",
  PurchaseLineItem: "purchaseLineItem",
  ExpenseCategory: "expenseCategory",
  ExpenseRecord: "expenseRecord",
  DayClosing: "dayClosing",
  AuditLogEntry: "auditLogEntry",
  ActivityLog: "activityLog",
  StaffPayment: "staffPayment",
  BackupRecord: "backupRecord",
};

export interface RestoreJsonOptions {
  payload: JsonBackupPayload;
  clearExisting?: boolean;
}

export async function restoreDatabaseJson(
  options: RestoreJsonOptions
): Promise<{ inserted: number }> {
  const prisma = getAdminPrismaClient();
  const { payload, clearExisting = true } = options;
  let inserted = 0;

  await prisma.$transaction(async (tx) => {
    if (clearExisting) {
      for (const table of DELETE_ORDER) {
        const model = TABLE_TO_MODEL[table];
        if (!model) continue;
        await (tx[model] as { deleteMany: (args: unknown) => Promise<unknown> }).deleteMany({});
      }
    }

    for (const table of INSERT_ORDER) {
      const model = TABLE_TO_MODEL[table];
      if (!model) continue;

      const rows = payload.tables[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      for (const rawRow of rows) {
        if (!rawRow || typeof rawRow !== "object") continue;

        let row = toBigIntFields(table, rawRow as Record<string, unknown>);
        if (table === "BackupRecord") {
          row = sanitizeBackupRecordRow(row);
        }

        await (tx[model] as { create: (args: unknown) => Promise<unknown> }).create({
          data: row,
        });
        inserted += 1;
      }
    }
  });

  return { inserted };
}

export function serializeJsonBackupPayload(payload: JsonBackupPayload): string {
  return JSON.stringify(payload, bigIntJsonReplacer, 2);
}
