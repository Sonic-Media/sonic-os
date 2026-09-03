import {
  filterSalesByDate,
  formatMoney,
  hoursSince,
  matchesBranch,
  pushUniqueInsight,
} from "@/lib/business-intelligence/helpers";
import { resolveBranchName, type BIAnalysisContext } from "@/lib/business-intelligence/context";
import type { BIInsight } from "@/lib/business-intelligence/types";

export function generateSalesInsights(context: BIAnalysisContext): BIInsight[] {
  const insights: BIInsight[] = [];
  const seen = new Set<string>();
  const { today, sales, branches } = context;

  const todaySales = filterSalesByDate(sales, today);
  if (todaySales.length === 0) {
    return insights;
  }

  const itemCounts = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const sale of todaySales) {
    for (const item of sale.items) {
      const existing = itemCounts.get(item.productId) ?? {
        name: item.productName,
        qty: 0,
        revenue: 0,
      };
      existing.qty += item.quantity;
      existing.revenue += item.lineTotal;
      itemCounts.set(item.productId, existing);
    }
  }

  const topProduct = [...itemCounts.values()].sort((left, right) => right.qty - left.qty)[0];
  if (topProduct) {
    pushUniqueInsight(
      insights,
      {
        id: "sales-top-product",
        text: `Highest selling product today: ${topProduct.name} (${topProduct.qty} units, ${formatMoney(topProduct.revenue)}).`,
        severity: "positive",
        tier: "achievement",
        category: "sales",
        priority: 50,
      },
      seen
    );
  }

  const topCategory = [...itemCounts.values()].sort(
    (left, right) => right.revenue - left.revenue
  )[0];
  if (topCategory && topCategory.revenue > 0) {
    pushUniqueInsight(
      insights,
      {
        id: "sales-top-category",
        text: `${topCategory.name} leads accessory revenue today at ${formatMoney(topCategory.revenue)}.`,
        severity: "info",
        tier: "info",
        category: "sales",
        priority: 35,
      },
      seen
    );
  }

  const totalRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const averageValue = totalRevenue / todaySales.length;
  pushUniqueInsight(
    insights,
    {
      id: "sales-average-transaction",
      text: `Average transaction value today: ${formatMoney(Math.round(averageValue))} across ${todaySales.length} sale${todaySales.length === 1 ? "" : "s"}.`,
      severity: "info",
      tier: "info",
      category: "sales",
      priority: 30,
    },
    seen
  );

  const largest = [...todaySales].sort((left, right) => right.total - left.total)[0];
  if (largest && largest.total > averageValue * 2) {
    pushUniqueInsight(
      insights,
      {
        id: "sales-largest-transaction",
        text: `Largest transaction today: ${formatMoney(largest.total)}${largest.customerName ? ` from ${largest.customerName}` : ""}.`,
        severity: "positive",
        tier: "achievement",
        category: "sales",
        priority: 45,
      },
      seen
    );
  }

  const hourBuckets = new Map<number, number>();
  for (const sale of todaySales) {
    const hour = Number.parseInt(sale.time.split(":")[0] ?? "", 10);
    if (Number.isNaN(hour)) continue;
    hourBuckets.set(hour, (hourBuckets.get(hour) ?? 0) + 1);
  }

  if (hourBuckets.size >= 2) {
    const peakHour = [...hourBuckets.entries()].sort(([, left], [, right]) => right - left)[0];
    if (peakHour && peakHour[1] >= 2) {
      const label =
        peakHour[0] === 0
          ? "12 AM"
          : peakHour[0] <= 12
            ? `${peakHour[0]} AM`
            : `${peakHour[0] - 12} PM`;
      pushUniqueInsight(
        insights,
        {
          id: "sales-peak-hour",
          text: `Peak sales hour today: ${label} with ${peakHour[1]} transactions.`,
          severity: "info",
          tier: "info",
          category: "sales",
          priority: 28,
        },
        seen
      );
    }
  }

  const activeBranches = branches.filter((branch) => branch.active);
  for (const branch of activeBranches) {
    const branchSales = filterSalesByDate(sales, today, branch.code);
    if (branchSales.length === 0) {
      const openRecord = context.closings.find(
        (closing) =>
          closing.date === today &&
          matchesBranch(closing.branch, branch.code) &&
          closing.status === "open"
      );
      if (openRecord) {
        const hoursOpen = hoursSince(openRecord.openedAt ?? openRecord.reopenedAt, context.nowMs);
        if (hoursOpen !== null && hoursOpen >= 2) {
          const branchName = resolveBranchName(context, branch.code);
          pushUniqueInsight(
            insights,
            {
              id: `sales-drought-${branch.code}`,
              text: `No sales have been recorded at ${branchName} for ${Math.round(hoursOpen)} hours.`,
              severity: "warning",
              tier: "critical",
              category: "sales",
              priority: 80,
            },
            seen
          );
        }
      }
    }
  }

  return insights;
}
