import { ApiError } from "@/lib/api/errors";
import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/db";

export async function computeBranchProductStock(
  tx: Prisma.TransactionClient,
  branchId: string,
  productId: string
): Promise<number> {
  const movements = await tx.stockMovement.findMany({
    where: { branchId, productId },
    select: { movement: true, quantity: true },
  });

  let total = 0;

  for (const movement of movements) {
    total +=
      movement.movement === "in"
        ? movement.quantity
        : -movement.quantity;
  }

  return total;
}

export async function getBranchProductStockByBranchId(
  branchId: string,
  productId: string
): Promise<number> {
  return computeBranchProductStock(prisma, branchId, productId);
}

export async function assertSufficientBranchStock(
  tx: Prisma.TransactionClient,
  branchId: string,
  productId: string,
  quantity: number
): Promise<void> {
  const branchStock = await computeBranchProductStock(tx, branchId, productId);

  if (quantity > branchStock) {
    throw new ApiError(
      `Insufficient stock at this branch (${branchStock.toLocaleString("en-UG")} available).`,
      {
        status: 400,
        code: "insufficient_stock",
      }
    );
  }
}
