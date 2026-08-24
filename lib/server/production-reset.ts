import { prisma } from "@/lib/db";
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

async function countTables(tableNames: readonly string[]): Promise<TableCounts> {
  const counters: Record<string, () => Promise<number>> = {
    staffPayment: () => prisma.staffPayment.count(),
    expenseRecord: () => prisma.expenseRecord.count(),
    sale: () => prisma.sale.count(),
    saleLineItem: () => prisma.saleLineItem.count(),
    customer: () => prisma.customer.count(),
    purchase: () => prisma.purchase.count(),
    purchaseLineItem: () => prisma.purchaseLineItem.count(),
    dailyOperation: () => prisma.dailyOperation.count(),
    dailyOperationExpense: () => prisma.dailyOperationExpense.count(),
    dayClosing: () => prisma.dayClosing.count(),
    stockMovement: () => prisma.stockMovement.count(),
    stockPriceChange: () => prisma.stockPriceChange.count(),
    product: () => prisma.product.count(),
    supplier: () => prisma.supplier.count(),
    auditLogEntry: () => prisma.auditLogEntry.count(),
    activityLog: () => prisma.activityLog.count(),
    authAuditLog: () => prisma.authAuditLog.count(),
    session: () => prisma.session.count(),
    role: () => prisma.role.count(),
    branch: () => prisma.branch.count(),
    user: () => prisma.user.count(),
    userPreference: () => prisma.userPreference.count(),
    staff: () => prisma.staff.count(),
    appSetting: () => prisma.appSetting.count(),
    expenseTemplate: () => prisma.expenseTemplate.count(),
    productCategory: () => prisma.productCategory.count(),
    expenseCategory: () => prisma.expenseCategory.count(),
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
  const deletedCounts = await prisma.$transaction(async (tx) => {
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

  const preserved = await countTables(PRESERVED_TABLES);
  const verification = await verifyProductionInitializationState();

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

export async function verifyProductionInitializationState(): Promise<ProductionInitializationVerification> {
  const errors: string[] = [];

  const clearedAfter = await countTables(CLEARED_TABLES);
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
      prisma.user.findMany({
        where: { active: true },
        include: { role: true, branch: true },
        orderBy: { username: "asc" },
      }),
      prisma.staff.findMany({
        where: { active: true },
        include: { role: true, branch: true },
        orderBy: { name: "asc" },
      }),
      prisma.branch.findFirst({
        where: { code: DEFAULT_BRANCH_CODE },
      }),
      prisma.productCategory.count({ where: { active: true } }),
      prisma.expenseCategory.count(),
      prisma.appSetting.findUnique({ where: { id: "default" } }),
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
