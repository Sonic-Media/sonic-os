import { ApiError } from "@/lib/api/errors";
import type { Prisma } from "@/lib/prisma";
import { computeWeightedAverageBuyingPrice } from "@/lib/purchasing/calculations";
import { assertSufficientBranchStock } from "@/lib/server/branch-inventory";
import { toJsonField } from "@/lib/server/json-fields";
import { computeProductStatus } from "@/lib/stock/product-status";
import type { StaffActionRecord } from "@/types/staff-session";

type CachedProduct = {
  id: string;
  name: string;
  currentStock: number;
  minimumStockLevel: number;
  buyingPrice: number;
  sellingPrice: number;
  status: string;
};

export type ProductCache = Map<string, CachedProduct>;

export interface ApplyStockMovementInput {
  productId: string;
  movement: "in" | "out";
  quantity: number;
  reason: string;
  branchId: string;
  date: string;
  notes?: string | null;
  createdBy?: StaffActionRecord;
}

export async function applyStockMovement(
  tx: Prisma.TransactionClient,
  input: ApplyStockMovementInput,
  productCache?: ProductCache
): Promise<string> {
  let product = productCache?.get(input.productId);

  if (!product) {
    const loaded = await tx.product.findUnique({
      where: { id: input.productId },
    });

    if (!loaded) {
      throw new ApiError("Product not found.", {
        status: 404,
        code: "not_found",
      });
    }

    product = loaded;
  }

  if (input.quantity <= 0) {
    throw new ApiError("Quantity must be greater than zero.", {
      status: 400,
      code: "validation_error",
    });
  }

  if (input.movement === "out") {
    await assertSufficientBranchStock(
      tx,
      input.branchId,
      input.productId,
      input.quantity
    );
  }

  const nextStock =
    input.movement === "in"
      ? product.currentStock + input.quantity
      : product.currentStock - input.quantity;

  if (nextStock < 0) {
    throw new ApiError("Stock cannot go below zero.", {
      status: 400,
      code: "insufficient_stock",
    });
  }

  const status = computeProductStatus(nextStock, product.minimumStockLevel);

  await tx.product.update({
    where: { id: product.id },
    data: {
      currentStock: nextStock,
      status,
    },
  });

  if (productCache) {
    productCache.set(product.id, {
      ...product,
      currentStock: nextStock,
      status,
    });
  }

  const movement = await tx.stockMovement.create({
    data: {
      date: input.date,
      productId: product.id,
      productName: product.name,
      movement: input.movement,
      quantity: input.quantity,
      reason: input.reason.trim(),
      branchId: input.branchId,
      notes: input.notes?.trim() || null,
      createdBy: toJsonField(input.createdBy),
    },
  });

  return movement.id;
}

export async function applyPurchaseStockIn(
  tx: Prisma.TransactionClient,
  input: {
    productId: string;
    quantity: number;
    buyingPrice: number;
    branchId: string;
    date: string;
    invoiceNumber: string;
    createdBy?: StaffActionRecord;
  },
  productCache?: ProductCache
): Promise<void> {
  let product = productCache?.get(input.productId);

  if (!product) {
    const loaded = await tx.product.findUnique({
      where: { id: input.productId },
    });

    if (!loaded) {
      throw new ApiError("Product not found.", {
        status: 404,
        code: "not_found",
      });
    }

    product = loaded;
  }

  const nextStock = product.currentStock + input.quantity;
  const newBuyingPrice = computeWeightedAverageBuyingPrice(
    product.currentStock,
    product.buyingPrice,
    input.quantity,
    input.buyingPrice
  );
  const status = computeProductStatus(nextStock, product.minimumStockLevel);

  await tx.product.update({
    where: { id: product.id },
    data: {
      currentStock: nextStock,
      buyingPrice: newBuyingPrice,
      status,
    },
  });

  if (productCache) {
    productCache.set(product.id, {
      ...product,
      currentStock: nextStock,
      buyingPrice: newBuyingPrice,
      status,
    });
  }

  if (product.buyingPrice !== newBuyingPrice) {
    await tx.stockPriceChange.create({
      data: {
        productId: product.id,
        previousBuyingPrice: product.buyingPrice,
        previousSellingPrice: product.sellingPrice,
        newBuyingPrice,
        newSellingPrice: product.sellingPrice,
      },
    });
  }

  await tx.stockMovement.create({
    data: {
      date: input.date,
      productId: product.id,
      productName: product.name,
      movement: "in",
      quantity: input.quantity,
      reason: "Purchase",
      branchId: input.branchId,
      notes: `Purchase ${input.invoiceNumber}`,
      createdBy: toJsonField(input.createdBy),
    },
  });
}
