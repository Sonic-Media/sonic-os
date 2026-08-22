"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { useSettings } from "@/context/settings-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { useLinkedStaff } from "@/hooks/use-linked-staff";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { formatCurrency } from "@/lib/format";
import { getStaffRoleName } from "@/lib/staff/roles";
import { DEFAULT_DAILY_WAGE } from "@/lib/staff/constants";
import type { Branch } from "@/types";

interface StaffPaymentSectionProps {
  branch: Branch;
  date: string;
  readOnly?: boolean;
}

export function StaffPaymentSection({
  branch,
  date,
  readOnly = false,
}: StaffPaymentSectionProps) {
  const { linkedStaff: loggedInStaff, isLoaded: staffLoaded } =
    useLinkedStaff(branch);
  const { getBranchName } = useSettings();
  const {
    payments,
    recordStaffPaymentAsync,
  } = useStaffPaymentsModule();

  const branchPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          branchCodesReferToSameInventory(payment.branch, branch) &&
          payment.date === date
      ),
    [payments, branch, date]
  );

  const existingPayment = useMemo(
    () =>
      loggedInStaff
        ? branchPayments.find(
            (payment) =>
              payment.staffId === loggedInStaff.id &&
              payment.paymentType !== "deduction"
          )
        : undefined,
    [branchPayments, loggedInStaff]
  );

  const suggestedAmount = loggedInStaff?.dailyWage ?? DEFAULT_DAILY_WAGE;
  const [amount, setAmount] = useState(
    existingPayment ? String(existingPayment.amount) : String(suggestedAmount)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingPayment) {
      setAmount(String(existingPayment.amount));
      return;
    }

    setAmount(String(suggestedAmount));
  }, [existingPayment, suggestedAmount]);

  async function handleRecordPayment() {
    if (!loggedInStaff || readOnly || existingPayment) return;

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
      setError(result.errors.form ?? result.errors.amount ?? "Unable to record payment.");
      return;
    }
  }

  const otherPayments = branchPayments.filter(
    (payment) => payment.staffId !== loggedInStaff?.id
  );

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
        Staff Payment
      </h3>

      {!staffLoaded ? (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
          <p className="text-sm text-zinc-500">Loading staff profile...</p>
        </div>
      ) : !loggedInStaff ? (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
          <p className="text-sm text-zinc-400">
            No staff profile is linked to your account for this branch.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-white">{loggedInStaff.name}</p>
            <p className="mt-1 text-sm text-zinc-500">
              {getStaffRoleName(loggedInStaff.role)} ·{" "}
              {getBranchName(loggedInStaff.branch)}
            </p>
          </div>

          {existingPayment ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Recorded Today
              </p>
              <p className="text-lg font-semibold text-white">
                {formatCurrency(existingPayment.amount)}
              </p>
              {existingPayment.paidBy?.staffName ? (
                <p className="text-sm text-zinc-500">
                  Recorded by {existingPayment.paidBy.staffName}
                </p>
              ) : null}
            </div>
          ) : readOnly ? (
            <p className="text-sm text-zinc-500">No payment recorded.</p>
          ) : (
            <>
              <Input
                label="Daily Payment (UGX)"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              {error ? (
                <p className="text-sm text-red-400">{error}</p>
              ) : null}
              <Button
                type="button"
                onClick={() => void handleRecordPayment()}
                disabled={isSaving}
              >
                {isSaving ? "Recording..." : "Record Payment"}
              </Button>
            </>
          )}
        </div>
      )}

      {otherPayments.length > 0 ? (
        <div className="space-y-2">
          {otherPayments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {payment.staffName}
                </p>
                <p className="text-xs text-zinc-500">Staff payment</p>
              </div>
              <span className="text-sm font-semibold text-white">
                {formatCurrency(payment.amount)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
