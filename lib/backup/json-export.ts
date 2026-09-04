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
  ] = await prisma.$transaction(async (tx) => {
    return Promise.all([
      tx.role.findMany(),
      tx.branch.findMany(),
      tx.user.findMany(),
      tx.session.findMany(),
      tx.userPreference.findMany(),
      tx.authAuditLog.findMany(),
      tx.staff.findMany(),
      tx.appSetting.findMany(),
      tx.expenseTemplate.findMany(),
      tx.dailyOperation.findMany(),
      tx.dailyOperationExpense.findMany(),
      tx.productCategory.findMany(),
      tx.product.findMany(),
      tx.stockMovement.findMany(),
      tx.stockPriceChange.findMany(),
      tx.customer.findMany(),
      tx.sale.findMany(),
      tx.saleLineItem.findMany(),
      tx.supplier.findMany(),
      tx.purchase.findMany(),
      tx.purchaseLineItem.findMany(),
      tx.expenseCategory.findMany(),
      tx.expenseRecord.findMany(),
      tx.dayClosing.findMany(),
      tx.auditLogEntry.findMany(),
      tx.activityLog.findMany(),
      tx.staffPayment.findMany(),
      tx.backupRecord.findMany({
        select: {
          id: true,
          createdAt: true,
          trigger: true,
          createdById: true,
          createdByName: true,
          manifestPath: true,
          filePath: true,
          fileSizeBytes: true,
          compressed: true,
          status: true,
          error: true,
          storageType: true,
          manifestJson: true,
        },
      }),
    ]);
  });

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
