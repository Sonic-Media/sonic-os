"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { StaffOperationCard } from "@/components/operations/staff/staff-operation-card";
import {
  StaffCollapsedSummary,
  StaffSectionLabel,
  StaffStatusBadge,
  StaffSuccessFlash,
} from "@/components/operations/staff/primitives";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { useLinkedStaff } from "@/hooks/use-linked-staff";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
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

  useEffect(() => {
    if (existingPayment) {
      setAmount(String(existingPayment.amount));
      return;
    }
    setAmount(String(suggestedAmount));
  }, [existingPayment, suggestedAmount]);

  async function handleRecordPayment() {
    if (!loggedInStaff || existingPayment) return;

    setIsSaving(true);
    setError(null);

    const parsedAmount = Number.parseFloat(amount);
    const result = await recordStaffPaymentAsync({
      staffId: loggedInStaff.id,
      date,
      paymentType: "daily-wage",
      paymentMethod: "cash",
      amount: parsedAmount,
    });

    setIsSaving(false);

    if (!result.success) {
      setError(
        result.errors.form ?? result.errors.amount ?? "Unable to record wage."
      );
      return;
    }

    setShowSuccess(true);
    window.setTimeout(() => setShowSuccess(false), 1200);
    onExpandedChange?.(false);
    onRecorded?.();
  }

  const isRecorded = Boolean(existingPayment);

  return (
    <StaffOperationCard
      accent="default"
      title="My Daily Cut"
      description={
        isRecorded
          ? undefined
          : "Record your own daily wage before closing the day."
      }
      expanded={isRecorded ? false : expanded}
      onExpandedChange={isRecorded ? undefined : onExpandedChange}
      collapsible={!isRecorded}
      headerAction={<StaffSuccessFlash show={showSuccess} />}
      collapsedPreview={
        isRecorded ? (
          <div className="flex flex-wrap items-center gap-3">
            <StaffCollapsedSummary
              primary={formatCurrency(existingPayment!.amount)}
            />
            <StaffStatusBadge tone="success">✓ Recorded</StaffStatusBadge>
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
            disabled={isSaving}
            className="w-full rounded-2xl transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_24px_-6px_rgba(255,255,255,0.25)]"
          >
            {isSaving ? "Recording..." : "Record Daily Cut"}
          </Button>
        </div>
      )}
    </StaffOperationCard>
  );
}
