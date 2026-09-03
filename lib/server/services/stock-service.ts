import type { BranchIdFilter } from "@/lib/server/branch-scope";
import { resolveBranchListFilter } from "@/lib/server/branch-scope";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { resolveStockBranchIdForSession } from "@/lib/server/branch-lookup";
import { recordDeleteAudit } from "@/lib/server/data-protection/audit";
import { assertDestructiveApiAllowed } from "@/lib/server/data-protection/guards";
import { softDeleteManyByProductId } from "@/lib/server/data-protection/soft-delete";
import { getCategoryIdBySlug } from "@/lib/server/product-category-lookup";
import { toJsonField } from "@/lib/server/json-fields";
import {
  mapMovementToEntity,
  mapPriceChangeToEntity,
  mapProductToEntity,
} from "@/lib/server/mappers/entities";
import { applyStockMovement } from "@/lib/server/stock-transactions";
import { requireSession } from "@/lib/server/session";
import { recordTransactionAudit } from "@/lib/server/transaction-audit";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import { computeProductStatus } from "@/lib/stock/product-status";
import type {
  StockMovement,
  StockMovementInput,
  StockPriceChange,
  StockProduct,
  StockProductInput,
  StockProductUpdateInput,
} from "@/types/stock";
import type { StaffActionRecord } from "@/types/staff-session";

import type { AuthSession } from "@/types/auth";

const productInclude = { category: true, branch: true } as const;
const movementInclude = { branch: true } as const;

async function requireProductInActiveBranch(
  session: AuthSession,
  id: string
) {
  const branchFilter = await resolveBranchListFilter(session);
  const product = await prisma.product.findFirst({
    where: {
      id,
      branchId: branchFilter.branchId,
      deletedAt: null,
    },
    include: productInclude,
  });

  if (!product) {
    throw new ApiError("Product not found.", {
      status: 404,
      code: "not_found",
    });
  }

  return product;
}

export async function listProducts(
  session: AuthSession
): Promise<StockProduct[]> {
  const branchFilter = await resolveBranchListFilter(session);
  const products = await prisma.product.findMany({
    where: {
      branchId: branchFilter.branchId,
      deletedAt: null,
    },
    include: productInclude,
    orderBy: { name: "asc" },
  });

  return products.map(mapProductToEntity);
}

export async function createProduct(
  input: StockProductInput
): Promise<StockProduct> {
  const session = await requireSession();

  const name = input.name.trim();
  if (!name) {
    throw new ApiError("Product name is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  if (input.buyingPrice <= 0 || input.sellingPrice <= 0) {
    throw new ApiError("Prices must be greater than zero.", {
      status: 400,
      code: "validation_error",
    });
  }

  const initialStock = Math.max(0, input.initialStock ?? 0);
  const status = computeProductStatus(initialStock, input.minimumStockLevel);
  const categoryId = await getCategoryIdBySlug(input.category);
  const today = new Date().toISOString().slice(0, 10);
  const branchId = await resolveStockBranchIdForSession(session, input.branch);

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name,
          categoryId,
          branchId,
          sku: input.sku?.trim() || null,
          buyingPrice: input.buyingPrice,
          sellingPrice: input.sellingPrice,
          currentStock: initialStock,
          minimumStockLevel: input.minimumStockLevel,
          notes: input.notes?.trim() || null,
          status,
        },
        include: productInclude,
      });

      if (initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            date: today,
            productId: created.id,
            productName: created.name,
            movement: "in",
            quantity: initialStock,
            reason: "Opening stock",
            branchId,
            notes: "Initial product stock",
          },
        });
      }

      return created;
    });

    return mapProductToEntity(product);
  } catch (error) {
    throw mapProductMutationError(error);
  }
}

function mapProductMutationError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    const prismaError = error as Error & { code?: string; meta?: unknown };

    if (prismaError.code === "P2002") {
      return new ApiError("A product with this SKU already exists.", {
        status: 409,
        code: "duplicate_sku",
        details:
          process.env.NODE_ENV === "development"
            ? { prismaCode: prismaError.code, prismaMeta: prismaError.meta }
            : undefined,
      });
    }

    if (prismaError.code === "P2003") {
      return new ApiError("Product could not be saved because a related record is missing.", {
        status: 400,
        code: "foreign_key_violation",
        details:
          process.env.NODE_ENV === "development"
            ? { prismaCode: prismaError.code, prismaMeta: prismaError.meta }
            : undefined,
      });
    }

    if (prismaError.code === "P2022") {
      return new ApiError(
        "Product table schema is out of date. Run `npx prisma migrate deploy`.",
        {
          status: 503,
          code: "schema_out_of_date",
          details:
            process.env.NODE_ENV === "development"
              ? { prismaCode: prismaError.code, prismaMeta: prismaError.meta }
              : undefined,
        }
      );
    }

    return new ApiError(error.message, {
      status: 500,
      code: prismaError.code ?? "product_create_failed",
      details:
        process.env.NODE_ENV === "development"
          ? {
              stack: error.stack,
              prismaCode: prismaError.code,
              prismaMeta: prismaError.meta,
            }
          : undefined,
    });
  }

  return new ApiError("Product could not be saved.", {
    status: 500,
    code: "product_create_failed",
  });
}

export async function updateProduct(
  id: string,
  input: StockProductUpdateInput,
  session?: AuthSession
): Promise<StockProduct> {
  const authSession = session ?? (await requireSession());
  const existing = await requireProductInActiveBranch(authSession, id);

  const name = input.name.trim();
  if (!name) {
    throw new ApiError("Product name is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  if (input.buyingPrice <= 0 || input.sellingPrice <= 0) {
    throw new ApiError("Prices must be greater than zero.", {
      status: 400,
      code: "validation_error",
    });
  }

  const buyingPriceChanged = existing.buyingPrice !== input.buyingPrice;
  const sellingPriceChanged = existing.sellingPrice !== input.sellingPrice;
  const categoryId = await getCategoryIdBySlug(input.category);

  const product = await prisma.$transaction(async (tx) => {
    if (buyingPriceChanged || sellingPriceChanged) {
      await tx.stockPriceChange.create({
        data: {
          productId: id,
          previousBuyingPrice: existing.buyingPrice,
          previousSellingPrice: existing.sellingPrice,
          newBuyingPrice: input.buyingPrice,
          newSellingPrice: input.sellingPrice,
        },
      });
    }

    if (existing.name !== name) {
      await tx.stockMovement.updateMany({
        where: { productId: id },
        data: { productName: name },
      });
    }

    return tx.product.update({
      where: { id },
      data: {
        name,
        categoryId,
        sku: input.sku?.trim() || null,
        buyingPrice: input.buyingPrice,
        sellingPrice: input.sellingPrice,
        minimumStockLevel: input.minimumStockLevel,
        notes: input.notes?.trim() || null,
        status: computeProductStatus(
          existing.currentStock,
          input.minimumStockLevel
        ),
      },
      include: productInclude,
    });
  });

  return mapProductToEntity(product);
}

export async function deleteProduct(id: string): Promise<void> {
  assertDestructiveApiAllowed("Product deletion");

  const session = await requireSession();
  const existing = await requireProductInActiveBranch(session, id);

  const [saleLines, purchaseLines] = await Promise.all([
    prisma.saleLineItem.count({ where: { productId: id } }),
    prisma.purchaseLineItem.count({ where: { productId: id } }),
  ]);

  if (saleLines + purchaseLines > 0) {
    throw new ApiError(
      "Cannot delete a product referenced by sales or purchases.",
      { status: 409, code: "product_in_use" }
    );
  }

  await prisma.$transaction(async (tx) => {
    await softDeleteManyByProductId(id, tx);
  });

  await recordDeleteAudit(session, "stock", id, existing as Record<string, unknown>);
}

export async function listMovements(
  branchFilter: BranchIdFilter
): Promise<StockMovement[]> {
  const movements = await prisma.stockMovement.findMany({
    where: { branchId: branchFilter.branchId, deletedAt: null },
    include: movementInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return movements.map(mapMovementToEntity);
}

export async function createMovement(
  input: StockMovementInput,
  createdBy?: StaffActionRecord
): Promise<StockMovement> {
  const session = await requireSession();
  const product = await requireProductInActiveBranch(session, input.productId);

  if (input.quantity <= 0) {
    throw new ApiError("Quantity must be greater than zero.", {
      status: 400,
      code: "validation_error",
    });
  }

  const branchCode = input.branch?.trim();
  if (!branchCode) {
    throw new ApiError("Branch is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  const branchId = await resolveStockBranchIdForSession(session, branchCode);
  if (branchId !== product.branchId) {
    throw new ApiError("Product does not belong to this branch.", {
      status: 403,
      code: "branch_forbidden",
    });
  }
  let movementId: string;

  await prisma.$transaction(async (tx) => {
    movementId = await applyStockMovement(tx, {
      productId: input.productId,
      movement: input.movement,
      quantity: input.quantity,
      reason: input.reason,
      branchId,
      date: input.date ?? new Date().toISOString().slice(0, 10),
      notes: input.notes,
      createdBy,
    });

    if (session) {
      await recordTransactionAudit(
        tx,
        session,
        input.movement === "in" ? AUDIT_ACTIONS.STOCK_IN : AUDIT_ACTIONS.STOCK_OUT,
        `${input.quantity} units ${input.movement === "in" ? "in" : "out"} for ${input.reason.trim()}.`
      );
    }
  });

  const movement = await prisma.stockMovement.findUniqueOrThrow({
    where: { id: movementId! },
    include: movementInclude,
  });

  return mapMovementToEntity(movement);
}

export async function listPriceChanges(
  session: AuthSession
): Promise<StockPriceChange[]> {
  const branchFilter = await resolveBranchListFilter(session);
  const changes = await prisma.stockPriceChange.findMany({
    where: {
      product: {
        branchId: branchFilter.branchId,
        deletedAt: null,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return changes.map(mapPriceChangeToEntity);
}

export async function createPriceChange(input: {
  productId: string;
  newBuyingPrice: number;
  newSellingPrice: number;
}): Promise<StockPriceChange> {
  const session = await requireSession();
  const product = await requireProductInActiveBranch(session, input.productId);

  const change = await prisma.$transaction(async (tx) => {
    const record = await tx.stockPriceChange.create({
      data: {
        productId: product.id,
        previousBuyingPrice: product.buyingPrice,
        previousSellingPrice: product.sellingPrice,
        newBuyingPrice: input.newBuyingPrice,
        newSellingPrice: input.newSellingPrice,
      },
    });

    await tx.product.update({
      where: { id: product.id },
      data: {
        buyingPrice: input.newBuyingPrice,
        sellingPrice: input.newSellingPrice,
      },
    });

    return record;
  });

  return mapPriceChangeToEntity(change);
}

export async function getProductById(
  id: string,
  session: AuthSession
): Promise<StockProduct | null> {
  const branchFilter = await resolveBranchListFilter(session);
  const product = await prisma.product.findFirst({
    where: {
      id,
      branchId: branchFilter.branchId,
      deletedAt: null,
    },
    include: productInclude,
  });
  return product ? mapProductToEntity(product) : null;
}
