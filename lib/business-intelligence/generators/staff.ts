import {
  filterSalesByDate,
  findTopStaffBySales,
  formatMoney,
  matchesBranch,
  pushUniqueInsight,
} from "@/lib/business-intelligence/helpers";
import type { BIAnalysisContext } from "@/lib/business-intelligence/context";
import type { BIInsight } from "@/lib/business-intelligence/types";

export function generateStaffInsights(context: BIAnalysisContext): BIInsight[] {
  const insights: BIInsight[] = [];
  const seen = new Set<string>();
  const { today, sales, payments, staff, branches } = context;

  const topStaff = findTopStaffBySales(sales, today);
  if (topStaff && topStaff.total > 0) {
    pushUniqueInsight(
      insights,
      {
        id: "staff-top-performer",
        text: `${topStaff.name} has generated ${formatMoney(topStaff.total)} in accessory sales today.`,
        severity: "positive",
        tier: "achievement",
        category: "staff",
        priority: 55,
      },
      seen
    );
  }

  const activeStaff = staff.filter((member) => member.active);
  const branchesWithOpenDay = branches.filter((branch) => {
    const closing = context.closings.find(
      (record) =>
        record.date === today &&
        matchesBranch(record.branch, branch.code) &&
        record.status === "open"
    );
    return Boolean(closing);
  });

  for (const branch of branchesWithOpenDay) {
    const branchPayments = payments.filter(
      (payment) => payment.date === today && matchesBranch(payment.branch, branch.code)
    );
    const branchStaff = activeStaff.filter((member) =>
      matchesBranch(member.branch, branch.code)
    );

    if (branchStaff.length > 0 && branchPayments.length === 0) {
      pushUniqueInsight(
        insights,
        {
          id: `staff-wage-pending-${branch.code}`,
          text: `Daily wages have not been recorded at ${branch.name} today.`,
          severity: "warning",
          tier: "critical",
          category: "staff",
          priority: 75,
        },
        seen
      );
    }
  }

  const todaySales = filterSalesByDate(sales, today);
  const staffWithSales = new Set(
    todaySales.map((sale) => sale.staffId ?? sale.staffName?.toLowerCase()).filter(Boolean)
  );

  const idleStaffOnShift = activeStaff.filter(
    (member) =>
      branchesWithOpenDay.some((branch) => matchesBranch(member.branch, branch.code)) &&
      !staffWithSales.has(member.id) &&
      !staffWithSales.has(member.name.toLowerCase())
  );

  if (idleStaffOnShift.length > 0 && todaySales.length >= 3) {
    pushUniqueInsight(
      insights,
      {
        id: "staff-no-sales-yet",
        text: `${idleStaffOnShift[0]?.name ?? "A staff member"} has not recorded any sales today despite the branch being open.`,
        severity: "info",
        tier: "info",
        category: "staff",
        priority: 25,
      },
      seen
    );
  }

  return insights;
}
