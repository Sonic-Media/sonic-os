import { randomUUID } from "crypto";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { getBranchIdByCode } from "@/lib/server/branch-lookup";
import { toJsonField } from "@/lib/server/json-fields";
import { mapDailyOperationToEntry } from "@/lib/server/mappers/entities";
import { getPeriodDateBounds } from "@/lib/dates";
import type { Entry, Expense, ReportPeriod } from "@/types";

const dailyOperationInclude = {
  branch: true,
  expenses: true,
} as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function expenseIdForDb(expense: Expense): string {
  return isValidUuid(expense.id) ? expense.id : randomUUID();
}

function normalizeStaffIdForDb(staffId: string | undefined | null): string | null {
  if (typeof staffId !== "string") return null;
  const trimmed = staffId.trim();
  if (!trimmed || !isValidUuid(trimmed)) return null;
  return trimmed;
}

function entryToDailyOperationData(entry: Entry, branchId: string) {
  return {
    date: entry.date,
    time: entry.time,
    timestamp: BigInt(entry.timestamp),
    branchId,
    sales: entry.sales,
    staffId: normalizeStaffIdForDb(entry.staffId),
    staffName: entry.staffName ?? "",
    createdBy: toJsonField(entry.createdBy),
    notes: entry.notes,
    savingsAllocation: entry.savingsAllocation ?? null,
    status: entry.status,
  };
}

export async function listDailyOperations(): Promise<Entry[]> {
  const operations = await prisma.dailyOperation.findMany({
    include: dailyOperationInclude,
    orderBy: [{ date: "desc" }, { timestamp: "desc" }],
  });

  return operations.map(mapDailyOperationToEntry);
}

export async function listDailyOperationsInPeriod(
  period: ReportPeriod,
  ref = new Date()
): Promise<Entry[]> {
  const { start, end } = getPeriodDateBounds(period, ref);

  const operations = await prisma.dailyOperation.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
    include: dailyOperationInclude,
    orderBy: [{ date: "desc" }, { timestamp: "desc" }],
  });

  return operations.map(mapDailyOperationToEntry);
}

export async function upsertDailyOperation(entry: Entry): Promise<Entry> {
  const branchId = await getBranchIdByCode(entry.branch);
  const data = entryToDailyOperationData(entry, branchId);
  const expenseRows = entry.expenses.map((expense) => ({
    id: expenseIdForDb(expense),
    name: expense.name,
    amount: expense.amount,
  }));
  let persistedId = entry.id;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.dailyOperation.findUnique({
      where: { id: entry.id },
    });

    if (existing) {
      await tx.dailyOperationExpense.deleteMany({
        where: { dailyOperationId: entry.id },
      });

      await tx.dailyOperation.update({
        where: { id: entry.id },
        data: {
          ...data,
          expenses: {
            create: expenseRows,
          },
        },
      });
      return;
    }

    const existingByDate = await tx.dailyOperation.findUnique({
      where: {
        branchId_date: {
          branchId,
          date: entry.date,
        },
      },
    });

    if (existingByDate) {
      persistedId = existingByDate.id;
      await tx.dailyOperationExpense.deleteMany({
        where: { dailyOperationId: existingByDate.id },
      });
      await tx.dailyOperation.update({
        where: { id: existingByDate.id },
        data: {
          ...data,
          expenses: {
            create: expenseRows,
          },
        },
      });
      return;
    }

    await tx.dailyOperation.create({
      data: {
        id: entry.id,
        ...data,
        expenses: {
          create: expenseRows,
        },
      },
    });
  });

  const operation = await prisma.dailyOperation.findUniqueOrThrow({
    where: { id: persistedId },
    include: dailyOperationInclude,
  });

  return mapDailyOperationToEntry(operation);
}

export async function deleteDailyOperation(id: string): Promise<void> {
  const existing = await prisma.dailyOperation.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError("Daily operation not found.", {
      status: 404,
      code: "not_found",
    });
  }

  await prisma.dailyOperation.delete({ where: { id } });
}

export async function importDailyOperations(
  entries: Entry[]
): Promise<Entry[]> {
  if (entries.length === 0) return [];

  const branchIds = new Map<string, string>();
  for (const entry of entries) {
    if (!branchIds.has(entry.branch)) {
      branchIds.set(entry.branch, await getBranchIdByCode(entry.branch));
    }
  }

  const importedIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const entry of entries) {
      const branchId = branchIds.get(entry.branch)!;

      const existingByDate = await tx.dailyOperation.findUnique({
        where: {
          branchId_date: {
            branchId,
            date: entry.date,
          },
        },
      });

      if (existingByDate) {
        throw new ApiError(
          `Daily operation already exists for ${entry.branch} on ${entry.date}.`,
          {
            status: 409,
            code: "duplicate_daily_operation",
          }
        );
      }

      const data = entryToDailyOperationData(entry, branchId);
      const expenseRows = entry.expenses.map((expense) => ({
        id: expenseIdForDb(expense),
        name: expense.name,
        amount: expense.amount,
      }));

      await tx.dailyOperation.create({
        data: {
          id: entry.id,
          ...data,
          expenses: {
            create: expenseRows,
          },
        },
      });

      importedIds.push(entry.id);
    }
  });

  const operations = await prisma.dailyOperation.findMany({
    where: { id: { in: importedIds } },
    include: dailyOperationInclude,
  });

  const byId = new Map(operations.map((operation) => [operation.id, operation]));
  return entries.map((entry) =>
    mapDailyOperationToEntry(byId.get(entry.id)!)
  );
}

export async function removeDailyOperationsByIds(
  ids: string[]
): Promise<number> {
  if (ids.length === 0) return 0;

  const result = await prisma.dailyOperation.deleteMany({
    where: { id: { in: ids } },
  });

  return result.count;
}

export async function getDailyOperationById(id: string): Promise<Entry | null> {
  const operation = await prisma.dailyOperation.findUnique({
    where: { id },
    include: dailyOperationInclude,
  });

  return operation ? mapDailyOperationToEntry(operation) : null;
}

export async function listDailyOperationsByBranchDate(
  branchCode: string,
  date: string
): Promise<Entry[]> {
  const branchId = await getBranchIdByCode(branchCode);

  const operations = await prisma.dailyOperation.findMany({
    where: { branchId, date },
    include: dailyOperationInclude,
    orderBy: { timestamp: "desc" },
  });

  return operations.map(mapDailyOperationToEntry);
}
