import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/prisma";
import { getBranchIdByCode } from "@/lib/server/branch-lookup";
import { mapSaleToEntity } from "@/lib/server/mappers/entities";
import { getSessionFromRequest } from "@/lib/server/session";
import { applyStockMovement, type ProductCache } from "@/lib/server/stock-transactions";
import { recordTransactionAudit } from "@/lib/server/transaction-audit";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import type { Sale } from "@/types/sales";
import type { StaffActionRecord } from "@/types/staff-session";

const saleInclude = {
  branch: true,
  items: true,
} as const;

function sortSales(sales: Sale[]): Sale[] {
  return [...sales].sort((left, right) => {
    const dateCompare = right.date.localeCompare(left.date);
    if (dateCompare !== 0) return dateCompare;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export async function listSales(): Promise<Sale[]> {
  const sales = await prisma.sale.findMany({
    include: saleInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return sales.map((sale) => mapSaleToEntity(sale));
}

export async function createSale(sale: Sale): Promise<Sale> {
  return completeSale(sale);
}

export async function completeSale(sale: Sale): Promise<Sale> {
  if (!sale.invoiceNumber.trim()) {
    throw new ApiError("Invoice number is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  if (!sale.branch?.trim()) {
    throw new ApiError("Branch is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  if (!sale.items.length) {
    throw new ApiError("At least one sale item is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  for (const item of sale.items) {
    if (item.quantity <= 0) {
      throw new ApiError("Sale quantity must be greater than zero.", {
        status: 400,
        code: "validation_error",
      });
    }
  }

  const branchId = await getBranchIdByCode(sale.branch);
  const createdBy = sale.createdBy as StaffActionRecord | undefined;
  const session = await getSessionFromRequest();

  const created = await prisma.$transaction(async (tx) => {
    const existing = await tx.sale.findUnique({
      where: { invoiceNumber: sale.invoiceNumber },
    });

    if (existing) {
      throw new ApiError("A sale with this invoice number already exists.", {
        status: 409,
        code: "duplicate_invoice_number",
      });
    }

    const productIds = [...new Set(sale.items.map((item) => item.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
    });
    const productCache: ProductCache = new Map(
      products.map((product) => [product.id, product])
    );

    if (productCache.size !== productIds.length) {
      throw new ApiError("One or more sale products were not found.", {
        status: 404,
        code: "not_found",
      });
    }

    for (const item of sale.items) {
      await applyStockMovement(
        tx,
        {
          productId: item.productId,
          movement: "out",
          quantity: item.quantity,
          reason: "Sale",
          branchId,
          date: sale.date,
          notes: `Sale ${sale.invoiceNumber}`,
          createdBy,
        },
        productCache
      );
    }

    const saved = await tx.sale.create({
      data: {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        date: sale.date,
        time: sale.time,
        customerId: sale.customerId || null,
        customerName: sale.customerName || null,
        subtotal: sale.subtotal,
        discount: sale.discount,
        total: sale.total,
        profit: sale.profit,
        paymentMethod: sale.paymentMethod,
        branchId,
        staffId: sale.staffId || null,
        staffName: sale.staffName || null,
        createdBy: (sale.createdBy ?? null) as unknown as Prisma.InputJsonValue,
        completedBy: (sale.completedBy ??
          null) as unknown as Prisma.InputJsonValue,
        notes: sale.notes || null,
        status: sale.status,
        createdAt: sale.createdAt ? new Date(sale.createdAt) : undefined,
        items: {
          create: sale.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            buyingPrice: item.buyingPrice,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: saleInclude,
    });

    if (session) {
      await recordTransactionAudit(
        tx,
        session,
        AUDIT_ACTIONS.COMPLETE_SALE,
        `${sale.invoiceNumber} recorded ${sale.total} total (${sale.profit} profit) at ${sale.branch}.`
      );
    }

    return saved;
  });

  return mapSaleToEntity(created);
}

export async function updateSaleCustomerNames(
  customerId: string,
  customerName: string
): Promise<void> {
  const trimmedName = customerName.trim();
  if (!trimmedName) {
    throw new ApiError("Customer name is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  await prisma.sale.updateMany({
    where: { customerId },
    data: { customerName: trimmedName },
  });
}

export function sortSaleEntities(sales: Sale[]): Sale[] {
  return sortSales(sales);
}
