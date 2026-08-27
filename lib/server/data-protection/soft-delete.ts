import { Prisma } from "@/lib/generated/prisma/client";

/** Models that support soft delete via deletedAt. */
export const SOFT_DELETE_MODELS = [
  "Product",
  "Sale",
  "ExpenseRecord",
  "StockMovement",
  "Staff",
] as const;

export type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

const SOFT_DELETE_MODEL_SET = new Set<string>(SOFT_DELETE_MODELS);

export function isSoftDeleteModel(model: string): model is SoftDeleteModel {
  return SOFT_DELETE_MODEL_SET.has(model);
}

export const NOT_DELETED = { deletedAt: null } as const;

type WhereArgs = { where?: Record<string, unknown> };

function mergeNotDeleted<T extends WhereArgs>(args: T): T {
  if (!args.where) {
    return { ...args, where: { ...NOT_DELETED } };
  }

  if (Object.prototype.hasOwnProperty.call(args.where, "deletedAt")) {
    return args;
  }

  return {
    ...args,
    where: {
      ...args.where,
      ...NOT_DELETED,
    },
  };
}

export function softDeleteExtension() {
  return Prisma.defineExtension({
    name: "softDelete",
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (isSoftDeleteModel(model)) {
            return query(mergeNotDeleted(args));
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (isSoftDeleteModel(model)) {
            return query(mergeNotDeleted(args));
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (!isSoftDeleteModel(model)) {
            return query(args);
          }

          const result = await query(args);
          if (
            result &&
            typeof result === "object" &&
            "deletedAt" in result &&
            result.deletedAt
          ) {
            return null;
          }

          return result;
        },
        async count({ model, args, query }) {
          if (isSoftDeleteModel(model)) {
            return query(mergeNotDeleted(args));
          }
          return query(args);
        },
      },
    },
  });
}

export async function softDeleteRecord(
  model: SoftDeleteModel,
  id: string,
  prismaClient: {
    product: { update: (args: unknown) => Promise<unknown> };
    sale: { update: (args: unknown) => Promise<unknown> };
    expenseRecord: { update: (args: unknown) => Promise<unknown> };
    stockMovement: { update: (args: unknown) => Promise<unknown> };
    staff: { update: (args: unknown) => Promise<unknown> };
  }
): Promise<void> {
  const deletedAt = new Date();
  const where = { id };
  const data = { deletedAt };

  switch (model) {
    case "Product":
      await prismaClient.product.update({ where, data });
      return;
    case "Sale":
      await prismaClient.sale.update({ where, data });
      return;
    case "ExpenseRecord":
      await prismaClient.expenseRecord.update({ where, data });
      return;
    case "StockMovement":
      await prismaClient.stockMovement.update({ where, data });
      return;
    case "Staff":
      await prismaClient.staff.update({ where, data });
      return;
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unsupported soft delete model: ${String(_exhaustive)}`);
    }
  }
}

export async function softDeleteManyByProductId(
  productId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  const deletedAt = new Date();

  await tx.stockMovement.updateMany({
    where: { productId, deletedAt: null },
    data: { deletedAt },
  });
  await tx.stockPriceChange.deleteMany({ where: { productId } });
  await tx.product.update({
    where: { id: productId },
    data: { deletedAt },
  });
}
