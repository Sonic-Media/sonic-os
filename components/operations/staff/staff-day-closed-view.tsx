"use client";

import { useMemo } from "react";
import { StaffCashSummaryCard } from "@/components/operations/staff/staff-cash-summary-card";
import {
  StaffCard,
  StaffMetricTile,
  StaffSectionLabel,
  StaffStatusBadge,
} from "@/components/operations/staff/primitives";
import { useAuth } from "@/context/auth-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useEntriesContext } from "@/context/entries-context";
import { useSales } from "@/context/sales-context";
import { useStaff } from "@/context/staff-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import {
  findCompletedEntryForBranchDate,
  findDraftForBranchDate,
} from "@/lib/entry-helpers";
import { calculateExpenses, parseAmount } from "@/lib/amounts";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { formatCurrency, getGreeting } from "@/lib/format";
import { getTodayISO } from "@/lib/dates";
import { formatClockTime } from "@/lib/staff/attendance";
import {
  generateStaffDayInsights,
  getTopAccessoryProduct,
} from "@/lib/operations/staff-day-insights";
import { computeStaffPayoutTotalForBranchDate } from "@/lib/staff-payments/calculations";
import { resolveStaffDisplayName } from "@/lib/ux/user-display";
import type { Branch, Entry } from "@/types";

interface StaffDayClosedViewProps {
  branch: Branch;
  date?: string;
}

export function StaffDayClosedView({
  branch,
  date = getTodayISO(),
}: StaffDayClosedViewProps) {
  const { session } = useAuth();
  const { staff } = useStaff();
  const { entries } = useEntriesContext();
  const { sales } = useSales();
  const { payments } = useStaffPaymentsModule();
  const { getClosedRecord } = useDayClosing();

  const closedRecord = getClosedRecord(branch, date);
  const entry: Entry | undefined = useMemo(() => {
    return (
      findCompletedEntryForBranchDate(entries, branch, date) ??
      findDraftForBranchDate(entries, branch, date)
    );
  }, [entries, branch, date]);

  const staffName = resolveStaffDisplayName(session, staff);
  const firstName = staffName.split(" ")[0] ?? staffName;

  const movieRevenue = entry ? parseAmount(String(entry.sales)) : 0;
  const accessoryRevenue = useMemo(() => {
    return filterByBranchField(sales, branch)
      .filter((sale) => sale.date === date && sale.status === "completed")
      .reduce((sum, sale) => sum + sale.total, 0);
  }, [sales, branch, date]);

  const totalExpenses = entry ? calculateExpenses(entry) : 0;
  const dailyWage = useMemo(
    () => computeStaffPayoutTotalForBranchDate(payments, branch, date),
    [payments, branch, date]
  );

  const netCash = movieRevenue + accessoryRevenue - totalExpenses - dailyWage;
  const savingsAllocation = entry?.savingsAllocation
    ? parseAmount(String(entry.savingsAllocation))
    : 0;

  const yesterday = useMemo(() => {
    const parsed = new Date(`${date}T12:00:00`);
    parsed.setDate(parsed.getDate() - 1);
    return parsed.toISOString().slice(0, 10);
  }, [date]);

  const yesterdayEntry = useMemo(() => {
    return findCompletedEntryForBranchDate(entries, branch, yesterday);
  }, [entries, branch, yesterday]);

  const todaysSales = useMemo(
    () =>
      filterByBranchField(sales, branch).filter(
        (sale) => sale.date === date && sale.status === "completed"
      ),
    [sales, branch, date]
  );

  const insights = useMemo(
    () =>
      generateStaffDayInsights({
        movieRevenue,
        accessoryRevenue,
        totalExpenses,
        yesterdayMovieRevenue: yesterdayEntry
          ? parseAmount(String(yesterdayEntry.sales))
          : undefined,
        topProductName: getTopAccessoryProduct(todaysSales),
      }),
    [
      movieRevenue,
      accessoryRevenue,
      totalExpenses,
      yesterdayEntry,
      todaysSales,
    ]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-4">
      <StaffCard accent="closed" hero className="opacity-95">
        <StaffSectionLabel>Today Complete</StaffSectionLabel>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          {getGreeting(firstName)} 👋
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Today&apos;s shift is complete. Everything below is read only.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <StaffStatusBadge tone="success">
            <span aria-hidden>✅</span>
            Day Closed
          </StaffStatusBadge>
          {closedRecord?.closedAt ? (
            <span className="text-sm text-zinc-500">
              Closed at {formatClockTime(closedRecord.closedAt)}
            </span>
          ) : null}
        </div>
      </StaffCard>

      <StaffCard accent="revenue" className="opacity-90">
        <StaffSectionLabel>Today&apos;s Summary</StaffSectionLabel>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <StaffMetricTile
            label="Accessory Revenue"
            value={formatCurrency(accessoryRevenue)}
          />
          <StaffMetricTile
            label="Movie Revenue"
            value={formatCurrency(movieRevenue)}
          />
          <StaffMetricTile
            label="Expenses"
            value={formatCurrency(totalExpenses)}
          />
          <StaffMetricTile
            label="Daily Wage"
            value={formatCurrency(dailyWage)}
          />
          <StaffMetricTile
            label="Cash Remaining"
            value={formatCurrency(netCash - savingsAllocation)}
            highlight="positive"
            className="sm:col-span-2"
          />
        </div>
      </StaffCard>

      <StaffCashSummaryCard
        movieRevenue={movieRevenue}
        accessorySales={accessoryRevenue}
        totalExpenses={totalExpenses}
        staffPayouts={dailyWage}
        netCash={netCash}
        savingsAllocation={savingsAllocation}
        readOnly
      />

      {entry?.notes ? (
        <StaffCard className="opacity-85">
          <StaffSectionLabel>Daily Notes</StaffSectionLabel>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            {entry.notes}
          </p>
        </StaffCard>
      ) : null}

      <StaffCard accent="default" className="opacity-90">
        <StaffSectionLabel>Today&apos;s Insight</StaffSectionLabel>
        <div className="mt-5 space-y-3">
          {insights.map((insight) => (
            <p
              key={insight}
              className="rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-4 text-sm leading-relaxed text-zinc-400"
            >
              {insight}
            </p>
          ))}
        </div>
      </StaffCard>
    </div>
  );
}
