import fs from "node:fs";
import { stringifyJsonSafe } from "@/lib/backup/json-serialize";
import { getAdminPrismaClient } from "@/lib/db/admin-prisma";
import type { ParsedDatabaseUrl } from "@/lib/backup/database-url";

export interface JsonBackupPayload {
  version: 1;
  format: "json";
  createdAt: string;
  database: string;
  host: string;
  tables: Record<string, unknown[]>;
}

export interface ExportJsonOptions {
  connection: ParsedDatabaseUrl;
  outputPath: string;
  timestamp?: Date;
}

export async function exportDatabaseJson(
  options: ExportJsonOptions
): Promise<JsonBackupPayload> {
  const prisma = getAdminPrismaClient();
  const createdAt = (options.timestamp ?? new Date()).toISOString();

  const [
    role,
    branch,
    user,
    session,
    userPreference,
    authAuditLog,
    staff,
    appSetting,
    expenseTemplate,
    dailyOperation,
    dailyOperationExpense,
    productCategory,
    product,
    stockMovement,
    stockPriceChange,
    customer,
    sale,
    saleLineItem,
    supplier,
    purchase,
    purchaseLineItem,
    expenseCategory,
    expenseRecord,
    dayClosing,
    auditLogEntry,
    activityLog,
    staffPayment,
    backupRecord,
  ] = await Promise.all([
    prisma.role.findMany(),
    prisma.branch.findMany(),
    prisma.user.findMany(),
    prisma.session.findMany(),
    prisma.userPreference.findMany(),
    prisma.authAuditLog.findMany(),
    prisma.staff.findMany(),
    prisma.appSetting.findMany(),
    prisma.expenseTemplate.findMany(),
    prisma.dailyOperation.findMany(),
    prisma.dailyOperationExpense.findMany(),
    prisma.productCategory.findMany(),
    prisma.product.findMany(),
    prisma.stockMovement.findMany(),
    prisma.stockPriceChange.findMany(),
    prisma.customer.findMany(),
    prisma.sale.findMany(),
    prisma.saleLineItem.findMany(),
    prisma.supplier.findMany(),
    prisma.purchase.findMany(),
    prisma.purchaseLineItem.findMany(),
    prisma.expenseCategory.findMany(),
    prisma.expenseRecord.findMany(),
    prisma.dayClosing.findMany(),
    prisma.auditLogEntry.findMany(),
    prisma.activityLog.findMany(),
    prisma.staffPayment.findMany(),
    prisma.backupRecord.findMany(),
  ]);

  const payload: JsonBackupPayload = {
    version: 1,
    format: "json",
    createdAt,
    database: options.connection.database,
    host: options.connection.host,
    tables: {
      Role: role,
      Branch: branch,
      User: user,
      Session: session,
      UserPreference: userPreference,
      AuthAuditLog: authAuditLog,
      Staff: staff,
      AppSetting: appSetting,
      ExpenseTemplate: expenseTemplate,
      DailyOperation: dailyOperation,
      DailyOperationExpense: dailyOperationExpense,
      ProductCategory: productCategory,
      Product: product,
      StockMovement: stockMovement,
      StockPriceChange: stockPriceChange,
      Customer: customer,
      Sale: sale,
      SaleLineItem: saleLineItem,
      Supplier: supplier,
      Purchase: purchase,
      PurchaseLineItem: purchaseLineItem,
      ExpenseCategory: expenseCategory,
      ExpenseRecord: expenseRecord,
      DayClosing: dayClosing,
      AuditLogEntry: auditLogEntry,
      ActivityLog: activityLog,
      StaffPayment: staffPayment,
      BackupRecord: backupRecord,
    },
  };

  fs.writeFileSync(
    options.outputPath,
    `${stringifyJsonSafe(payload, 2)}\n`,
    "utf8"
  );

  return payload;
}
