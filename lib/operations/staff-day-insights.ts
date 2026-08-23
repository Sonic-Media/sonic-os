import { formatCurrency } from "@/lib/format";
import type { Sale } from "@/types/sales";

export function getTopAccessoryProduct(sales: Sale[]): string | undefined {
  const totals = new Map<string, number>();

  for (const sale of sales) {
    if (sale.status !== "completed") continue;
    for (const item of sale.items) {
      totals.set(
        item.productName,
        (totals.get(item.productName) ?? 0) + item.quantity
      );
    }
  }

  let topName: string | undefined;
  let topQty = 0;

  for (const [name, qty] of totals) {
    if (qty > topQty) {
      topName = name;
      topQty = qty;
    }
  }

  return topName;
}

export function generateStaffDayInsights(options: {
  movieRevenue: number;
  accessoryRevenue: number;
  totalExpenses: number;
  yesterdayMovieRevenue?: number;
  topProductName?: string;
}): string[] {
  const insights: string[] = [];
  const totalRevenue = options.movieRevenue + options.accessoryRevenue;

  if (totalRevenue > 0 && options.accessoryRevenue > options.movieRevenue) {
    insights.push("Accessory sales were stronger than movie revenue today.");
  } else if (totalRevenue > 0 && options.movieRevenue > options.accessoryRevenue) {
    insights.push("Movie revenue led today's income.");
  }

  if (totalRevenue > 0 && options.totalExpenses > 0) {
    const pct = Math.round((options.totalExpenses / totalRevenue) * 100);
    insights.push(`You spent ${pct}% of today's revenue on expenses.`);
  }

  if (
    typeof options.yesterdayMovieRevenue === "number" &&
    options.movieRevenue !== options.yesterdayMovieRevenue
  ) {
    const diff = options.movieRevenue - options.yesterdayMovieRevenue;
    if (diff > 0) {
      insights.push(
        `Movie revenue increased ${formatCurrency(diff)} compared to yesterday.`
      );
    } else if (diff < 0) {
      insights.push(
        `Movie revenue decreased ${formatCurrency(Math.abs(diff))} compared to yesterday.`
      );
    }
  }

  if (options.topProductName) {
    insights.push(`Highest selling accessory: ${options.topProductName}.`);
  }

  if (insights.length === 0) {
    insights.push("Today's shift is complete. Great work.");
  }

  return insights.slice(0, 2);
}
