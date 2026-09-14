import type { ReportSummary } from "@/types";

export type ReportsPresentationType =
  | "sales"
  | "expenses"
  | "purchases"
  | "stock"
  | "staff";

export interface ReportsPresentationKpis {
  primaryLabel: string;
  primaryValue: number;
  secondaryLabel: string;
  secondaryValue: number;
  tertiaryLabel: string;
  tertiaryValue: number;
  quaternaryLabel: string;
  quaternaryValue: string;
}

function getTopCategoryLabel(summary: ReportSummary): string {
  const top = [...summary.insights.expenseBreakdown]
    .filter((item) => item.amount > 0)
    .sort((left, right) => right.amount - left.amount)[0];

  return top?.label ?? "—";
}

function countDaysWithValue(
  summary: ReportSummary,
  field: "sales" | "expenses" | "savings"
): number {
  return summary.chartData.filter((point) => point[field] > 0).length;
}

export function deriveReportsPresentationKpis(
  summary: ReportSummary,
  reportType: ReportsPresentationType
): ReportsPresentationKpis {
  const activeDays = summary.chartData.length;
  const salesDays = countDaysWithValue(summary, "sales");
  const expenseDays = countDaysWithValue(summary, "expenses");
  const topCategory = getTopCategoryLabel(summary);

  switch (reportType) {
    case "expenses":
      return {
        primaryLabel: "Total Expenses",
        primaryValue: summary.totalExpenses,
        secondaryLabel: "Expense Days",
        secondaryValue: expenseDays,
        tertiaryLabel: "Average Daily Expenses",
        tertiaryValue:
          activeDays > 0 ? summary.totalExpenses / activeDays : 0,
        quaternaryLabel: "Top Category",
        quaternaryValue: topCategory,
      };
    case "purchases":
      return {
        primaryLabel: "Operating Expenses",
        primaryValue: summary.totalExpenses,
        secondaryLabel: "Recorded Days",
        secondaryValue: activeDays,
        tertiaryLabel: "Inventory Spend",
        tertiaryValue:
          summary.insights.expenseBreakdown.find(
            (item) => item.key === "inventory"
          )?.amount ?? 0,
        quaternaryLabel: "Top Category",
        quaternaryValue: topCategory,
      };
    case "stock":
      return {
        primaryLabel: "Total Sales",
        primaryValue: summary.totalSales,
        secondaryLabel: "Recorded Days",
        secondaryValue: activeDays,
        tertiaryLabel: "Inventory Spend",
        tertiaryValue:
          summary.insights.expenseBreakdown.find(
            (item) => item.key === "inventory"
          )?.amount ?? 0,
        quaternaryLabel: "Top Category",
        quaternaryValue: topCategory,
      };
    case "staff":
      return {
        primaryLabel: "Staff Payments",
        primaryValue:
          summary.insights.expenseBreakdown.find(
            (item) => item.key === "staff-payments"
          )?.amount ?? 0,
        secondaryLabel: "Recorded Days",
        secondaryValue: activeDays,
        tertiaryLabel: "Average Daily Expenses",
        tertiaryValue:
          activeDays > 0 ? summary.totalExpenses / activeDays : 0,
        quaternaryLabel: "Top Category",
        quaternaryValue: topCategory,
      };
    case "sales":
    default:
      return {
        primaryLabel: "Total Sales",
        primaryValue: summary.totalSales,
        secondaryLabel: "Transactions",
        secondaryValue: salesDays,
        tertiaryLabel: "Average Sale",
        tertiaryValue: salesDays > 0 ? summary.totalSales / salesDays : 0,
        quaternaryLabel: "Top Category",
        quaternaryValue: topCategory,
      };
  }
}
