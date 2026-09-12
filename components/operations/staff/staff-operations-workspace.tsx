"use client";

import { useMemo, useState, useCallback } from "react";
import { DuplicateEntryDialog } from "@/components/entry/duplicate-entry-dialog";
import { StaffDailyWageCard } from "@/components/operations/staff/staff-daily-wage-card";
import { StaffEndOfDayCard } from "@/components/operations/staff/staff-end-of-day-card";
import { StaffExpensesCard } from "@/components/operations/staff/staff-expenses-card";
import { StaffRecentTransactionsCard } from "@/components/operations/staff/staff-recent-transactions-card";
import { StaffRevenueCard } from "@/components/operations/staff/staff-revenue-card";
import { StaffTodayActivityCard } from "@/components/operations/staff/staff-today-activity-card";
import { StaffWelcomeCard } from "@/components/operations/staff/staff-welcome-card";
import { StaffCashSummaryCard } from "@/components/operations/staff/staff-cash-summary-card";
import { useToast } from "@/context/toast-context";
import { useEntryForm } from "@/hooks/use-entry-form";
import { useLinkedStaff } from "@/hooks/use-linked-staff";
import { useStaffCloseDay } from "@/hooks/use-staff-close-day";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import {
  computeStaffPayoutTotalForStaffBranchDate,
  findStaffDailyWagePayment,
  hasStaffDailyWagePayment,
} from "@/lib/staff-payments/calculations";
import { useSales } from "@/context/sales-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { useBranches } from "@/context/branches-context";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { parseAmount } from "@/lib/amounts";
import { isPayrollEntryExpense } from "@/lib/expenses";
import { mapCloseDayError } from "@/lib/ux/close-day-messages";
import { uiSpacing } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";
import type { Branch, Entry } from "@/types";

type StaffWorkflowSection = "expenses" | "daily-wage" | "end-of-day";

interface StaffOperationsWorkspaceProps {
  branch: Branch;
  entry?: Entry;
}

function resolveInitialSection({
  hasExpenses,
  wageRecorded,
}: {
  hasExpenses: boolean;
  wageRecorded: boolean;
}): StaffWorkflowSection {
  if (!hasExpenses) return "expenses";
  if (!wageRecorded) return "daily-wage";
  return "end-of-day";
}

export function StaffOperationsWorkspace({
  branch,
  entry,
}: StaffOperationsWorkspaceProps) {
  const { sales } = useSales();
  const { activeBranch } = useActiveBranch();
  const { getBranchName } = useBranches();
  const { payments } = useStaffPaymentsModule();
  const { linkedStaff } = useLinkedStaff(branch);
  const { success: toastSuccess } = useToast();
  const [closeFlowError, setCloseFlowError] = useState<string | null>(null);

  const {
    form,
    isSaving,
    saveError,
    movieRevenue,
    accessorySales,
    totalExpenses,
    staffPayouts,
    balance,
    remainingCash,
    duplicateEntry,
    updateField,
    handleSubmitRequest,
    handleEditExisting,
    handleCancelDuplicate,
    seedCommonExpenses,
  } = useEntryForm({
    entry,
    initialBranch: branch,
    initialDate: entry?.date,
    lockDate: true,
    mode: "today",
    scopedStaffId: linkedStaff?.id,
  });

  const {
    closeStaffDay,
    isClosing,
    clearError: clearCloseError,
    shopOpen,
    businessDate,
  } = useStaffCloseDay(form.date);

  const accessorySalesCount = useMemo(
    () =>
      filterByBranchField(sales, activeBranch).filter(
        (sale) => sale.date === form.date && sale.status === "completed"
      ).length,
    [sales, activeBranch, form.date]
  );

  const expenseCount = useMemo(
    () =>
      form.expenses.filter(
        (expense) => expense.amount > 0 && !isPayrollEntryExpense(expense)
      ).length,
    [form.expenses]
  );

  const ownDailyWagePayment = useMemo(() => {
    if (!linkedStaff) return undefined;
    return findStaffDailyWagePayment(
      linkedStaff.id,
      form.branch,
      form.date,
      payments
    );
  }, [linkedStaff, form.branch, form.date, payments]);

  const wageRecorded = Boolean(ownDailyWagePayment);

  const displayedStaffPayouts = useMemo(() => {
    if (ownDailyWagePayment) {
      return ownDailyWagePayment.amount;
    }
    if (!linkedStaff) {
      return staffPayouts;
    }
    return computeStaffPayoutTotalForStaffBranchDate(
      linkedStaff.id,
      form.branch,
      form.date,
      payments
    );
  }, [
    ownDailyWagePayment,
    linkedStaff,
    staffPayouts,
    form.branch,
    form.date,
    payments,
  ]);

  const [expandedSection, setExpandedSection] = useState<
    StaffWorkflowSection | null
  >(() =>
    resolveInitialSection({
      hasExpenses: expenseCount > 0,
      wageRecorded,
    })
  );

  const moviesSold = movieRevenue > 0 ? 1 : 0;
  const movieTransactionMeta = useMemo(() => {
    if (movieRevenue <= 0) {
      return { time: undefined, sortKey: 0 };
    }

    if (entry?.time) {
      return {
        time: entry.time,
        sortKey: entry.timestamp ?? 0,
      };
    }

    return { time: undefined, sortKey: 0 };
  }, [entry?.time, entry?.timestamp, movieRevenue]);

  function expandSection(section: StaffWorkflowSection | null) {
    setExpandedSection(section);
  }

  const handleCloseDay = useCallback(async (): Promise<boolean> => {
    setCloseFlowError(null);
    clearCloseError();

    const saved = await handleSubmitRequest();
    if (!saved) {
      setCloseFlowError(
        mapCloseDayError(
          saveError ?? "We couldn't close the business day. Check your connection and try again."
        )
      );
      return false;
    }

    const result = await closeStaffDay(form.notes.trim());
    if (result.success) {
      setCloseFlowError(null);
      toastSuccess("Business day closed.");
      return true;
    }

    if ("message" in result && result.message) {
      setCloseFlowError(result.message);
    }
    return false;
  }, [
    clearCloseError,
    closeStaffDay,
    form.notes,
    handleSubmitRequest,
    saveError,
    toastSuccess,
  ]);

  return (
    <div className={cn("mx-auto max-w-3xl", uiSpacing.page, uiSpacing.section)}>
      <StaffWelcomeCard />

      <StaffRevenueCard
        movieRevenue={movieRevenue}
        accessorySales={accessorySales}
      />

      <StaffTodayActivityCard
        moviesSold={moviesSold}
        accessoriesSold={accessorySalesCount}
        date={form.date}
        onSaleComplete={() => {
          if (expenseCount === 0) {
            expandSection("expenses");
          }
        }}
      />

      <StaffRecentTransactionsCard
        date={form.date}
        movieRevenue={movieRevenue}
        movieTime={movieTransactionMeta.time}
        movieSortKey={movieTransactionMeta.sortKey}
      />

      <StaffExpensesCard
        form={form}
        seedCommonExpenses={seedCommonExpenses}
        updateField={updateField}
        expanded={expandedSection === "expenses"}
        onExpandedChange={(open) => expandSection(open ? "expenses" : null)}
      />

      <StaffDailyWageCard
        branch={form.branch}
        date={form.date}
        expanded={expandedSection === "daily-wage"}
        onExpandedChange={(open) => expandSection(open ? "daily-wage" : null)}
        onRecorded={() => expandSection("end-of-day")}
      />

      <StaffCashSummaryCard
        movieRevenue={movieRevenue}
        accessorySales={accessorySales}
        totalExpenses={totalExpenses}
        staffPayouts={displayedStaffPayouts}
        netCash={
          movieRevenue + accessorySales - totalExpenses - displayedStaffPayouts
        }
        savingsAllocation={parseAmount(form.savingsAllocation)}
        collapsible={false}
      />

      <StaffEndOfDayCard
        form={form}
        branchName={getBranchName(form.branch)}
        businessDate={businessDate}
        movieRevenue={movieRevenue}
        accessorySales={accessorySales}
        totalExpenses={totalExpenses}
        staffPayouts={displayedStaffPayouts}
        cashToHandIn={
          movieRevenue +
          accessorySales -
          totalExpenses -
          displayedStaffPayouts -
          parseAmount(form.savingsAllocation)
        }
        wageRecorded={wageRecorded}
        shopOpen={shopOpen}
        isClosing={isClosing || isSaving}
        closeError={closeFlowError}
        updateField={updateField}
        onCloseDay={handleCloseDay}
      />

      {duplicateEntry ? (
        <DuplicateEntryDialog
          entry={duplicateEntry}
          onEditExisting={handleEditExisting}
          onCancel={handleCancelDuplicate}
        />
      ) : null}
    </div>
  );
}
