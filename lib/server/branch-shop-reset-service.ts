import { ApiError } from "@/lib/api/errors";
import {
  createDatabaseBackup,
  resolveBackupArtifactPath,
} from "@/lib/backup/backup";
import { getEquivalentBranchCodes } from "@/lib/branch/codes";
import { prisma } from "@/lib/db";
import { getAdminPrismaClient, disconnectAdminPrismaClient } from "@/lib/db/admin-prisma";
import {
  assertSafeTransactionalResetTarget,
  describeResetTargetAuthorization,
  type ResetTargetAuthorization,
} from "@/lib/server/database-target-guard";
import { requireOwner } from "@/lib/server/security/authorization";
import { recordSecurityAuditInTransaction } from "@/lib/server/security/audit";
import { getBranchIdByCode, getBranchCodeById } from "@/lib/server/branch-lookup";
import {
  DEFAULT_BRANCH_NAME,
  SALAAMA_BRANCH_NAME,
} from "@/lib/constants";
import {
  assertShopResetConfirmation,
  resolveCanonicalBranchCode,
  resolveShopResetScope,
  type ShopResetScope,
} from "@/lib/shop-reset/constants";
import type { AuthSession } from "@/types/auth";
import type { Branch } from "@/types";

export interface ShopResetCounts {
  sales: number;
  saleLineItems: number;
  expenses: number;
  purchases: number;
  purchaseLineItems: number;
  staffPayments: number;
  dailyOperations: number;
  dailyOperationExpenses: number;
  dayClosings: number;
  stockMovements: number;
  stockPriceChanges: number;
  customers: number;
  suppliers: number;
  auditLogEntries: number;
  productStockReset: number;
}

export interface ShopResetPreview {
  scope: ShopResetScope;
  branchCodes: Branch[];
  branchLabels: string[];
  counts: ShopResetCounts;
  preserved: {
    users: number;
    staff: number;
    roles: number;
    branches: number;
    products: number;
    productCategories: number;
    settings: number;
  };
  warnings: string[];
  openBusinessDayCount: number;
  canReset: boolean;
  resetTarget: ResetTargetAuthorization;
}

export interface ShopResetReport {
  scope: ShopResetScope;
  branchCodes: Branch[];
  resetType: "single-branch" | "both-branches";
  backupId?: string;
  backupPath?: string;
  deleted: ShopResetCounts;
  verification: ShopResetCounts;
  preserved: ShopResetPreview["preserved"];
}

async function resolveBranchTargets(
  scope: ShopResetScope
): Promise<Array<{ id: string; code: Branch }>> {
  if (scope === "both") {
    const mainId = await getBranchIdByCode("main");
    const salaamaId = await getBranchIdByCode("salaama");
    return [
      { id: mainId, code: "main" },
      { id: salaamaId, code: await getBranchCodeById(salaamaId) as Branch },
    ];
  }

  const canonical = resolveCanonicalBranchCode(scope);
  const branchId = await getBranchIdByCode(canonical);
  return [{ id: branchId, code: canonical }];
}

function branchCodesForAudit(branchCodes: Branch[]): string[] {
  const codes = new Set<string>();
  for (const code of branchCodes) {
    for (const equivalent of getEquivalentBranchCodes(code)) {
      codes.add(equivalent);
    }
  }
  return [...codes];
}

async function countBranchScopedData(
  branchIds: string[],
  branchCodes: Branch[]
): Promise<ShopResetCounts> {
  const client = getAdminPrismaClient();
  const auditCodes = branchCodesForAudit(branchCodes);
  const productIds = (
    await client.product.findMany({
      where: { branchId: { in: branchIds } },
      select: { id: true },
    })
  ).map((product) => product.id);

  const saleIds = (
    await client.sale.findMany({
      where: { branchId: { in: branchIds } },
      select: { id: true },
    })
  ).map((sale) => sale.id);

  const purchaseIds = (
    await client.purchase.findMany({
      where: { branchId: { in: branchIds } },
      select: { id: true },
    })
  ).map((purchase) => purchase.id);

  const [
    sales,
    saleLineItems,
    expenses,
    purchases,
    purchaseLineItems,
    staffPayments,
    dailyOperations,
    dailyOperationExpenses,
    dayClosings,
    stockMovements,
    stockPriceChanges,
    auditLogEntries,
    products,
  ] = await Promise.all([
    client.sale.count({ where: { branchId: { in: branchIds } } }),
    saleIds.length
      ? client.saleLineItem.count({ where: { saleId: { in: saleIds } } })
      : Promise.resolve(0),
    client.expenseRecord.count({ where: { branchId: { in: branchIds } } }),
    client.purchase.count({ where: { branchId: { in: branchIds } } }),
    purchaseIds.length
      ? client.purchaseLineItem.count({
          where: { purchaseId: { in: purchaseIds } },
        })
      : Promise.resolve(0),
    client.staffPayment.count({ where: { branchId: { in: branchIds } } }),
    client.dailyOperation.count({ where: { branchId: { in: branchIds } } }),
    client.dailyOperation.count({ where: { branchId: { in: branchIds } } }).then(
      async (operationCount) => {
        if (operationCount === 0) return 0;
        const operationIds = (
          await client.dailyOperation.findMany({
            where: { branchId: { in: branchIds } },
            select: { id: true },
          })
        ).map((operation) => operation.id);
        return client.dailyOperationExpense.count({
          where: { dailyOperationId: { in: operationIds } },
        });
      }
    ),
    client.dayClosing.count({ where: { branchId: { in: branchIds } } }),
    client.stockMovement.count({ where: { branchId: { in: branchIds } } }),
    productIds.length
      ? client.stockPriceChange.count({
          where: { productId: { in: productIds } },
        })
      : Promise.resolve(0),
    client.auditLogEntry.count({ where: { branchCode: { in: auditCodes } } }),
    client.product.count({ where: { branchId: { in: branchIds } } }),
  ]);

  const customers = saleIds.length
    ? (
        await client.customer.findMany({
          where: { sales: { some: { id: { in: saleIds } } } },
          select: { id: true },
        })
      ).length
    : 0;

  const suppliers = purchaseIds.length
    ? (
        await client.supplier.findMany({
          where: { purchases: { some: { id: { in: purchaseIds } } } },
          select: { id: true },
        })
      ).length
    : 0;

  return {
    sales,
    saleLineItems,
    expenses,
    purchases,
    purchaseLineItems,
    staffPayments,
    dailyOperations,
    dailyOperationExpenses,
    dayClosings,
    stockMovements,
    stockPriceChanges,
    customers,
    suppliers,
    auditLogEntries,
    productStockReset: products,
  };
}

async function countPreservedMasterData(): Promise<ShopResetPreview["preserved"]> {
  const client = getAdminPrismaClient();
  const [users, staff, roles, branches, products, productCategories, settings] =
    await Promise.all([
      client.user.count(),
      client.staff.count(),
      client.role.count(),
      client.branch.count(),
      client.product.count(),
      client.productCategory.count(),
      client.appSetting.count(),
    ]);

  return { users, staff, roles, branches, products, productCategories, settings };
}

async function countOpenBusinessDays(branchIds: string[]): Promise<number> {
  return prisma.dayClosing.count({
    where: {
      branchId: { in: branchIds },
      status: { in: ["open", "close_requested"] },
    },
  });
}

async function deleteBranchScopedData(
  tx: Parameters<Parameters<ReturnType<typeof getAdminPrismaClient>["$transaction"]>[0]>[0],
  branchIds: string[],
  branchCodes: Branch[]
): Promise<ShopResetCounts> {
  const auditCodes = branchCodesForAudit(branchCodes);
  const productIds = (
    await tx.product.findMany({
      where: { branchId: { in: branchIds } },
      select: { id: true },
    })
  ).map((product) => product.id);

  const staffPayments = await tx.staffPayment.deleteMany({
    where: { branchId: { in: branchIds } },
  });
  const expenses = await tx.expenseRecord.deleteMany({
    where: { branchId: { in: branchIds } },
  });
  const saleLineItems = await tx.saleLineItem.deleteMany({
    where: { sale: { branchId: { in: branchIds } } },
  });
  const sales = await tx.sale.deleteMany({
    where: { branchId: { in: branchIds } },
  });
  const purchaseLineItems = await tx.purchaseLineItem.deleteMany({
    where: { purchase: { branchId: { in: branchIds } } },
  });
  const purchases = await tx.purchase.deleteMany({
    where: { branchId: { in: branchIds } },
  });
  const dailyOperationExpenses = await tx.dailyOperationExpense.deleteMany({
    where: { dailyOperation: { branchId: { in: branchIds } } },
  });
  const dailyOperations = await tx.dailyOperation.deleteMany({
    where: { branchId: { in: branchIds } },
  });
  const dayClosings = await tx.dayClosing.deleteMany({
    where: { branchId: { in: branchIds } },
  });
  const stockMovements = await tx.stockMovement.deleteMany({
    where: { branchId: { in: branchIds } },
  });
  const stockPriceChanges = productIds.length
    ? await tx.stockPriceChange.deleteMany({
        where: { productId: { in: productIds } },
      })
    : { count: 0 };
  const customers = await tx.customer.deleteMany({
    where: { sales: { none: {} } },
  });
  const suppliers = await tx.supplier.deleteMany({
    where: { purchases: { none: {} } },
  });
  const auditLogEntries = await tx.auditLogEntry.deleteMany({
    where: { branchCode: { in: auditCodes } },
  });
  const productStockReset = await tx.product.updateMany({
    where: { branchId: { in: branchIds } },
    data: {
      currentStock: 0,
      status: "in-stock",
      deletedAt: null,
    },
  });

  return {
    sales: sales.count,
    saleLineItems: saleLineItems.count,
    expenses: expenses.count,
    purchases: purchases.count,
    purchaseLineItems: purchaseLineItems.count,
    staffPayments: staffPayments.count,
    dailyOperations: dailyOperations.count,
    dailyOperationExpenses: dailyOperationExpenses.count,
    dayClosings: dayClosings.count,
    stockMovements: stockMovements.count,
    stockPriceChanges: stockPriceChanges.count,
    customers: customers.count,
    suppliers: suppliers.count,
    auditLogEntries: auditLogEntries.count,
    productStockReset: productStockReset.count,
  };
}

export async function previewBranchShopReset(
  scopeInput: string,
  session: AuthSession
): Promise<ShopResetPreview> {
  requireOwner(session);

  const scope = resolveShopResetScope(scopeInput);
  const targets = await resolveBranchTargets(scope);
  const branchIds = targets.map((target) => target.id);
  const branchCodes = targets.map((target) => target.code);

  const openBusinessDayCount = await countOpenBusinessDays(branchIds);
  const warnings: string[] = [
    "This reset will clear open, pending, and completed operational records for the selected shop.",
  ];

  if (openBusinessDayCount > 0) {
    warnings.push(
      "Resetting this shop will also clear its open and pending business days. Make sure the shop is not actively being used."
    );
  }

  const counts = await countBranchScopedData(branchIds, branchCodes);
  const preserved = await countPreservedMasterData();
  const resetTarget = describeResetTargetAuthorization();

  const branchLabels =
    scope === "both"
      ? [DEFAULT_BRANCH_NAME, SALAAMA_BRANCH_NAME]
      : branchCodes.map((code) =>
          code === "main" ? DEFAULT_BRANCH_NAME : SALAAMA_BRANCH_NAME
        );

  return {
    scope,
    branchCodes,
    branchLabels,
    counts,
    preserved,
    warnings,
    openBusinessDayCount,
    canReset: resetTarget.authorized,
    resetTarget,
  };
}

export async function runBranchShopReset(
  input: {
    scope: string;
    confirmation: string;
  },
  session: AuthSession
): Promise<ShopResetReport> {
  requireOwner(session);

  assertSafeTransactionalResetTarget();

  const scope = resolveShopResetScope(input.scope);

  try {
    assertShopResetConfirmation(scope, input.confirmation);
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Invalid confirmation phrase.",
      { status: 400, code: "confirmation_required" }
    );
  }

  const targets = await resolveBranchTargets(scope);
  const branchIds = targets.map((target) => target.id);
  const branchCodes = targets.map((target) => target.code);

  let backup;
  try {
    backup = await createDatabaseBackup();
  } catch (error) {
    throw new ApiError(
      error instanceof Error
        ? `Backup failed — shop reset was not started. ${error.message}`
        : "Backup failed — shop reset was not started.",
      { status: 500, code: "backup_failed" }
    );
  }
  // Must accept JSON artifacts (jsonPath) as well as archive/sql — Preview
  // serverless backups are JSON (optionally gzip). Omitting jsonPath made a
  // successful JSON backup look like a failure and blocked shop reset.
  const backupPath = resolveBackupArtifactPath(backup);
  if (!backupPath) {
    throw new ApiError("Backup failed — shop reset was not started.", {
      status: 500,
      code: "backup_failed",
    });
  }

  const client = getAdminPrismaClient();

  const deleted = await client.$transaction(async (tx) => {
    const result = await deleteBranchScopedData(tx, branchIds, branchCodes);

    await recordSecurityAuditInTransaction(
      tx,
      session,
      "Shop Reset",
      JSON.stringify({
        resetType: scope === "both" ? "both-branches" : "single-branch",
        scope,
        branchCodes,
        deleted: result,
      })
    );

    return result;
  });

  const verification = await countBranchScopedData(branchIds, branchCodes);
  const preserved = await countPreservedMasterData();

  await validateShopResetVerification(verification, preserved, branchIds);

  await disconnectAdminPrismaClient();

  return {
    scope,
    branchCodes,
    resetType: scope === "both" ? "both-branches" : "single-branch",
    backupPath,
    deleted,
    verification,
    preserved,
  };
}

async function validateShopResetVerification(
  verification: ShopResetCounts,
  preserved: ShopResetPreview["preserved"],
  branchIds: string[]
): Promise<void> {
  const remainingOperational =
    verification.sales +
    verification.expenses +
    verification.purchases +
    verification.staffPayments +
    verification.dailyOperations +
    verification.dayClosings +
    verification.stockMovements;

  if (remainingOperational > 0) {
    throw new ApiError("Shop reset verification failed — operational records remain.", {
      status: 500,
      code: "shop_reset_verification_failed",
    });
  }

  const remainingDayClosings = await prisma.dayClosing.count({
    where: { branchId: { in: branchIds } },
  });

  if (remainingDayClosings > 0) {
    throw new ApiError(
      "Shop reset verification failed — day closing records remain for the selected shop.",
      { status: 500, code: "shop_reset_day_closing_remaining" }
    );
  }

  const nonZeroStockProducts = await prisma.product.count({
    where: {
      branchId: { in: branchIds },
      currentStock: { not: 0 },
    },
  });

  if (nonZeroStockProducts > 0) {
    throw new ApiError(
      "Shop reset verification failed — product stock was not zeroed for the selected shop.",
      { status: 500, code: "shop_reset_stock_remaining" }
    );
  }

  if (preserved.users === 0 || preserved.staff === 0 || preserved.branches === 0) {
    throw new ApiError("Shop reset verification failed — master data was affected.", {
      status: 500,
      code: "shop_reset_master_data_affected",
    });
  }

  if (preserved.products === 0) {
    throw new ApiError("Shop reset verification failed — product catalogue was removed.", {
      status: 500,
      code: "shop_reset_catalog_affected",
    });
  }
}

export async function assertOwnerOnlyShopReset(session: AuthSession): Promise<void> {
  requireOwner(session);
}
