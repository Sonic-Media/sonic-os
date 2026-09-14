import { getAdminPrismaClient, disconnectAdminPrismaClient } from "@/lib/db/admin-prisma";
import { createDatabaseBackup } from "@/lib/backup/backup";

/** Transactional / operational tables cleared by the safe reset. */
const TRANSACTIONAL_TABLES = [
  "staffPayment",
  "expenseRecord",
  "saleLineItem",
  "sale",
  "customer",
  "purchaseLineItem",
  "purchase",
  "dailyOperationExpense",
  "dailyOperation",
  "dayClosing",
  "stockMovement",
  "stockPriceChange",
  "supplier",
  "auditLogEntry",
  "activityLog",
  "session",
] as const;

/** Preserved master / identity / catalog tables. */
const PRESERVED_TABLES = [
  "role",
  "branch",
  "user",
  "userPreference",
  "staff",
  "appSetting",
  "expenseTemplate",
  "productCategory",
  "product",
  "expenseCategory",
  "authAuditLog",
  "backupRecord",
] as const;

export type TableCounts = Record<string, number>;

export interface SafeTransactionalResetReport {
  backupPath?: string;
  deleted: TableCounts;
  preserved: TableCounts;
  productStockResetCount: number;
  verification: SafeTransactionalResetVerification;
}

export interface SafeTransactionalResetVerification {
  passed: boolean;
  errors: string[];
  transactionalRecordCount: number;
  preservedCounts: TableCounts;
  openDayClosingCount: number;
  closeRequestedCount: number;
}

async function countTables(
  tableNames: readonly string[],
  client: ReturnType<typeof getAdminPrismaClient>
): Promise<TableCounts> {
  const counters: Record<string, () => Promise<number>> = {
    staffPayment: () => client.staffPayment.count(),
    expenseRecord: () => client.expenseRecord.count(),
    sale: () => client.sale.count(),
    saleLineItem: () => client.saleLineItem.count(),
    customer: () => client.customer.count(),
    purchase: () => client.purchase.count(),
    purchaseLineItem: () => client.purchaseLineItem.count(),
    dailyOperation: () => client.dailyOperation.count(),
    dailyOperationExpense: () => client.dailyOperationExpense.count(),
    dayClosing: () => client.dayClosing.count(),
    stockMovement: () => client.stockMovement.count(),
    stockPriceChange: () => client.stockPriceChange.count(),
    product: () => client.product.count(),
    supplier: () => client.supplier.count(),
    session: () => client.session.count(),
    auditLogEntry: () => client.auditLogEntry.count(),
    activityLog: () => client.activityLog.count(),
    authAuditLog: () => client.authAuditLog.count(),
    backupRecord: () => client.backupRecord.count(),
    role: () => client.role.count(),
    branch: () => client.branch.count(),
    user: () => client.user.count(),
    userPreference: () => client.userPreference.count(),
    staff: () => client.staff.count(),
    appSetting: () => client.appSetting.count(),
    expenseTemplate: () => client.expenseTemplate.count(),
    productCategory: () => client.productCategory.count(),
    expenseCategory: () => client.expenseCategory.count(),
  };

  const entries = await Promise.all(
    tableNames.map(async (table) => {
      const counter = counters[table];
      if (!counter) {
        throw new Error(`Unknown table counter: ${table}`);
      }
      return [table, await counter()] as const;
    })
  );

  return Object.fromEntries(entries);
}

export async function getSafeTransactionalResetPreview(): Promise<{
  transactional: TableCounts;
  preserved: TableCounts;
}> {
  const client = getAdminPrismaClient();

  return {
    transactional: await countTables(TRANSACTIONAL_TABLES, client),
    preserved: await countTables(PRESERVED_TABLES, client),
  };
}

export async function verifySafeTransactionalResetState(): Promise<SafeTransactionalResetVerification> {
  const client = getAdminPrismaClient();
  const errors: string[] = [];

  const transactionalCounts = await countTables(TRANSACTIONAL_TABLES, client);
  let transactionalRecordCount = 0;

  for (const table of TRANSACTIONAL_TABLES) {
    const count = transactionalCounts[table] ?? 0;
    transactionalRecordCount += count;
    if (count > 0) {
      errors.push(`${table} still has ${count} record(s).`);
    }
  }

  const preservedCounts = await countTables(PRESERVED_TABLES, client);

  if ((preservedCounts.user ?? 0) === 0) {
    errors.push("No user accounts remain.");
  }

  if ((preservedCounts.staff ?? 0) === 0) {
    errors.push("No staff profiles remain.");
  }

  if ((preservedCounts.branch ?? 0) === 0) {
    errors.push("No branches remain.");
  }

  if ((preservedCounts.role ?? 0) === 0) {
    errors.push("No roles/permissions remain.");
  }

  if ((preservedCounts.productCategory ?? 0) === 0) {
    errors.push("No product categories remain.");
  }

  if ((preservedCounts.product ?? 0) === 0) {
    errors.push("Product catalog was removed.");
  }

  if ((preservedCounts.appSetting ?? 0) === 0) {
    errors.push("System settings are missing.");
  }

  const openDayClosingCount = await client.dayClosing.count({
    where: { status: { in: ["open", "close_requested"] } },
  });
  const closeRequestedCount = await client.dayClosing.count({
    where: { status: "close_requested" },
  });

  if (openDayClosingCount > 0) {
    errors.push(
      `${openDayClosingCount} DayClosing record(s) still open or pending approval.`
    );
  }

  if (closeRequestedCount > 0) {
    errors.push(`${closeRequestedCount} pending closing request(s) remain.`);
  }

  return {
    passed: errors.length === 0,
    errors,
    transactionalRecordCount,
    preservedCounts,
    openDayClosingCount,
    closeRequestedCount,
  };
}

export async function runSafeTransactionalReset(options?: {
  skipBackup?: boolean;
}): Promise<SafeTransactionalResetReport> {
  let backupPath: string | undefined;

  if (!options?.skipBackup) {
    const backup = await createDatabaseBackup();
    backupPath = backup.archivePath ?? backup.sqlPath;
    if (!backupPath) {
      throw new Error("Backup completed without an output file.");
    }
  }

  const client = getAdminPrismaClient();

  const deleted = await client.$transaction(async (tx) => {
    const staffPayment = await tx.staffPayment.deleteMany();
    const expenseRecord = await tx.expenseRecord.deleteMany();
    const saleLineItem = await tx.saleLineItem.deleteMany();
    const sale = await tx.sale.deleteMany();
    const customer = await tx.customer.deleteMany();
    const purchaseLineItem = await tx.purchaseLineItem.deleteMany();
    const purchase = await tx.purchase.deleteMany();
    const dailyOperationExpense = await tx.dailyOperationExpense.deleteMany();
    const dailyOperation = await tx.dailyOperation.deleteMany();
    const dayClosing = await tx.dayClosing.deleteMany();
    const stockMovement = await tx.stockMovement.deleteMany();
    const stockPriceChange = await tx.stockPriceChange.deleteMany();
    const supplier = await tx.supplier.deleteMany();
    const auditLogEntry = await tx.auditLogEntry.deleteMany();
    const activityLog = await tx.activityLog.deleteMany();
    const session = await tx.session.deleteMany();

    const productStockReset = await tx.product.updateMany({
      data: {
        currentStock: 0,
        status: "in-stock",
        deletedAt: null,
      },
    });

    return {
      staffPayment: staffPayment.count,
      expenseRecord: expenseRecord.count,
      saleLineItem: saleLineItem.count,
      sale: sale.count,
      customer: customer.count,
      purchaseLineItem: purchaseLineItem.count,
      purchase: purchase.count,
      dailyOperationExpense: dailyOperationExpense.count,
      dailyOperation: dailyOperation.count,
      dayClosing: dayClosing.count,
      stockMovement: stockMovement.count,
      stockPriceChange: stockPriceChange.count,
      supplier: supplier.count,
      auditLogEntry: auditLogEntry.count,
      activityLog: activityLog.count,
      session: session.count,
      productStockReset: productStockReset.count,
    };
  });

  const productStockResetCount = deleted.productStockReset ?? 0;
  const { productStockReset: _ignored, ...deletedCounts } = deleted;

  const preserved = await countTables(PRESERVED_TABLES, client);
  const verification = await verifySafeTransactionalResetState();

  await disconnectAdminPrismaClient();

  return {
    backupPath,
    deleted: deletedCounts,
    preserved,
    productStockResetCount,
    verification,
  };
}

export { TRANSACTIONAL_TABLES, PRESERVED_TABLES };
