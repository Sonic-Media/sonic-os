import {
  classifyChartExpense,
  getDashboardChartDataFromEntries,
  type ChartExpenseCategory,
} from "@/lib/chart-data";
import {
  filterCompletedEntries,
  filterEntriesByPeriod,
  filterEntriesByPreviousPeriod,
} from "@/lib/entry-helpers";
import { getDashboardAnalyticsFromEntries } from "@/lib/report-insights";
import { filterEntriesByStaff } from "@/lib/staff-reports";
import type {
  Branch,
  DashboardPeriod,
  Entry,
  Staff,
} from "@/types";

export type MetricFocus = "all" | "sales" | "expenses" | "savings" | "profit";

export type AnalyticsTimeFilter = DashboardPeriod | "custom";

export type DrillDownView =
  | "none"
  | "expense-history"
  | "branch"
  | "staff"
  | "sales-report"
  | "highest-sales-day"
  | "highest-savings-day";

export interface CustomDateRange {
  start: string;
  end: string;
}

export function filterEntriesByDateRange(
  entries: Entry[],
  start: string,
  end: string
): Entry[] {
  return entries.filter((entry) => entry.date >= start && entry.date <= end);
}

function getCustomPreviousRange(range: CustomDateRange): CustomDateRange {
  const startDate = new Date(range.start + "T12:00:00");
  const endDate = new Date(range.end + "T12:00:00");
  const durationMs = endDate.getTime() - startDate.getTime();
  const previousEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  const format = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  return { start: format(previousStart), end: format(previousEnd) };
}

export function filterEntriesByBranch(
  entries: Entry[],
  branch: Branch
): Entry[] {
  return entries.filter((entry) => entry.branch === branch);
}

export function filterEntriesByExpenseCategory(
  entries: Entry[],
  category: ChartExpenseCategory
): Entry[] {
  return entries.filter((entry) =>
    entry.expenses.some(
      (expense) => classifyChartExpense(expense) === category
    )
  );
}

export function resolvePeriodEntries(
  entries: Entry[],
  timeFilter: AnalyticsTimeFilter,
  customRange: CustomDateRange,
  ref = new Date()
) {
  if (timeFilter === "custom") {
    const currentEntries = filterEntriesByDateRange(
      entries,
      customRange.start,
      customRange.end
    );
    const previousRange = getCustomPreviousRange(customRange);
    const previousEntries = filterEntriesByDateRange(
      entries,
      previousRange.start,
      previousRange.end
    );

    return {
      currentEntries,
      previousEntries,
      period: "monthly" as DashboardPeriod,
    };
  }

  return {
    currentEntries: filterEntriesByPeriod(entries, timeFilter, ref),
    previousEntries: filterEntriesByPreviousPeriod(entries, timeFilter, ref),
    period: timeFilter,
  };
}

export function computeFilteredAnalytics(
  entries: Entry[],
  options: {
    timeFilter: AnalyticsTimeFilter;
    customRange: CustomDateRange;
    branchFilter: Branch | null;
    staffFilter: string | null;
    expenseCategory: ChartExpenseCategory | null;
    branchNames: Record<Branch, string>;
    staff: Staff[];
    ref?: Date;
  }
) {
  const { currentEntries, previousEntries, period } = resolvePeriodEntries(
    entries,
    options.timeFilter,
    options.customRange,
    options.ref
  );

  let filteredCurrent = currentEntries;
  let filteredPrevious = previousEntries;

  if (options.branchFilter) {
    filteredCurrent = filterEntriesByBranch(
      filteredCurrent,
      options.branchFilter
    );
    filteredPrevious = filterEntriesByBranch(
      filteredPrevious,
      options.branchFilter
    );
  }

  if (options.staffFilter) {
    filteredCurrent = filterEntriesByStaff(
      filteredCurrent,
      options.staffFilter
    );
    filteredPrevious = filterEntriesByStaff(
      filteredPrevious,
      options.staffFilter
    );
  }

  if (options.expenseCategory) {
    filteredCurrent = filterEntriesByExpenseCategory(
      filteredCurrent,
      options.expenseCategory
    );
    filteredPrevious = filterEntriesByExpenseCategory(
      filteredPrevious,
      options.expenseCategory
    );
  }

  const analytics = getDashboardAnalyticsFromEntries(
    filteredCurrent,
    filteredPrevious,
    period,
    {
      branchNames: options.branchNames,
      staff: options.staff,
    }
  );

  const chartData = getDashboardChartDataFromEntries(
    filteredCurrent,
    options.branchNames
  );

  const previousChartData = getDashboardChartDataFromEntries(
    filteredPrevious,
    options.branchNames
  );

  return {
    analytics,
    chartData,
    previousChartData,
    filteredEntries: filterCompletedEntries(filteredCurrent),
    previousFilteredEntries: filterCompletedEntries(filteredPrevious),
    period,
  };
}

export function getBranchIdFromName(
  branchName: string,
  branchNames: Record<Branch, string>
): Branch | null {
  const match = (Object.entries(branchNames) as [Branch, string][]).find(
    ([, name]) => name === branchName
  );
  return match?.[0] ?? null;
}

