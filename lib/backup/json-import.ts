import type { JsonBackupPayload } from "@/lib/backup/json-export";
import { getAdminPrismaClient } from "@/lib/db/admin-prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Tables applied during restore, in FK-safe insert order.
 * BackupRecord is intentionally excluded so restore never wipes backup history.
 * Session is excluded and re-bound after restore so the active owner stays signed in.
 */
const RESTORE_TABLE_ORDER = [
  "Role",
  "Branch",
  "ExpenseCategory",
  "ProductCategory",
  "AppSetting",
  "ExpenseTemplate",
  "Staff",
  "User",
  "UserPreference",
  "AuthAuditLog",
  "Customer",
  "Supplier",
  "Product",
  "DailyOperation",
  "DailyOperationExpense",
  "StockMovement",
  "StockPriceChange",
  "Sale",
  "SaleLineItem",
  "Purchase",
  "PurchaseLineItem",
  "ExpenseRecord",
  "DayClosing",
  "StaffPayment",
  "AuditLogEntry",
  "ActivityLog",
] as const;

type RestoreTableKey = (typeof RESTORE_TABLE_ORDER)[number];

const DATE_FIELD_HINTS = new Set([
  "createdAt",
  "updatedAt",
  "deletedAt",
  "expiresAt",
  "openedAt",
  "reopenedAt",
  "closedAt",
  "lastLoginAt",
  "timestamp",
]);

const BIGINT_FIELD_HINTS = new Set(["fileSizeBytes", "timestamp"]);

function isBufferLike(
  value: unknown
): value is { __type: string; data: number[] } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "__type" in (value as object) &&
    "data" in (value as object) &&
    Array.isArray((value as { data: unknown }).data)
  );
}

function reviveValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (isBufferLike(value)) {
    return Buffer.from(value.data);
  }

  // DailyOperation.timestamp is BigInt (decimal string). AuditLogEntry.timestamp
  // is DateTime (ISO string). Only coerce pure integer strings to BigInt.
  if (
    BIGINT_FIELD_HINTS.has(key) &&
    typeof value === "string" &&
    /^-?\d+$/.test(value)
  ) {
    try {
      return BigInt(value);
    } catch {
      return value;
    }
  }
  if (BIGINT_FIELD_HINTS.has(key) && typeof value === "number") {
    try {
      return BigInt(value);
    } catch {
      return value;
    }
  }

  if (DATE_FIELD_HINTS.has(key) && typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (Array.isArray(value)) {
    return value.map((entry) => reviveValue(key, entry));
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(
      value as Record<string, unknown>
    )) {
      if (childValue === undefined) continue;
      result[childKey] = reviveValue(childKey, childValue);
    }
    return result;
  }

  return value;
}

function reviveRows(rows: unknown[]): Record<string, unknown>[] {
  return rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return {};
    }
    return reviveValue("", row) as Record<string, unknown>;
  });
}

/**
 * Strip relation-only keys Prisma createMany cannot accept.
 * Only remove known relation field names for each table — never scalar
 * columns that share a name with a relation on another model (e.g. category).
 */
function stripRelationKeys(
  table: RestoreTableKey,
  row: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...row };
  const bannedByTable: Partial<Record<RestoreTableKey, string[]>> = {
    Role: ["users", "staff"],
    Branch: [
      "users",
      "staff",
      "dailyOps",
      "sales",
      "purchases",
      "expenseRecords",
      "stockMovements",
      "staffPayments",
      "dayClosings",
      "products",
    ],
    Staff: [
      "user",
      "role",
      "branch",
      "staffPayments",
      "sales",
      "purchases",
      "expenseRecords",
      "dailyOperations",
    ],
    User: ["role", "branch", "staff", "sessions", "preferences", "auditLogs"],
    UserPreference: ["user"],
    AuthAuditLog: ["user"],
    Product: ["category", "branch", "movements", "priceChanges", "saleLineItems", "purchaseLineItems"],
    ProductCategory: ["products"],
    StockMovement: ["product", "branch"],
    StockPriceChange: ["product"],
    Customer: ["sales"],
    Supplier: ["purchases"],
    Sale: ["customer", "branch", "staff", "items"],
    SaleLineItem: ["sale", "product"],
    Purchase: ["supplier", "branch", "staff", "items", "lineItems"],
    PurchaseLineItem: ["purchase", "product"],
    ExpenseRecord: ["branch", "staff", "category", "staffPayment"],
    DailyOperation: ["branch", "staff", "expenses"],
    DailyOperationExpense: ["dailyOperation"],
    DayClosing: ["branch"],
    StaffPayment: ["staff", "branch"],
  };

  for (const key of bannedByTable[table] ?? []) {
    delete next[key];
  }

  return next;
}

type AdminClient = ReturnType<typeof getAdminPrismaClient>;
type TxClient = Parameters<Parameters<AdminClient["$transaction"]>[0]>[0];

async function deleteRestorableData(tx: TxClient): Promise<void> {
  // Children first — BackupRecord and identity of backup history are preserved.
  await tx.saleLineItem.deleteMany();
  await tx.purchaseLineItem.deleteMany();
  await tx.dailyOperationExpense.deleteMany();
  await tx.staffPayment.deleteMany();
  await tx.expenseRecord.deleteMany();
  await tx.sale.deleteMany();
  await tx.purchase.deleteMany();
  await tx.dayClosing.deleteMany();
  await tx.dailyOperation.deleteMany();
  await tx.stockMovement.deleteMany();
  await tx.stockPriceChange.deleteMany();
  await tx.customer.deleteMany();
  await tx.supplier.deleteMany();
  await tx.product.deleteMany();
  await tx.productCategory.deleteMany();
  await tx.session.deleteMany();
  await tx.userPreference.deleteMany();
  await tx.authAuditLog.deleteMany();
  await tx.activityLog.deleteMany();
  await tx.auditLogEntry.deleteMany();
  // Clear User.staffId before deleting Staff (unique optional FK).
  await tx.user.updateMany({ data: { staffId: null } });
  await tx.user.deleteMany();
  await tx.staff.deleteMany();
  await tx.expenseTemplate.deleteMany();
  await tx.appSetting.deleteMany();
  await tx.expenseCategory.deleteMany();
  await tx.role.deleteMany();
  await tx.branch.deleteMany();
}

async function insertTableRows(
  tx: TxClient,
  table: RestoreTableKey,
  rows: Record<string, unknown>[]
): Promise<void> {
  if (rows.length === 0) return;

  const data = rows.map((row) => stripRelationKeys(table, row));

  switch (table) {
    case "Role":
      await tx.role.createMany({ data: data as Prisma.RoleCreateManyInput[] });
      break;
    case "Branch":
      await tx.branch.createMany({
        data: data as Prisma.BranchCreateManyInput[],
      });
      break;
    case "ExpenseCategory":
      await tx.expenseCategory.createMany({
        data: data as Prisma.ExpenseCategoryCreateManyInput[],
      });
      break;
    case "ProductCategory":
      await tx.productCategory.createMany({
        data: data as Prisma.ProductCategoryCreateManyInput[],
      });
      break;
    case "AppSetting":
      await tx.appSetting.createMany({
        data: data as Prisma.AppSettingCreateManyInput[],
      });
      break;
    case "ExpenseTemplate":
      await tx.expenseTemplate.createMany({
        data: data as Prisma.ExpenseTemplateCreateManyInput[],
      });
      break;
    case "Staff":
      await tx.staff.createMany({
        data: data as Prisma.StaffCreateManyInput[],
      });
      break;
    case "User":
      await tx.user.createMany({ data: data as Prisma.UserCreateManyInput[] });
      break;
    case "UserPreference":
      await tx.userPreference.createMany({
        data: data as Prisma.UserPreferenceCreateManyInput[],
      });
      break;
    case "AuthAuditLog":
      await tx.authAuditLog.createMany({
        data: data as Prisma.AuthAuditLogCreateManyInput[],
      });
      break;
    case "Customer":
      await tx.customer.createMany({
        data: data as Prisma.CustomerCreateManyInput[],
      });
      break;
    case "Supplier":
      await tx.supplier.createMany({
        data: data as Prisma.SupplierCreateManyInput[],
      });
      break;
    case "Product":
      await tx.product.createMany({
        data: data as Prisma.ProductCreateManyInput[],
      });
      break;
    case "DailyOperation":
      await tx.dailyOperation.createMany({
        data: data as Prisma.DailyOperationCreateManyInput[],
      });
      break;
    case "DailyOperationExpense":
      await tx.dailyOperationExpense.createMany({
        data: data as Prisma.DailyOperationExpenseCreateManyInput[],
      });
      break;
    case "StockMovement":
      await tx.stockMovement.createMany({
        data: data as Prisma.StockMovementCreateManyInput[],
      });
      break;
    case "StockPriceChange":
      await tx.stockPriceChange.createMany({
        data: data as Prisma.StockPriceChangeCreateManyInput[],
      });
      break;
    case "Sale":
      await tx.sale.createMany({ data: data as Prisma.SaleCreateManyInput[] });
      break;
    case "SaleLineItem":
      await tx.saleLineItem.createMany({
        data: data as Prisma.SaleLineItemCreateManyInput[],
      });
      break;
    case "Purchase":
      await tx.purchase.createMany({
        data: data as Prisma.PurchaseCreateManyInput[],
      });
      break;
    case "PurchaseLineItem":
      await tx.purchaseLineItem.createMany({
        data: data as Prisma.PurchaseLineItemCreateManyInput[],
      });
      break;
    case "ExpenseRecord":
      await tx.expenseRecord.createMany({
        data: data as Prisma.ExpenseRecordCreateManyInput[],
      });
      break;
    case "DayClosing":
      await tx.dayClosing.createMany({
        data: data as Prisma.DayClosingCreateManyInput[],
      });
      break;
    case "StaffPayment":
      await tx.staffPayment.createMany({
        data: data as Prisma.StaffPaymentCreateManyInput[],
      });
      break;
    case "AuditLogEntry":
      await tx.auditLogEntry.createMany({
        data: data as Prisma.AuditLogEntryCreateManyInput[],
      });
      break;
    case "ActivityLog":
      await tx.activityLog.createMany({
        data: data as Prisma.ActivityLogCreateManyInput[],
      });
      break;
    default:
      break;
  }
}

export interface ApplyJsonBackupOptions {
  payload: JsonBackupPayload;
  /** Preserve this session token so the operator stays signed in after restore. */
  preserveSessionToken?: string | null;
  preserveUserId?: string | null;
  preserveUsername?: string | null;
}

export interface ApplyJsonBackupResult {
  restoredTables: number;
  restoredRows: number;
  sessionPreserved: boolean;
}

/**
 * Atomically replace restorable Sonic OS data with a validated JSON backup.
 * BackupRecord history is never deleted. On any failure the transaction rolls back.
 */
export async function applyValidatedJsonBackup(
  options: ApplyJsonBackupOptions
): Promise<ApplyJsonBackupResult> {
  const client = getAdminPrismaClient();
  const { payload, preserveSessionToken, preserveUserId, preserveUsername } =
    options;

  let restoredRows = 0;

  await client.$transaction(
    async (tx) => {
      let preservedSession: {
        token: string;
        locked: boolean;
        expiresAt: Date;
      } | null = null;

      if (preserveSessionToken) {
        const existing = await tx.session.findUnique({
          where: { token: preserveSessionToken },
        });
        if (existing) {
          preservedSession = {
            token: existing.token,
            locked: existing.locked,
            expiresAt: existing.expiresAt,
          };
        }
      }

      await deleteRestorableData(tx);

      for (const table of RESTORE_TABLE_ORDER) {
        const rows = reviveRows(payload.tables[table] ?? []);
        await insertTableRows(tx, table, rows);
        restoredRows += rows.length;
      }

      if (preservedSession) {
        const users = payload.tables.User as Array<{
          id?: string;
          username?: string;
        }>;
        const match =
          users.find((user) => user.id === preserveUserId) ??
          users.find((user) => user.username === preserveUsername) ??
          users.find((user) => user.username === "owner") ??
          users[0];

        if (match?.id) {
          await tx.session.create({
            data: {
              token: preservedSession.token,
              userId: match.id,
              locked: preservedSession.locked,
              expiresAt: preservedSession.expiresAt,
            },
          });
        }
      }
    },
    {
      maxWait: 60_000,
      timeout: 180_000,
    }
  );

  return {
    restoredTables: RESTORE_TABLE_ORDER.length,
    restoredRows,
    sessionPreserved: Boolean(preserveSessionToken),
  };
}
