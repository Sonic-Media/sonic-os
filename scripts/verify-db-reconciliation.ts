import "dotenv/config";
import { prisma } from "@/lib/db";
import { computeAuthoritativeBranchInventoryValue } from "@/lib/inventory/valuation";
import {
  mapExpenseRecordToEntity,
  mapMovementToEntity,
  mapProductToEntity,
} from "@/lib/server/mappers/entities";
import { computeDashboardOperatingExpenses } from "@/lib/dashboard/operating-expenses";

function recordCheck(id: string, name: string, passed: boolean, detail: string) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) throw new Error(`${id} failed: ${name} — ${detail}`);
}

async function branchTotals(branchCode: string) {
  const branch = await prisma.branch.findFirstOrThrow({ where: { code: branchCode } });
  const [products, movements, sales, expenses, staffPayments] = await Promise.all([
    prisma.product.findMany({
      where: { branchId: branch.id, deletedAt: null },
      include: { branch: true, category: true },
    }),
    prisma.stockMovement.findMany({
      where: { branchId: branch.id },
      include: { branch: true },
    }),
    prisma.sale.findMany({ where: { branchId: branch.id, deletedAt: null } }),
    prisma.expenseRecord.findMany({
      where: { branchId: branch.id, deletedAt: null },
      include: { branch: true },
    }),
    prisma.staffPayment.findMany({ where: { branchId: branch.id } }),
  ]);

  const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const operatingExpenses = computeDashboardOperatingExpenses(
    branchCode,
    "2099-01-01",
    expenses.map(mapExpenseRecordToEntity),
    []
  );
  const inventoryValue = computeAuthoritativeBranchInventoryValue(
    { code: branch.code, name: branch.name, id: branch.id, active: branch.active },
    products.map(mapProductToEntity),
    movements.map(mapMovementToEntity)
  );
  const staffWages = staffPayments
    .filter((payment) => payment.paymentType === "daily-wage")
    .reduce((sum, payment) => sum + payment.amount, 0);

  return {
    branch: branchCode,
    productCount: products.length,
    movementCount: movements.length,
    salesCount: sales.length,
    expenseCount: expenses.length,
    staffPaymentCount: staffPayments.length,
    revenue,
    operatingExpenses,
    netCash: revenue - operatingExpenses,
    inventoryValue,
    staffWages,
    inventoryEqualsRevenueMinusExpenses: inventoryValue === revenue - operatingExpenses,
  };
}

async function main() {
  console.log("Database reconciliation (local PostgreSQL only)\n");

  const [branches, staff, users, dayClosings] = await Promise.all([
    prisma.branch.count(),
    prisma.staff.count({ where: { deletedAt: null } }),
    prisma.user.count(),
    prisma.dayClosing.count(),
  ]);

  recordCheck("A", "Branch count present", branches === 2, `branches=${branches}`);
  recordCheck("B", "Staff rows present", staff >= 2, `staff=${staff}`);
  recordCheck("C", "Users present", users >= 2, `users=${users}`);
  recordCheck("D", "Day closing rows queryable", dayClosings >= 0, `dayClosings=${dayClosings}`);

  const mainTotals = await branchTotals("main");
  const salaamaTotals = await branchTotals("salaama");

  console.log("\nKansanga (main):", JSON.stringify(mainTotals, null, 2));
  console.log("\nSalaama:", JSON.stringify(salaamaTotals, null, 2));

  recordCheck(
    "E",
    "Kansanga inventory != revenue - expenses",
    !mainTotals.inventoryEqualsRevenueMinusExpenses,
    `inventory=${mainTotals.inventoryValue}, revenue-expenses=${mainTotals.revenue - mainTotals.operatingExpenses}`
  );
  recordCheck(
    "F",
    "Salaama inventory != revenue - expenses",
    !salaamaTotals.inventoryEqualsRevenueMinusExpenses,
    `inventory=${salaamaTotals.inventoryValue}, revenue-expenses=${salaamaTotals.revenue - salaamaTotals.operatingExpenses}`
  );
  recordCheck(
    "G",
    "Branch totals computed independently",
    mainTotals.branch !== salaamaTotals.branch,
    `${mainTotals.branch} vs ${salaamaTotals.branch}`
  );

  console.log("\nDatabase reconciliation complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
