import type { MetricFocus } from "@/lib/analytics-view";
import type { ChartExpenseSlice } from "@/lib/chart-data";
import type { ChartDataPoint } from "@/types";

export const CHART_ANIMATION_MS = 200;
export const CHART_ENTRANCE_MS = 300;

export type ChartSeriesKey = "sales" | "expenses" | "savings" | "profit";

export const CHART_SERIES: {
  key: ChartSeriesKey;
  label: string;
  color: string;
}[] = [
  { key: "sales", label: "Sales", color: "#ffffff" },
  { key: "expenses", label: "Expenses", color: "#52525b" },
  { key: "savings", label: "Savings", color: "#d4d4d8" },
  { key: "profit", label: "Profit", color: "#71717a" },
];

export interface EnrichedChartDataPoint extends ChartDataPoint {
  profit: number;
}

export interface ChartLinePoint extends EnrichedChartDataPoint {
  previous?: number;
}

export function calculateChartProfitMargin(sales: number, savings: number): number {
  if (sales === 0) return 0;
  return (savings / sales) * 100;
}

export function enrichChartData(data: ChartDataPoint[]): EnrichedChartDataPoint[] {
  return data.map((point) => ({
    ...point,
    profit: calculateChartProfitMargin(point.sales, point.savings),
  }));
}

export function getDefaultSeriesVisibility(activeMetric: MetricFocus): Record<
  ChartSeriesKey,
  boolean
> {
  return {
    sales: activeMetric === "all" || activeMetric === "sales",
    expenses: activeMetric === "all" || activeMetric === "expenses",
    savings:
      activeMetric === "all" ||
      activeMetric === "savings" ||
      activeMetric === "profit",
    profit: activeMetric === "all" || activeMetric === "profit",
  };
}

export { formatChartAxisValue } from "@/lib/format";

export function getPrimaryMetricKey(
  activeMetric: MetricFocus
): keyof ChartDataPoint {
  switch (activeMetric) {
    case "expenses":
      return "expenses";
    case "savings":
    case "profit":
      return "savings";
    default:
      return "sales";
  }
}

export function getMetricSeriesVisibility(activeMetric: MetricFocus) {
  return {
    showSales: activeMetric === "all" || activeMetric === "sales",
    showExpenses: activeMetric === "all" || activeMetric === "expenses",
    showSavings:
      activeMetric === "all" ||
      activeMetric === "savings" ||
      activeMetric === "profit",
  };
}

export function getMetricStrokeOpacity(
  activeMetric: MetricFocus,
  series: "sales" | "expenses" | "savings"
): number {
  if (activeMetric === "all") return 1;
  if (series === "sales") return activeMetric === "sales" ? 1 : 0.35;
  if (series === "expenses") return activeMetric === "expenses" ? 1 : 0.35;
  return activeMetric === "savings" || activeMetric === "profit" ? 1 : 0.35;
}

export function mergeChartWithPrevious(
  data: EnrichedChartDataPoint[],
  previousData: EnrichedChartDataPoint[] | undefined,
  activeMetric: MetricFocus
): ChartLinePoint[] {
  const primaryKey = getPrimaryMetricKey(activeMetric);
  return data.map((point, index) => ({
    ...point,
    previous: Number(
      previousData?.[index]?.[primaryKey as keyof ChartDataPoint] ?? 0
    ),
  }));
}

export function getChartVisibility(
  activeMetric: MetricFocus,
  chart: "sales" | "expenses" | "savings" | "branch"
): boolean {
  if (activeMetric === "all") return true;
  if (chart === "sales") return activeMetric === "sales";
  if (chart === "expenses") return activeMetric === "expenses";
  if (chart === "savings")
    return activeMetric === "savings" || activeMetric === "profit";
  return true;
}

export function enrichExpenseSlices(data: ChartExpenseSlice[]) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  return data.map((slice) => ({
    ...slice,
    percent: total > 0 ? (slice.value / total) * 100 : 0,
  }));
}

export function buildChartRefreshKey(parts: (string | number | null | undefined)[]) {
  return parts.filter((part) => part !== undefined).join("|");
}
