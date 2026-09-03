import { getAdminPrismaClient, disconnectAdminPrismaClient } from "@/lib/db/admin-prisma";
import {
  BUSINESS_RESET_CATEGORIES,
  BUSINESS_RESET_CATEGORY_LABELS,
  BUSINESS_RESET_EXECUTION_ORDER,
  expandBusinessResetSelection,
  type BusinessResetCategory,
} from "@/lib/business-reset/categories";

export type BusinessResetCounts = Record<BusinessResetCategory, number>;

export interface BusinessResetPreview {
  counts: BusinessResetCounts;
  preserved: {
    users: number;
    roles: number;
    branches: number;
    settings: number;
  };
}

export interface BusinessResetReport {
  requested: BusinessResetCategory[];
  executed: BusinessResetCategory[];
  deleted: BusinessResetCounts;
  preserved: BusinessResetPreview["preserved"];
}

const PRESERVED_COUNTERS = {
  users: (client: ReturnType<typeof getAdminPrismaClient>) => client.user.count(),
  roles: (client: ReturnType<typeof getAdminPrismaClient>) => client.role.count(),
  branches: (client: ReturnType<typeof getAdminPrismaClient>) =>
    client.branch.count(),
  settings: (client: ReturnType<typeof getAdminPrismaClient>) =>
    client.appSetting.count(),
} as const;

async function countCategoryRecords(
  client: ReturnType<typeof getAdminPrismaClient>,
  category: BusinessResetCategory
): Promise<number> {
  switch (category) {
    case "products":
      return client.product.count();
    case "stockMovements":
      return client.stockMovement.count();
    case "purchases":
      return client.purchase.count();
    case "sales":
      return client.sale.count();
    case "customers":
      return client.customer.count();
    case "suppliers":
      return client.supplier.count();
    case "expenses":
      return client.expenseRecord.count();
    case "dailyOperations":
      return (
        (await client.dailyOperation.count()) +
        (await client.dayClosing.count())
      );
    case "staffPayments":
      return client.staffPayment.count();
    case "activityLogs":
      return client.activityLog.count();
    default:
      return 0;
  }
}

async function countAllCategories(
  client: ReturnType<typeof getAdminPrismaClient>
): Promise<BusinessResetCounts> {
  const entries = await Promise.all(
    BUSINESS_RESET_CATEGORIES.map(async (category) => [
      category,
      await countCategoryRecords(client, category),
    ] as const)
  );

  return Object.fromEntries(entries) as BusinessResetCounts;
}

async function countPreserved(
  client: ReturnType<typeof getAdminPrismaClient>
): Promise<BusinessResetPreview["preserved"]> {
  const [users, roles, branches, settings] = await Promise.all([
    PRESERVED_COUNTERS.users(client),
    PRESERVED_COUNTERS.roles(client),
    PRESERVED_COUNTERS.branches(client),
    PRESERVED_COUNTERS.settings(client),
  ]);

  return { users, roles, branches, settings };
}

export async function getBusinessDataResetPreview(): Promise<BusinessResetPreview> {
  const client = getAdminPrismaClient();

  return {
    counts: await countAllCategories(client),
    preserved: await countPreserved(client),
  };
}

async function deleteCategory(
  tx: Parameters<
    Parameters<ReturnType<typeof getAdminPrismaClient>["$transaction"]>[0]
  >[0],
  category: BusinessResetCategory
): Promise<number> {
  switch (category) {
    case "activityLogs": {
      const result = await tx.activityLog.deleteMany();
      return result.count;
    }
    case "staffPayments": {
      const result = await tx.staffPayment.deleteMany();
      return result.count;
    }
    case "expenses": {
      const result = await tx.expenseRecord.deleteMany();
      return result.count;
    }
    case "sales": {
      await tx.saleLineItem.deleteMany();
      const result = await tx.sale.deleteMany();
      return result.count;
    }
    case "purchases": {
      await tx.purchaseLineItem.deleteMany();
      const result = await tx.purchase.deleteMany();
      return result.count;
    }
    case "dailyOperations": {
      await tx.dailyOperationExpense.deleteMany();
      await tx.dailyOperation.deleteMany();
      const result = await tx.dayClosing.deleteMany();
      return result.count;
    }
    case "stockMovements": {
      const result = await tx.stockMovement.deleteMany();
      return result.count;
    }
    case "products": {
      await tx.stockPriceChange.deleteMany();
      const result = await tx.product.deleteMany();
      return result.count;
    }
    case "customers": {
      const result = await tx.customer.deleteMany();
      return result.count;
    }
    case "suppliers": {
      const result = await tx.supplier.deleteMany();
      return result.count;
    }
    default:
      return 0;
  }
}

function validatePreserved(preserved: BusinessResetPreview["preserved"]): void {
  if (preserved.users === 0) {
    throw new Error("Business data reset aborted: no user accounts remain.");
  }

  if (preserved.roles === 0) {
    throw new Error("Business data reset aborted: no roles remain.");
  }

  if (preserved.branches === 0) {
    throw new Error("Business data reset aborted: no branches remain.");
  }

  if (preserved.settings === 0) {
    throw new Error("Business data reset aborted: system settings are missing.");
  }
}

export async function runBusinessDataReset(options: {
  categories: BusinessResetCategory[];
}): Promise<BusinessResetReport> {
  const requested = [...new Set(options.categories)];
  if (requested.length === 0) {
    throw new Error("Select at least one category to reset.");
  }

  const executed = expandBusinessResetSelection(requested);
  const client = getAdminPrismaClient();
  const deleted: Partial<BusinessResetCounts> = {};

  await client.$transaction(async (tx) => {
    for (const category of BUSINESS_RESET_EXECUTION_ORDER) {
      if (!executed.includes(category)) {
        continue;
      }

      deleted[category] = await deleteCategory(tx, category);
    }
  });

  const preserved = await countPreserved(client);
  validatePreserved(preserved);

  for (const category of executed) {
    const remaining = await countCategoryRecords(client, category);
    if (remaining > 0) {
      throw new Error(
        `${BUSINESS_RESET_CATEGORY_LABELS[category]} still has ${remaining} record(s) after reset.`
      );
    }
  }

  await disconnectAdminPrismaClient();

  const deletedCounts = Object.fromEntries(
    BUSINESS_RESET_CATEGORIES.map((category) => [
      category,
      deleted[category] ?? 0,
    ])
  ) as BusinessResetCounts;

  return {
    requested,
    executed,
    deleted: deletedCounts,
    preserved,
  };
}
