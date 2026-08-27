import { getAdminPrismaClient, disconnectAdminPrismaClient } from "@/lib/db/admin-prisma";
import {
  DEFAULT_BRANCH_CODE,
  DEFAULT_BRANCH_NAME,
} from "@/lib/constants";

const RETAINED_STAFF_NAMES = ["Kevin", "Penny", "Tony", "Fazil"] as const;
const REQUIRED_USERNAMES = ["owner", "penny", "tony", "fazil"] as const;

const CLEARED_TABLES = [
  "staffPayment",
  "expenseRecord",
  "sale",
  "saleLineItem",
  "customer",
  "purchase",
  "purchaseLineItem",
  "dailyOperation",
  "dailyOperationExpense",
  "dayClosing",
  "stockMovement",
  "stockPriceChange",
  "product",
  "supplier",
  "auditLogEntry",
  "activityLog",
  "authAuditLog",
  "session",
] as const;

const PRESERVED_TABLES = [
  "role",
  "branch",
  "user",
  "userPreference",
  "staff",
  "appSetting",
  "expenseTemplate",
  "productCategory",
  "expenseCategory",
] as const;

export interface TableCounts {
  [key: string]: number;
}

export interface ProductionInitializationReport {
  deleted: TableCounts;
  preserved: TableCounts;
  verification: ProductionInitializationVerification;
}

export interface ProductionInitializationVerification {
  passed: boolean;
  errors: string[];
  operationalRecordCount: number;
  productCount: number;
  retainedUsers: Array<{
    username: string;
    displayName: string;
    role: string;
    canAuthenticate: boolean;
  }>;
  retainedStaff: Array<{ name: string; branch: string; role: string }>;
  retainedBranch: { code: string; name: string; active: boolean } | null;
  retainedProductCategories: number;
  retainedExpenseCategories: number;
  retainedSettings: boolean;
}

async function countTables(
  tableNames: readonly string[],
  client: ReturnType<typeof getAdminPrismaClient> = getAdminPrismaClient()
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
    auditLogEntry: () => client.auditLogEntry.count(),
    activityLog: () => client.activityLog.count(),
    authAuditLog: () => client.authAuditLog.count(),
    session: () => client.session.count(),
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

export async function runProductionInitialization(): Promise<ProductionInitializationReport> {
  const admin = getAdminPrismaClient();

  const deletedCounts = await admin.$transaction(async (tx) => {
    const staffPayment = await tx.staffPayment.deleteMany();
    const expenseRecord = await tx.expenseRecord.deleteMany();
    const sale = await tx.sale.deleteMany();
    const saleLineItem = await tx.saleLineItem.deleteMany();
    const customer = await tx.customer.deleteMany();
    const purchase = await tx.purchase.deleteMany();
    const purchaseLineItem = await tx.purchaseLineItem.deleteMany();
    const dailyOperation = await tx.dailyOperation.deleteMany();
    const dailyOperationExpense = await tx.dailyOperationExpense.deleteMany();
    const dayClosing = await tx.dayClosing.deleteMany();
    const stockMovement = await tx.stockMovement.deleteMany();
    const stockPriceChange = await tx.stockPriceChange.deleteMany();
    const product = await tx.product.deleteMany();
    const supplier = await tx.supplier.deleteMany();
    const auditLogEntry = await tx.auditLogEntry.deleteMany();
    const activityLog = await tx.activityLog.deleteMany();
    const authAuditLog = await tx.authAuditLog.deleteMany();
    const session = await tx.session.deleteMany();

    return {
      staffPayment: staffPayment.count,
      expenseRecord: expenseRecord.count,
      sale: sale.count,
      saleLineItem: saleLineItem.count,
      customer: customer.count,
      purchase: purchase.count,
      purchaseLineItem: purchaseLineItem.count,
      dailyOperation: dailyOperation.count,
      dailyOperationExpense: dailyOperationExpense.count,
      dayClosing: dayClosing.count,
      stockMovement: stockMovement.count,
      stockPriceChange: stockPriceChange.count,
      product: product.count,
      supplier: supplier.count,
      auditLogEntry: auditLogEntry.count,
      activityLog: activityLog.count,
      authAuditLog: authAuditLog.count,
      session: session.count,
    };
  });

  const preserved = await countTables(PRESERVED_TABLES, admin);
  const verification = await verifyProductionInitializationState(admin);

  await disconnectAdminPrismaClient();

  return {
    deleted: deletedCounts,
    preserved,
    verification,
  };
}

function userCanAuthenticate(passwordHash: string, active: boolean): boolean {
  if (!active || !passwordHash.trim()) {
    return false;
  }

  return (
    passwordHash.startsWith("$2") || passwordHash.startsWith("local-")
  );
}

export async function verifyProductionInitializationState(
  client: ReturnType<typeof getAdminPrismaClient> = getAdminPrismaClient()
): Promise<ProductionInitializationVerification> {
  const errors: string[] = [];

  const clearedAfter = await countTables(CLEARED_TABLES, client);
  let operationalRecordCount = 0;

  for (const table of CLEARED_TABLES) {
    const count = clearedAfter[table] ?? 0;
    operationalRecordCount += count;
    if (count > 0) {
      errors.push(`${table} still has ${count} record(s).`);
    }
  }

  const productCount = clearedAfter.product ?? 0;
  if (productCount !== 0) {
    errors.push(`Expected zero products, found ${productCount}.`);
  }

  const [users, staff, branch, productCategories, expenseCategories, settings] =
    await Promise.all([
      client.user.findMany({
        where: { active: true },
        include: { role: true, branch: true },
        orderBy: { username: "asc" },
      }),
      client.staff.findMany({
        where: { active: true },
        include: { role: true, branch: true },
        orderBy: { name: "asc" },
      }),
      client.branch.findFirst({
        where: { code: DEFAULT_BRANCH_CODE },
      }),
      client.productCategory.count({ where: { active: true } }),
      client.expenseCategory.count(),
      client.appSetting.findUnique({ where: { id: "default" } }),
    ]);

  for (const username of REQUIRED_USERNAMES) {
    if (!users.some((user) => user.username === username)) {
      errors.push(`Missing required user account: ${username}.`);
    }
  }

  const retainedStaffNames = staff.map((member) => member.name.trim());
  for (const requiredName of RETAINED_STAFF_NAMES) {
    if (!retainedStaffNames.includes(requiredName)) {
      errors.push(`Missing required staff profile: ${requiredName}.`);
    }
  }

  if (!branch) {
    errors.push(`Missing required branch: ${DEFAULT_BRANCH_NAME} (${DEFAULT_BRANCH_CODE}).`);
  } else {
    if (branch.name !== DEFAULT_BRANCH_NAME) {
      errors.push(
        `Branch code ${DEFAULT_BRANCH_CODE} is named "${branch.name}" instead of "${DEFAULT_BRANCH_NAME}".`
      );
    }
    if (!branch.active) {
      errors.push(`Branch ${DEFAULT_BRANCH_NAME} is not active.`);
    }
  }

  if (productCategories === 0) {
    errors.push("Product categories are empty.");
  }

  if (expenseCategories === 0) {
    errors.push("Expense categories are empty.");
  }

  if (!settings) {
    errors.push("Application settings are missing.");
  }

  const retainedUsers = users.map((user) => ({
    username: user.username,
    displayName: user.displayName,
    role: user.role.name,
    canAuthenticate: userCanAuthenticate(user.passwordHash, user.active),
  }));

  for (const user of retainedUsers) {
    if (!user.canAuthenticate) {
      errors.push(`User ${user.username} is not ready to authenticate.`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    operationalRecordCount,
    productCount,
    retainedUsers,
    retainedStaff: staff.map((member) => ({
      name: member.name,
      branch: member.branch.name,
      role: member.role.name,
    })),
    retainedBranch: branch
      ? { code: branch.code, name: branch.name, active: branch.active }
      : null,
    retainedProductCategories: productCategories,
    retainedExpenseCategories: expenseCategories,
    retainedSettings: !!settings,
  };
}

export async function getProductionInitializationPreview(): Promise<{
  cleared: TableCounts;
  preserved: TableCounts;
}> {
  return {
    cleared: await countTables(CLEARED_TABLES),
    preserved: await countTables(PRESERVED_TABLES),
  };
}

// Backward-compatible alias used by the earlier production reset script.
export async function runProductionReset(): Promise<{
  deleted: TableCounts;
  retained: TableCounts;
  productsReset: number;
  verification: {
    passed: boolean;
    errors: string[];
    retainedUsers: Array<{ username: string; displayName: string; role: string }>;
    retainedStaff: Array<{ name: string; branch: string; role: string }>;
    retainedBranch: { code: string; name: string } | null;
    retainedProducts: number;
    retainedCategories: number;
    retainedSettings: boolean;
  };
}> {
  const report = await runProductionInitialization();

  return {
    deleted: report.deleted,
    retained: report.preserved,
    productsReset: report.deleted.product ?? 0,
    verification: {
      passed: report.verification.passed,
      errors: report.verification.errors,
      retainedUsers: report.verification.retainedUsers.map(
        ({ canAuthenticate: _canAuthenticate, ...user }) => user
      ),
      retainedStaff: report.verification.retainedStaff,
      retainedBranch: report.verification.retainedBranch
        ? {
            code: report.verification.retainedBranch.code,
            name: report.verification.retainedBranch.name,
          }
        : null,
      retainedProducts: report.verification.productCount,
      retainedCategories: report.verification.retainedProductCategories,
      retainedSettings: report.verification.retainedSettings,
    },
  };
}

export async function getProductionResetPreview(): Promise<{
  operational: TableCounts;
  retained: TableCounts;
}> {
  const preview = await getProductionInitializationPreview();
  return {
    operational: preview.cleared,
    retained: preview.preserved,
  };
}

export async function verifyProductionResetState(): Promise<{
  passed: boolean;
  errors: string[];
  retainedUsers: Array<{ username: string; displayName: string; role: string }>;
  retainedStaff: Array<{ name: string; branch: string; role: string }>;
  retainedBranch: { code: string; name: string } | null;
  retainedProducts: number;
  retainedCategories: number;
  retainedSettings: boolean;
}> {
  const verification = await verifyProductionInitializationState();

  return {
    passed: verification.passed,
    errors: verification.errors,
    retainedUsers: verification.retainedUsers.map(
      ({ canAuthenticate: _canAuthenticate, ...user }) => user
    ),
    retainedStaff: verification.retainedStaff,
    retainedBranch: verification.retainedBranch
      ? {
          code: verification.retainedBranch.code,
          name: verification.retainedBranch.name,
        }
      : null,
    retainedProducts: verification.productCount,
    retainedCategories: verification.retainedProductCategories,
    retainedSettings: verification.retainedSettings,
  };
}
