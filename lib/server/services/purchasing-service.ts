import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/prisma";
import { getTodayISO } from "@/lib/dates";
import { getBranchIdByCode } from "@/lib/server/branch-lookup";
import { toJsonField } from "@/lib/server/json-fields";
import {
  mapPurchaseToEntity,
  mapSupplierToEntity,
} from "@/lib/server/mappers/entities";
import {
  computeLineSubtotal,
  mergePurchaseLineItems,
} from "@/lib/purchasing/calculations";
import { applyPurchaseStockIn, type ProductCache } from "@/lib/server/stock-transactions";
import { getSessionFromRequest } from "@/lib/server/session";
import { recordTransactionAudit } from "@/lib/server/transaction-audit";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import type {
  Purchase,
  PurchaseInput,
  Supplier,
  SupplierInput,
  SupplierUpdateInput,
} from "@/types/purchasing";
import type { StaffActionRecord } from "@/types/staff-session";

const purchaseInclude = {
  branch: true,
  items: true,
} as const;

async function generatePurchaseInvoiceNumber(
  tx: Prisma.TransactionClient,
  dateISO: string
): Promise<string> {
  const datePart = dateISO.replace(/-/g, "");
  const todayCount = await tx.purchase.count({
    where: { date: dateISO },
  });
  return `PUR-${datePart}-${String(todayCount + 1).padStart(4, "0")}`;
}

export async function listSuppliers(): Promise<Supplier[]> {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
  });

  return suppliers.map(mapSupplierToEntity);
}

export async function createSupplier(input: SupplierInput): Promise<Supplier> {
  const name = input.name.trim();
  if (!name) {
    throw new ApiError("Supplier name is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  const supplier = await prisma.supplier.create({
    data: {
      name,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });

  return mapSupplierToEntity(supplier);
}

export async function updateSupplier(
  id: string,
  input: SupplierUpdateInput
): Promise<Supplier> {
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError("Supplier not found.", {
      status: 404,
      code: "not_found",
    });
  }

  const name = input.name.trim();
  if (!name) {
    throw new ApiError("Supplier name is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  const supplier = await prisma.$transaction(async (tx) => {
    if (existing.name !== name) {
      await tx.purchase.updateMany({
        where: { supplierId: id },
        data: { supplierName: name },
      });
    }

    return tx.supplier.update({
      where: { id },
      data: {
        name,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });
  });

  return mapSupplierToEntity(supplier);
}

export async function deleteSupplier(id: string): Promise<void> {
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError("Supplier not found.", {
      status: 404,
      code: "not_found",
    });
  }

  const inUse = await prisma.purchase.count({ where: { supplierId: id } });
  if (inUse > 0) {
    throw new ApiError(
      "Cannot delete a supplier that has purchase records.",
      {
        status: 409,
        code: "supplier_in_use",
      }
    );
  }

  await prisma.supplier.delete({ where: { id } });
}

export async function listPurchases(): Promise<Purchase[]> {
  const purchases = await prisma.purchase.findMany({
    include: purchaseInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return purchases.map(mapPurchaseToEntity);
}

export async function createPurchase(
  input: PurchaseInput,
  createdBy?: StaffActionRecord
): Promise<Purchase> {
  const supplier = await prisma.supplier.findUnique({
    where: { id: input.supplierId },
  });

  if (!supplier) {
    throw new ApiError("Supplier not found.", {
      status: 404,
      code: "not_found",
    });
  }

  const mergedItems = mergePurchaseLineItems(input.items);
  if (mergedItems.length === 0) {
    throw new ApiError("At least one purchase line item is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  const dateISO = input.date ?? getTodayISO();
  const branchId = await getBranchIdByCode(input.branch);

  const productIds = mergedItems.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  for (const item of mergedItems) {
    if (!productById.has(item.productId)) {
      throw new ApiError("One or more products were not found.", {
        status: 404,
        code: "not_found",
      });
    }
    if (item.quantity <= 0) {
      throw new ApiError("Purchase quantity must be greater than zero.", {
        status: 400,
        code: "validation_error",
      });
    }
  }

  const resolvedItems = mergedItems.map((item) => {
    const product = productById.get(item.productId)!;
    return {
      item,
      product,
      lineTotal: computeLineSubtotal(item.quantity, item.buyingPrice),
    };
  });

  const totalCost = resolvedItems.reduce(
    (sum, entry) => sum + entry.lineTotal,
    0
  );

  let purchaseId: string;
  const session = await getSessionFromRequest();

  await prisma.$transaction(async (tx) => {
    const invoiceNumber = await generatePurchaseInvoiceNumber(tx, dateISO);
    const productCache: ProductCache = new Map(
      [...productById.values()].map((product) => [product.id, product])
    );

    for (const { item, product } of resolvedItems) {
      await applyPurchaseStockIn(
        tx,
        {
          productId: product.id,
          quantity: item.quantity,
          buyingPrice: item.buyingPrice,
          branchId,
          date: dateISO,
          invoiceNumber,
          createdBy,
        },
        productCache
      );
    }

    const purchase = await tx.purchase.create({
      data: {
        invoiceNumber,
        date: dateISO,
        supplierId: supplier.id,
        supplierName: supplier.name,
        totalCost,
        branchId,
        staffId: createdBy?.staffId ?? null,
        staffName: createdBy?.staffName ?? null,
        createdBy: toJsonField(createdBy),
        notes: input.notes?.trim() || null,
        items: {
          create: resolvedItems.map(({ item, product, lineTotal }) => ({
            productId: product.id,
            productName: product.name,
            quantity: item.quantity,
            buyingPrice: item.buyingPrice,
            lineTotal,
          })),
        },
      },
    });

    if (session) {
      await recordTransactionAudit(
        tx,
        session,
        AUDIT_ACTIONS.COMPLETE_PURCHASE,
        `${invoiceNumber} from ${supplier.name} recorded ${totalCost} total cost.`
      );
    }

    purchaseId = purchase.id;
  });

  const purchase = await prisma.purchase.findUniqueOrThrow({
    where: { id: purchaseId! },
    include: purchaseInclude,
  });

  return mapPurchaseToEntity(purchase);
}
