import {
  filterSalesByDate,
  formatMoney,
  formatPercentChange,
  getBranchProductStock,
  matchesBranch,
  percentChange,
  pushUniqueInsight,
  sumSaleRevenue,
} from "@/lib/business-intelligence/helpers";
import { resolveBranchName, type BIAnalysisContext } from "@/lib/business-intelligence/context";
import type { BIInsight } from "@/lib/business-intelligence/types";

export function generateRecommendationInsights(context: BIAnalysisContext): BIInsight[] {
  const insights: BIInsight[] = [];
  const seen = new Set<string>();
  const { today, products, movements, branches, sales, entries } = context;

  const activeBranches = branches.filter((branch) => branch.active);

  for (const product of products) {
    for (const branch of activeBranches) {
      const qty = getBranchProductStock(product, branch.code, movements);
      if (qty > 0 && qty <= product.minimumStockLevel) {
        pushUniqueInsight(
          insights,
          {
            id: `recommend-reorder-${product.id}`,
            text: `Consider reordering ${product.name} — stock is at or below minimum level.`,
            severity: "info",
            tier: "recommendation",
            category: "recommendation",
            priority: 50,
          },
          seen
        );
        break;
      }
    }
  }

  if (activeBranches.length >= 2) {
    const accessoryByBranch = activeBranches.map((branch) => ({
      name: resolveBranchName(context, branch.code),
      accessory: sumSaleRevenue(filterSalesByDate(sales, today, branch.code)),
    }));
    const average =
      accessoryByBranch.reduce((sum, row) => sum + row.accessory, 0) /
      accessoryByBranch.length;

    for (const row of accessoryByBranch) {
      if (average > 0 && row.accessory < average * 0.7) {
        pushUniqueInsight(
          insights,
          {
            id: `recommend-accessory-${row.name}`,
            text: `${row.name} has lower accessory sales than average today — review product availability or staffing.`,
            severity: "info",
            tier: "recommendation",
            category: "recommendation",
            priority: 42,
          },
          seen
        );
      }
    }
  }

  const todayMovie = entries
    .filter((entry) => entry.date === today && entry.status === "completed")
    .reduce((sum, entry) => sum + entry.sales, 0);
  const todayAccessory = sumSaleRevenue(filterSalesByDate(sales, today));
  const combined = todayMovie + todayAccessory;

  if (combined > 0 && todayMovie > todayAccessory) {
    const movieShare = Math.round((todayMovie / combined) * 100);
    if (movieShare >= 60) {
      pushUniqueInsight(
        insights,
        {
          id: "recommend-movie-heavy",
          text: `Movies are generating ${movieShare}% of today's revenue — accessory upsell may be an opportunity.`,
          severity: "info",
          tier: "recommendation",
          category: "recommendation",
          priority: 35,
        },
        seen
      );
    }
  }

  const weekAccessory = sales
    .filter((sale) => sale.status === "completed" && sale.date >= context.weekStart)
    .reduce((sum, sale) => sum + sale.total, 0);
  const lastWeekAccessory = sales
    .filter(
      (sale) =>
        sale.status === "completed" &&
        sale.date >= context.lastWeekStart &&
        sale.date < context.weekStart
    )
    .reduce((sum, sale) => sum + sale.total, 0);

  const accessoryTrend = percentChange(weekAccessory, lastWeekAccessory);
  if (accessoryTrend !== null && accessoryTrend <= -20 && lastWeekAccessory > 0) {
    pushUniqueInsight(
      insights,
      {
        id: "recommend-accessory-decline",
        text: `Accessory sales are down ${formatPercentChange(Math.abs(accessoryTrend))} week-over-week — review inventory and promotions.`,
        severity: "info",
        tier: "recommendation",
        category: "recommendation",
        priority: 40,
      },
      seen
    );
  }

  return insights;
}
