"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { Input } from "@/components/shared/ui/input";
import { Textarea } from "@/components/shared/ui/textarea";
import { CloseDaySuccess } from "@/components/operations/close-day-success";
import { useActiveBranch } from "@/context/active-branch-context";
import { useAuth } from "@/context/auth-context";
import { useBranches } from "@/context/branches-context";
import { useSettings } from "@/context/settings-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSales } from "@/context/sales-context";
import { useStaff } from "@/context/staff-context";
import {
  buildStaffPayoutRows,
  computeDayClosingMetrics,
  computeDayClosingSummary,
  computeExpectedCash,
  computeCashDifference,
  resolveCashStatus,
} from "@/lib/day-closing/calculations";
import { canReopenDay } from "@/lib/day-closing/permissions";
import { formatCurrency } from "@/lib/format";
import { getStaffRoleName } from "@/lib/staff/roles";
import { getTodayISO } from "@/lib/dates";
import { toStaffFacingError } from "@/lib/ux/staff-messages";
import { resolveStaffDisplayName } from "@/lib/ux/user-display";
import type {
  CashReconciliationStatus,
  DayClosingRecord,
  DayClosingStaffPayout,
} from "@/types/day-closing";

const STEPS = [
  "Review",
  "Staff Payouts",
  "Cash Reconciliation",
  "Summary",
  "Close Day",
] as const;

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white tabular-nums">{value}</p>
    </Card>
  );
}

function CashStatusBadge({ status }: { status: CashReconciliationStatus }) {
  const label =
    status === "balanced" ? "Balanced" : status === "short" ? "Short" : "Over";
  const className =
    status === "balanced"
      ? "text-emerald-400"
      : status === "short"
        ? "text-red-400"
        : "text-amber-400";

  return <span className={className}>{label}</span>;
}

export function CloseDayWorkspace({
  onCancel,
  onCloseComplete,
  redirectAfterClose = "/operations/today",
  movieRevenue = 0,
  accessorySales = 0,
  savings = 0,
}: {
  onCancel?: () => void;
  onCloseComplete?: () => void;
  redirectAfterClose?: string;
  movieRevenue?: number;
  accessorySales?: number;
  savings?: number;
} = {}) {
  const router = useRouter();
  const today = getTodayISO();
  const { activeBranch } = useActiveBranch();
  const branch = activeBranch;
  const { activeBranches, getBranchName } = useBranches();
  const { sales } = useSales();
  const { purchases } = usePurchasing();
  const { expenses } = useExpensesModule();
  const { payments } = useStaffPaymentsModule();
  const { entries } = useEntriesContext();
  const { staff } = useStaff();
  const { session } = useAuth();
  const { settings } = useSettings();
  const { closeDay, reopenDay, getClosedRecord } = useDayClosing();

  const [step, setStep] = useState(0);
  const [staffPayouts, setStaffPayouts] = useState<DayClosingStaffPayout[]>([]);
  const [actualCashCounted, setActualCashCounted] = useState("");
  const [reconciliationNotes, setReconciliationNotes] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closeSuccessRecord, setCloseSuccessRecord] = useState<
    DayClosingRecord | undefined
  >();

  useEffect(() => {
    setStep(0);
    setStaffPayouts([]);
    setActualCashCounted("");
    setReconciliationNotes("");
    setClosingNotes("");
    setErrors({});
  }, [activeBranch]);

  const branchEntity = activeBranches.find((item) => item.code === branch);
  const closedRecord = getClosedRecord(branch, today);

  const metrics = useMemo(() => {
    if (!branchEntity) return null;
    return computeDayClosingMetrics(
      branchEntity,
      sales,
      purchases,
      expenses,
      entries,
      payments,
      today
    );
  }, [branchEntity, sales, purchases, expenses, entries, payments, today]);

  const payoutRows = useMemo(() => {
    if (!metrics) return [];
    return buildStaffPayoutRows(staff, branch, payments, today);
  }, [metrics, staff, branch, payments, today]);

  const effectivePayouts = staffPayouts.length > 0 ? staffPayouts : payoutRows;
  const expectedCash = metrics
    ? computeExpectedCash(metrics.cashBeforeClosing, effectivePayouts)
    : 0;
  const parsedActualCash = Number.parseFloat(actualCashCounted);
  const cashDifference = Number.isFinite(parsedActualCash)
    ? computeCashDifference(expectedCash, parsedActualCash)
    : 0;
  const cashStatus = resolveCashStatus(cashDifference);
  const summary =
    metrics && Number.isFinite(parsedActualCash)
      ? computeDayClosingSummary(metrics, effectivePayouts, parsedActualCash)
      : null;

  function initializePayouts() {
    if (staffPayouts.length === 0) {
      setStaffPayouts(payoutRows);
    }
  }

  function updatePayout(
    staffId: string,
    patch: Partial<DayClosingStaffPayout>
  ) {
    setStaffPayouts((current) => {
      const base = current.length > 0 ? current : payoutRows;
      return base.map((payout) =>
        payout.staffId === staffId ? { ...payout, ...patch } : payout
      );
    });
  }

  function handleNext() {
    setErrors({});
    if (step === 1) {
      initializePayouts();
    }
    if (step === 2) {
      if (!Number.isFinite(parsedActualCash)) {
        setErrors({ actualCashCounted: "Enter the actual cash counted." });
        return;
      }
      if (cashStatus !== "balanced" && !reconciliationNotes.trim()) {
        setErrors({
          reconciliationNotes:
            "Add a note whenever cash is short or over.",
        });
        return;
      }
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function handleBack() {
    setErrors({});
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleCloseDay() {
    if (!metrics || !summary) return;

    setIsSubmitting(true);
    setErrors({});

    const result = await closeDay({
      branch,
      date: today,
      metrics,
      staffPayouts: effectivePayouts,
      expectedCash,
      actualCashCounted: parsedActualCash,
      reconciliationNotes,
      closingNotes,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setErrors({
        form: toStaffFacingError(result.errors.form ?? "", {
          ownerName: settings.ownerName,
          context: "close-day",
        }),
      });
      return;
    }

    if (result.record) {
      setCloseSuccessRecord(result.record);
    }
  }

  function handleCloseSuccessDone() {
    setCloseSuccessRecord(undefined);
    onCloseComplete?.();
    router.push(redirectAfterClose);
  }

  const staffName = resolveStaffDisplayName(session, staff);

  if (closeSuccessRecord) {
    return (
      <CloseDaySuccess
        staffName={staffName}
        record={closeSuccessRecord}
        movieRevenue={movieRevenue}
        accessorySales={accessorySales}
        savings={savings}
        onDone={handleCloseSuccessDone}
      />
    );
  }

  async function handleReopen() {
    const result = await reopenDay(branch, today);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setStep(0);
    setStaffPayouts([]);
    setActualCashCounted("");
    setReconciliationNotes("");
    setClosingNotes("");
    setErrors({});
  }

  if (closedRecord) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Today&apos;s Status
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-400">
                CLOSED
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                {getBranchName(branch)} · {today}
              </p>
            </div>
            <div className="text-sm text-zinc-400">
              <p>
                Closed by{" "}
                <span className="text-white">{closedRecord.closedByName}</span>
              </p>
              <p className="mt-1">
                {closedRecord.closedAt
                  ? new Date(closedRecord.closedAt).toLocaleString("en-UG")
                  : "—"}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCard
            label="Total Revenue"
            value={formatCurrency(closedRecord.summary.sales)}
          />
          <MetricCard
            label="Staff Payments"
            value={formatCurrency(closedRecord.summary.staffPayments)}
          />
          <MetricCard
            label="Remaining Cash"
            value={formatCurrency(closedRecord.summary.remainingCash)}
          />
        </div>

        <Card>
          <p className="text-sm text-zinc-400">
            Cash status:{" "}
            <CashStatusBadge status={closedRecord.cashStatus} />
            {closedRecord.cashDifference !== 0 && (
              <span className="ml-2 text-white tabular-nums">
                {formatCurrency(closedRecord.cashDifference)}
              </span>
            )}
          </p>
          {closedRecord.reconciliationNotes && (
            <p className="mt-2 text-sm text-zinc-500">
              {closedRecord.reconciliationNotes}
            </p>
          )}
        </Card>

        {session && canReopenDay(session.role) && (
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={handleReopen}>
              Reopen Day
            </Button>
          </div>
        )}
        {errors.form && (
          <p className="text-sm text-red-400">{errors.form}</p>
        )}
      </div>
    );
  }

  if (!metrics || !branchEntity) {
    return (
      <Card>
        <p className="text-sm text-zinc-500">Select a branch to begin closing.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-sm text-zinc-500">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Total Revenue"
              value={formatCurrency(metrics.todaySales)}
            />
            <MetricCard
              label="Today's Purchases"
              value={formatCurrency(metrics.todayPurchases)}
            />
            <MetricCard
              label="Operating Expenses"
              value={formatCurrency(metrics.todayOperatingExpenses)}
            />
            <MetricCard
              label="Inventory Investment"
              value={formatCurrency(metrics.todayInventoryInvestment)}
            />
            <MetricCard
              label="Staff Payments Recorded"
              value={formatCurrency(metrics.todayStaffPaymentsRecorded)}
            />
            <MetricCard
              label="Cash Before Closing"
              value={formatCurrency(metrics.cashBeforeClosing)}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          {payoutRows.length === 0 ? (
            <Card>
              <p className="text-sm text-zinc-500">
                No active staff members for this branch.
              </p>
            </Card>
          ) : (
            payoutRows.map((payout) => {
              const current =
                effectivePayouts.find((item) => item.staffId === payout.staffId) ??
                payout;

              return (
                <Card key={payout.staffId} className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-white">{current.staffName}</p>
                      <p className="text-sm text-zinc-500">
                        {getStaffRoleName(current.role)} · Daily wage{" "}
                        {formatCurrency(current.dailyWage)}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        checked={current.selected}
                        disabled={current.paidToday}
                        onChange={(event) =>
                          updatePayout(current.staffId, {
                            selected: event.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
                      />
                      Pay today
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">
                        Paid Today
                      </p>
                      <p className="mt-1 text-sm text-white">
                        {current.paidToday ? "Yes" : "No"}
                      </p>
                    </div>
                    <Input
                      label="Amount"
                      type="number"
                      value={String(current.amount)}
                      disabled={!current.selected || current.paidToday}
                      onChange={(event) =>
                        updatePayout(current.staffId, {
                          amount: Number.parseFloat(event.target.value) || 0,
                        })
                      }
                    />
                    <Input
                      label="Notes (optional)"
                      value={current.notes ?? ""}
                      disabled={!current.selected || current.paidToday}
                      onChange={(event) =>
                        updatePayout(current.staffId, {
                          notes: event.target.value,
                        })
                      }
                    />
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MetricCard
            label="Expected Cash"
            value={formatCurrency(expectedCash)}
          />
          <div>
            <Input
              label="Actual Cash Counted"
              type="number"
              value={actualCashCounted}
              onChange={(event) => setActualCashCounted(event.target.value)}
            />
            {errors.actualCashCounted && (
              <p className="mt-1 text-sm text-red-400">
                {errors.actualCashCounted}
              </p>
            )}
          </div>
          <MetricCard
            label="Difference"
            value={formatCurrency(cashDifference)}
          />
          <Card>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Status
            </p>
            <p className="mt-2 text-lg font-semibold">
              <CashStatusBadge status={cashStatus} />
            </p>
          </Card>
          <div className="lg:col-span-2">
            <Textarea
              label="Reconciliation Notes"
              value={reconciliationNotes}
              onChange={(event) => setReconciliationNotes(event.target.value)}
              placeholder="Required when cash is short or over"
            />
            {errors.reconciliationNotes && (
              <p className="mt-1 text-sm text-red-400">
                {errors.reconciliationNotes}
              </p>
            )}
          </div>
        </div>
      )}

      {step === 3 && summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Total Revenue" value={formatCurrency(summary.sales)} />
          <MetricCard
            label="Expenses"
            value={formatCurrency(summary.expenses)}
          />
          <MetricCard
            label="Inventory Investment"
            value={formatCurrency(summary.inventoryInvestment)}
          />
          <MetricCard
            label="Staff Payments"
            value={formatCurrency(summary.staffPayments)}
          />
          <MetricCard
            label="Remaining Cash"
            value={formatCurrency(summary.remainingCash)}
          />
          <MetricCard
            label="Inventory Fund"
            value={formatCurrency(summary.inventoryFund)}
          />
          <MetricCard
            label="Operating Fund"
            value={formatCurrency(summary.operatingFund)}
          />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <Card>
            <p className="text-sm text-zinc-400">
              Confirm closing for{" "}
              <span className="text-white">{getBranchName(branch)}</span> on{" "}
              <span className="text-white">{today}</span>. This will mark the
              day closed and prevent further editing of today&apos;s records.
            </p>
          </Card>
          <Textarea
            label="Closing Notes (optional)"
            value={closingNotes}
            onChange={(event) => setClosingNotes(event.target.value)}
          />
          {errors.form && (
            <p className="text-sm text-red-400">{errors.form}</p>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (step === 0 && onCancel) {
              onCancel();
              return;
            }
            handleBack();
          }}
          disabled={(step === 0 && !onCancel) || isSubmitting}
        >
          {step === 0 && onCancel ? "Back to Today" : "Back"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={handleNext}>
            Continue
          </Button>
        ) : (
          <Button type="button" onClick={handleCloseDay} disabled={isSubmitting}>
            {isSubmitting ? "Closing..." : "Close Day"}
          </Button>
        )}
      </div>
    </div>
  );
}
