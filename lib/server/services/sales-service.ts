import { ApiError } from "@/lib/api/errors";
import type { BranchIdFilter } from "@/lib/server/branch-scope";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/prisma";
import { getBranchIdForSession } from "@/lib/server/branch-lookup";
import { mapSaleToEntity } from "@/lib/server/mappers/entities";
import { getSessionFromRequest, requireSession } from "@/lib/server/session";
import { applyStockMovement, type ProductCache } from "@/lib/server/stock-transactions";
import { recordTransactionAudit } from "@/lib/server/transaction-audit";
import {
  assertBranchDayOpenForWrite,
  assertStaffOperationalRole,
} from "@/lib/server/day-closing-guards";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import type { AuthSession } from "@/types/auth";
import type { BranchSaleProduct, Sale } from "@/types/sales";
import type { StaffActionRecord } from "@/types/staff-session";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

async function resolveSaleStaffId(
  tx: Prisma.TransactionClient,
  sale: Sale,
  session: AuthSession | null
): Promise<string | null> {
  const candidateIds = [
    sale.staffId,
    sale.createdBy?.staffId,
    sale.completedBy?.staffId,
  ].filter((id): id is string => typeof id === "string" && id.trim().length > 0);

  for (const id of candidateIds) {
    if (!isValidUuid(id)) continue;

    const staff = await tx.staff.findUnique({
      where: { id },
      select: { id: true },
    });
    if (staff) return staff.id;
  }

  if (session) {
    const user = await tx.user.findUnique({
      where: { id: session.userId },
      select: { staffId: true },
    });
    if (user?.staffId && isValidUuid(user.staffId)) {
      return user.staffId;
    }
  }

  return null;
}

const saleInclude = {
  branch: true,
  items: true,
} as const;

async function generateSaleInvoiceNumber(
  tx: Prisma.TransactionClient,
  dateISO: string
): Promise<string> {
  const datePart = dateISO.replace(/-/g, "");
  const todayCount = await tx.sale.count({
    where: { date: dateISO },
  });
  return `INV-${datePart}-${String(todayCount + 1).padStart(4, "0")}`;
}

function validateSaleTotals(sale: Sale): void {
  if (sale.items.length === 0) {
    throw new ApiError("At least one sale item is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  let costTotal = 0;

  for (const item of sale.items) {
    if (item.quantity <= 0) {
      throw new ApiError("Sale quantity must be greater than zero.", {
        status: 400,
        code: "validation_error",
      });
    }

    const expectedLineTotal = item.quantity * item.unitPrice;
    if (item.lineTotal !== expectedLineTotal) {
      throw new ApiError("Sale line totals do not match quantity and price.", {
        status: 400,
        code: "validation_error",
      });
    }

    costTotal += item.quantity * item.buyingPrice;
  }

  const subtotal = sale.items.reduce((sum, item) => sum + item.lineTotal, 0);
  if (sale.subtotal !== subtotal) {
    throw new ApiError("Sale subtotal does not match line items.", {
      status: 400,
      code: "validation_error",
    });
  }

  if (!Number.isFinite(sale.discount) || sale.discount < 0) {
    throw new ApiError("Sale discount cannot be negative.", {
      status: 400,
      code: "validation_error",
    });
  }

  if (sale.discount > subtotal) {
    throw new ApiError("Sale discount cannot exceed subtotal.", {
      status: 400,
      code: "validation_error",
    });
  }

  const expectedTotal = Math.max(0, subtotal - sale.discount);
  const expectedProfit = expectedTotal - costTotal;

  if (sale.total !== expectedTotal) {
    throw new ApiError("Sale total does not match subtotal and discount.", {
      status: 400,
      code: "validation_error",
    });
  }

  if (sale.profit !== expectedProfit) {
    throw new ApiError("Sale profit does not match totals and cost.", {
      status: 400,
      code: "validation_error",
    });
  }
}

function sortSales(sales: Sale[]): Sale[] {
  return [...sales].sort((left, right) => {
    const dateCompare = right.date.localeCompare(left.date);
    if (dateCompare !== 0) return dateCompare;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export async function listSales(
  branchFilter?: BranchIdFilter
): Promise<Sale[]> {
  const sales = await prisma.sale.findMany({
    where: branchFilter ? { branchId: branchFilter.branchId } : undefined,
    include: saleInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return sales.map((sale) => mapSaleToEntity(sale));
}

export async function createSale(sale: Sale): Promise<Sale> {
  return completeSale(sale);
}

export async function completeSale(sale: Sale): Promise<Sale> {
  if (!sale.items.length) {
    throw new ApiError("At least one sale item is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  validateSaleTotals(sale);

  if (!sale.paymentMethod?.trim()) {
    throw new ApiError("Payment method is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  const session = await requireSession();
  assertStaffOperationalRole(session);
  await assertBranchDayOpenForWrite(sale.branch, sale.date);
  const branchId = await getBranchIdForSession(
    session,
    sale.branch?.trim() || null
  );
  const createdBy = sale.createdBy as StaffActionRecord | undefined;

  const created = await prisma.$transaction(async (tx) => {
    const invoiceNumber = await generateSaleInvoiceNumber(tx, sale.date);

    const productIds = [...new Set(sale.items.map((item) => item.productId))];
    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        branchId,
        deletedAt: null,
      },
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
          notes: `Sale ${invoiceNumber}`,
          createdBy,
        },
        productCache
      );
    }

    const staffId = await resolveSaleStaffId(tx, sale, session);
    let staffName = sale.staffName || sale.createdBy?.staffName || null;

    if (staffId && !staffName) {
      const staffMember = await tx.staff.findUnique({
        where: { id: staffId },
        select: { name: true },
      });
      staffName = staffMember?.name ?? null;
    }

    const saved = await tx.sale.create({
      data: {
        id: sale.id,
        invoiceNumber,
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
        staffId,
        staffName,
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
        `${invoiceNumber} recorded ${sale.total} total (${sale.profit} profit) at ${sale.branch}.`
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

export async function listBranchProductsForSale(
  branchCodeOverride?: string | null
): Promise<BranchSaleProduct[]> {
  const session = await requireSession();
  const branchId = await getBranchIdForSession(
    session,
    branchCodeOverride?.trim() || session.branch
  );

  const products = await prisma.product.findMany({
    where: {
      branchId,
      deletedAt: null,
      currentStock: { gt: 0 },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      buyingPrice: true,
      sellingPrice: true,
      currentStock: true,
    },
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    buyingPrice: product.buyingPrice,
    sellingPrice: product.sellingPrice,
    branchStock: product.currentStock,
  }));
}

export function sortSaleEntities(sales: Sale[]): Sale[] {
  return sortSales(sales);
}
