"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { StaffOperationCard } from "@/components/operations/staff/staff-operation-card";
import {
  StaffSectionLabel,
  StaffStatusBadge,
  StaffSuccessFlash,
} from "@/components/operations/staff/primitives";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { useToast } from "@/context/toast-context";
import { useLinkedStaff } from "@/hooks/use-linked-staff";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { validateMoneyInput } from "@/lib/amounts";
import { formatCurrency } from "@/lib/format";
import { DEFAULT_DAILY_WAGE } from "@/lib/staff/constants";
import type { Branch } from "@/types";

interface StaffDailyWageCardProps {
  branch: Branch;
  date: string;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onRecorded?: () => void;
}

export function StaffDailyWageCard({
  branch,
  date,
  expanded,
  onExpandedChange,
  onRecorded,
}: StaffDailyWageCardProps) {
  const { linkedStaff: loggedInStaff, isLoaded: staffLoaded } =
    useLinkedStaff(branch);
  const { payments, recordStaffPaymentAsync } = useStaffPaymentsModule();

  const existingPayment = useMemo(() => {
    if (!loggedInStaff) return undefined;
    return payments.find(
      (payment) =>
        payment.staffId === loggedInStaff.id &&
        payment.date === date &&
        branchCodesReferToSameInventory(payment.branch, branch) &&
        payment.paymentType !== "deduction"
    );
  }, [loggedInStaff, payments, date, branch]);

  const suggestedAmount = loggedInStaff?.dailyWage ?? DEFAULT_DAILY_WAGE;
  const [amount, setAmount] = useState(
    existingPayment ? String(existingPayment.amount) : String(suggestedAmount)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { success: toastSuccess } = useToast();

  useEffect(() => {
    if (existingPayment) {
      setAmount(String(existingPayment.amount));
      return;
    }
    setAmount(String(suggestedAmount));
  }, [existingPayment, suggestedAmount]);

  async function handleRecordPayment() {
    if (!loggedInStaff || existingPayment || isSaving) return;

    const validation = validateMoneyInput(amount, {
      allowZero: false,
      fieldLabel: "Daily wage",
    });
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = await recordStaffPaymentAsync({
      staffId: loggedInStaff.id,
      date,
      paymentType: "daily-wage",
      paymentMethod: "cash",
      amount: validation.amount,
    });

    setIsSaving(false);

    if (!result.success) {
      setError(
        result.errors.form ?? result.errors.amount ?? "Unable to record wage."
      );
      return;
    }

    setShowSuccess(true);
    toastSuccess("Wage Recorded");
    window.setTimeout(() => setShowSuccess(false), 1200);
    onExpandedChange?.(false);
    onRecorded?.();
  }

  const isRecorded = Boolean(existingPayment);

  return (
    <StaffOperationCard
      accent="default"
      title="Daily Wage"
      description={
        isRecorded
          ? undefined
          : "Record your daily wage before closing the day."
      }
      expanded={isRecorded ? false : expanded}
      onExpandedChange={isRecorded ? undefined : onExpandedChange}
      collapsible={!isRecorded}
      headerAction={<StaffSuccessFlash show={showSuccess} />}
      collapsedPreview={
        isRecorded ? (
          <div className="space-y-1">
            <StaffStatusBadge tone="success">✓ Daily wage recorded</StaffStatusBadge>
            <p className="text-lg font-bold tabular-nums text-white">
              {formatCurrency(existingPayment!.amount)}
            </p>
          </div>
        ) : (
          <span className="text-sm text-zinc-500">Not recorded yet</span>
        )
      }
    >
      {!staffLoaded ? (
        <p className="text-sm text-zinc-500">Loading your profile...</p>
      ) : !loggedInStaff ? (
        <p className="text-sm text-zinc-400">
          No staff profile is linked to your account for this branch.
        </p>
      ) : isRecorded ? (
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] px-5 py-4">
          <StaffStatusBadge tone="success">✓ Daily wage recorded</StaffStatusBadge>
          <p className="mt-3 text-2xl font-bold tabular-nums text-white">
            {formatCurrency(existingPayment!.amount)}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <StaffSectionLabel>Daily Amount</StaffSectionLabel>
          <Input
            label="Daily Wage (UGX)"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="rounded-2xl border-white/[0.08] bg-black/30"
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button
            type="button"
            onClick={() => void handleRecordPayment()}
            loading={isSaving}
            loadingLabel="Recording..."
            disabled={isSaving || isRecorded}
            className="w-full"
          >
            Record Daily Wage
          </Button>
        </div>
      )}
    </StaffOperationCard>
  );
}
