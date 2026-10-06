import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { assertIsoBusinessDate } from "@/lib/business-day-wipe/constants";
import { isPayrollEntryExpense } from "@/lib/expenses";
import {
  assertSessionCanAccessBranchCode,
  getBranchIdByCode,
} from "@/lib/server/branch-lookup";
import { requireOwner } from "@/lib/server/security/authorization";
import { requireSession } from "@/lib/server/session";
import { isStaffPaymentCategory } from "@/lib/expenses-module/constants";
import type { Branch } from "@/types";
import type {
  FinancialDetailLine,
  FinancialDetailResponse,
} from "@/types/financial-correction";
import { listFinancialCorrections } from "@/lib/server/services/financial-corrections-service";

export async function getFinancialDetail(input: {
  branch?: string | null;
  date?: string | null;
}): Promise<FinancialDetailResponse> {
  const session = await requireSession();
  requireOwner(session);
  const date = assertIsoBusinessDate(String(input.date ?? ""));
  const branchCode = String(input.branch ?? "").trim().toLowerCase();
  if (!branchCode) {
    throw new ApiError("Branch is required.", {
      status: 400,
      code: "validation_error",
    });
  }
  assertSessionCanAccessBranchCode(session, branchCode);

  const branchId = await getBranchIdByCode(branchCode);
  const branch = await prisma.branch.findUniqueOrThrow({
    where: { id: branchId },
    select: { code: true, name: true },
  });

  const [operation, expenses, sales, corrections] = await Promise.all([
    prisma.dailyOperation.findUnique({
      where: { branchId_date: { branchId, date } },
      include: { expenses: true, staff: true },
    }),
    prisma.expenseRecord.findMany({
      where: { branchId, date },
      include: { branch: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sale.findMany({
      where: { branchId, date, status: "completed" },
      include: { items: true, staff: true },
      orderBy: { createdAt: "asc" },
    }),
    listFinancialCorrections({
      branch: branch.code,
      date,
    }),
  ]);

  const limitations: string[] = [];
  const incomeLines: FinancialDetailLine[] = [];

  if (operation && operation.sales > 0) {
    incomeLines.push({
      id: `movie-${operation.id}`,
      sourceType: "movie_revenue",
      serviceOrCategory: "Movie Revenue",
      description: "Movie Revenue",
      amount: operation.sales,
      timestamp: operation.createdAt.toISOString(),
      staffName: operation.staffName || operation.staff?.name || null,
      branch: branch.code as Branch,
      branchName: branch.name,
      businessDate: date,
      status: operation.status,
    });
  }

  for (const sale of sales) {
    for (const item of sale.items) {
      incomeLines.push({
        id: `sale-item-${item.id}`,
        sourceType: "sale",
        serviceOrCategory: item.productName,
        description: item.productName,
        amount: item.lineTotal,
        timestamp: sale.createdAt.toISOString(),
        staffName: sale.staffName || sale.staff?.name || null,
        branch: branch.code as Branch,
        branchName: branch.name,
        businessDate: date,
        category: "Accessories",
        status: sale.status,
      });
    }
  }

  if (sales.some((sale) => sale.items.length === 0)) {
    limitations.push(
      "Some accessory sales have no line items, so a service/source name is unavailable for those records."
    );
  }

  const expenditureLines: FinancialDetailLine[] = [];
  const expenseRecordKeys = new Set<string>();

  for (const expense of expenses) {
    if (expense.staffPaymentId || isStaffPaymentCategory(expense.categoryId)) {
      continue;
    }
    expenseRecordKeys.add(
      `${expense.description.trim().toLowerCase()}|${expense.amount}`
    );
    expenditureLines.push({
      id: expense.id,
      sourceType: "expense_record",
      serviceOrCategory: expense.categoryName,
      description: expense.description,
      amount: expense.amount,
      timestamp: expense.createdAt.toISOString(),
      staffName: expense.staffName,
      branch: branch.code as Branch,
      branchName: branch.name,
      businessDate: date,
      category: expense.categoryName,
      status: "recorded",
    });
  }

  if (operation) {
    for (const line of operation.expenses) {
      if (line.amount <= 0) continue;
      const key = `${line.name.trim().toLowerCase()}|${line.amount}`;
      if (expenseRecordKeys.has(key)) continue;
      if (isPayrollEntryExpense({ id: line.id, name: line.name, amount: line.amount })) {
        continue;
      }
      expenditureLines.push({
        id: line.id,
        sourceType: "daily_operation_expense",
        serviceOrCategory: line.name,
        description: line.name,
        amount: line.amount,
        timestamp: operation.createdAt.toISOString(),
        staffName: operation.staffName || operation.staff?.name || null,
        branch: branch.code as Branch,
        branchName: branch.name,
        businessDate: date,
        category: line.name,
        status: operation.status,
      });
    }
  }

  const movieRevenue = incomeLines
    .filter((line) => line.sourceType === "movie_revenue")
    .reduce((sum, line) => sum + line.amount, 0);
  const accessoryRevenue = incomeLines
    .filter((line) => line.sourceType === "sale")
    .reduce((sum, line) => sum + line.amount, 0);
  const totalExpenditure = expenditureLines.reduce((sum, line) => sum + line.amount, 0);

  const incomeBySourceMap = new Map<string, FinancialDetailLine[]>();
  for (const line of incomeLines) {
    const source = line.serviceOrCategory;
    const rows = incomeBySourceMap.get(source) ?? [];
    rows.push(line);
    incomeBySourceMap.set(source, rows);
  }

  const expenditureByCategoryMap = new Map<string, FinancialDetailLine[]>();
  for (const line of expenditureLines) {
    const category = line.category || line.serviceOrCategory;
    const rows = expenditureByCategoryMap.get(category) ?? [];
    rows.push(line);
    expenditureByCategoryMap.set(category, rows);
  }

  const staffMap = new Map<string, FinancialDetailLine[]>();
  for (const line of expenditureLines) {
    const staffName = line.staffName?.trim() || "Unassigned";
    const rows = staffMap.get(staffName) ?? [];
    rows.push(line);
    staffMap.set(staffName, rows);
  }

  limitations.push(
    "Movie revenue is stored as a DailyOperation sales total, not as individually priced movie tickets."
  );
  limitations.push(
    "There is no separate service catalog for items such as Windows Installation or Typing. Accessory income uses product names from sales line items."
  );

  return {
    branch: branch.code as Branch,
    branchName: branch.name,
    date,
    totals: {
      movieRevenue,
      accessoryRevenue,
      totalRevenue: movieRevenue + accessoryRevenue,
      totalExpenditure,
      net: movieRevenue + accessoryRevenue - totalExpenditure,
    },
    incomeBySource: [...incomeBySourceMap.entries()].map(([source, lines]) => ({
      source,
      amount: lines.reduce((sum, line) => sum + line.amount, 0),
      lines,
    })),
    expenditureByCategory: [...expenditureByCategoryMap.entries()].map(
      ([category, lines]) => ({
        category,
        amount: lines.reduce((sum, line) => sum + line.amount, 0),
        lines,
      })
    ),
    expenditureByStaff: [...staffMap.entries()].map(([staffName, lines]) => ({
      staffName,
      lines,
      total: lines.reduce((sum, line) => sum + line.amount, 0),
    })),
    corrections,
    limitations,
  };
}
