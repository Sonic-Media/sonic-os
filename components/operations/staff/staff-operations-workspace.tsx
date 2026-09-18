"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { DuplicateEntryDialog } from "@/components/entry/duplicate-entry-dialog";
import { StaffDailyWageCard } from "@/components/operations/staff/staff-daily-wage-card";
import { StaffEndOfDayCard } from "@/components/operations/staff/staff-end-of-day-card";
import { StaffExpensesCard } from "@/components/operations/staff/staff-expenses-card";
import { StaffCashSummaryCard } from "@/components/operations/staff/staff-cash-summary-card";
import { StaffHomeDashboard } from "@/components/staff-home/staff-home-dashboard";
import { useToast } from "@/context/toast-context";
import { useEntryForm } from "@/hooks/use-entry-form";
import { useLinkedStaff } from "@/hooks/use-linked-staff";
import { useStaffCloseDay } from "@/hooks/use-staff-close-day";
import { useStaffOperationsRefresh } from "@/hooks/use-staff-operations-refresh";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import {
  computeStaffPayoutTotalForStaffBranchDate,
  findStaffDailyWagePayment,
} from "@/lib/staff-payments/calculations";
import { useDayClosing } from "@/context/day-closing-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { useBranches } from "@/context/branches-context";
import { parseAmount } from "@/lib/amounts";
import { isPayrollEntryExpense } from "@/lib/expenses";
import { mapCloseDayError } from "@/lib/ux/close-day-messages";
import { uiSpacing } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";
import type { Branch, Entry } from "@/types";
import type { DayClosingStatus } from "@/types/day-closing";

type StaffWorkflowSection = "expenses" | "daily-wage" | "end-of-day";

interface StaffOperationsWorkspaceProps {
  branch: Branch;
  entry?: Entry;
  businessDate?: string;
  activeBusinessDayStatus?: DayClosingStatus;
  onOpenShopComplete?: () => void | Promise<void>;
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
  businessDate: businessDateProp,
  activeBusinessDayStatus,
  onOpenShopComplete,
}: StaffOperationsWorkspaceProps) {
  const { activeBranch } = useActiveBranch();
  const { getBranchName } = useBranches();
  const { payments } = useStaffPaymentsModule();
  const { linkedStaff } = useLinkedStaff(branch);
  const { getOpenRecord, getActiveOpenRecord } = useDayClosing();
  const { success: toastSuccess } = useToast();
  const [closeFlowError, setCloseFlowError] = useState<string | null>(null);
  const closeSectionRef = useRef<HTMLDivElement | null>(null);

  const {
    form,
    isSaving,
    movieRevenue,
    accessorySales,
    serviceSalesTotal,
    totalExpenses,
    staffPayouts,
    duplicateEntry,
    updateField,
    handleSubmitRequest,
    handleEditExisting,
    handleCancelDuplicate,
    seedCommonExpenses,
  } = useEntryForm({
    entry,
    initialBranch: branch,
    initialDate: entry?.date ?? businessDateProp,
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
    closeRequestPending,
    dayClosed,
  } = useStaffCloseDay(businessDateProp ?? form.date);

  const resolvedBusinessDate = businessDateProp ?? businessDate;
  const openRecord =
    getOpenRecord(activeBranch, resolvedBusinessDate) ??
    getActiveOpenRecord(activeBranch);

  const { refreshAll: refreshStaffOperations } = useStaffOperationsRefresh({
    closeRequestPending,
    watchForClose: closeRequestPending || Boolean(activeBusinessDayStatus),
  });

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

    const saveResult = await handleSubmitRequest();
    if (!saveResult.success) {
      setCloseFlowError(mapCloseDayError(saveResult.error ?? ""));
      return false;
    }

    const result = await closeStaffDay(form.notes.trim());
    if (result.success) {
      setCloseFlowError(null);
      toastSuccess("Closing request sent.");
      await refreshStaffOperations();
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
    refreshStaffOperations,
    toastSuccess,
  ]);

  const handleRequestCloseShop = useCallback(() => {
    expandSection("end-of-day");
    window.setTimeout(() => {
      closeSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }, []);

  const totalSalesRevenue = movieRevenue + accessorySales + serviceSalesTotal;

  return (
    <div className={cn("mx-auto max-w-6xl", uiSpacing.page, uiSpacing.section)}>
      <StaffHomeDashboard
        branch={branch}
        form={form}
        movieRevenue={movieRevenue}
        movieTime={movieTransactionMeta.time}
        movieSortKey={movieTransactionMeta.sortKey}
        shopOpen={shopOpen}
        dayClosed={dayClosed}
        closeRequestPending={closeRequestPending}
        activeBusinessDayStatus={activeBusinessDayStatus}
        openRecord={openRecord}
        isSaving={isSaving}
        isClosing={isClosing}
        closeError={closeFlowError}
        onSaveMovieRevenue={(amount) => handleSubmitRequest({ sales: amount })}
        onPersistNotes={(notes) => handleSubmitRequest({ notes })}
        onCloseShop={handleRequestCloseShop}
        onAddExpense={() => {
          expandSection("expenses");
          window.setTimeout(() => {
            document
              .getElementById("staff-home-operations")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 50);
        }}
        onOpenShopComplete={onOpenShopComplete}
      />

      <div id="staff-home-operations" className="space-y-6 pt-2">
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
          onExpandedChange={(open) =>
            expandSection(open ? "daily-wage" : null)
          }
          onRecorded={() => {
            expandSection("end-of-day");
            void refreshStaffOperations();
          }}
        />

        <StaffCashSummaryCard
          movieRevenue={movieRevenue}
          accessorySales={accessorySales + serviceSalesTotal}
          totalExpenses={totalExpenses}
          staffPayouts={displayedStaffPayouts}
          netCash={
            totalSalesRevenue - totalExpenses - displayedStaffPayouts
          }
          savingsAllocation={parseAmount(form.savingsAllocation)}
          collapsible={false}
        />

        <div ref={closeSectionRef}>
          <StaffEndOfDayCard
            form={form}
            branchName={getBranchName(form.branch)}
            businessDate={businessDate}
            movieRevenue={movieRevenue}
            accessorySales={accessorySales + serviceSalesTotal}
            totalExpenses={totalExpenses}
            staffPayouts={displayedStaffPayouts}
            cashToHandIn={
              totalSalesRevenue -
              totalExpenses -
              displayedStaffPayouts -
              parseAmount(form.savingsAllocation)
            }
            wageRecorded={wageRecorded}
            shopOpen={shopOpen}
            closeRequestPending={closeRequestPending}
            dayClosed={dayClosed}
            isClosing={isClosing || isSaving}
            closeError={closeFlowError}
            updateField={updateField}
            onCloseDay={handleCloseDay}
          />
        </div>
      </div>

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
