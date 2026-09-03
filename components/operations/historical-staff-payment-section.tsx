"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { StaffPicker } from "@/components/entry/staff-picker";
import { useSettings } from "@/context/settings-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { useStaff } from "@/context/staff-context";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { formatCurrency } from "@/lib/format";
import { getTodayISO } from "@/lib/dates";
import { DEFAULT_DAILY_WAGE } from "@/lib/staff/constants";
import type { Branch } from "@/types";

interface HistoricalStaffPaymentSectionProps {
  branch: Branch;
  date: string;
}

export function HistoricalStaffPaymentSection({
  branch,
  date,
}: HistoricalStaffPaymentSectionProps) {
  const { getBranchName } = useSettings();
  const { getStaffById } = useStaff();
  const { payments, recordStaffPaymentAsync } = useStaffPaymentsModule();

  const [staffId, setStaffId] = useState("");
  const [amount, setAmount] = useState(String(DEFAULT_DAILY_WAGE));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStaff = staffId ? getStaffById(staffId) : undefined;

  const existingPayment = useMemo(
    () =>
      staffId
        ? payments.find(
            (payment) =>
              payment.staffId === staffId &&
              branchCodesReferToSameInventory(payment.branch, branch) &&
              payment.date === date &&
              payment.paymentType !== "deduction"
          )
        : undefined,
    [payments, staffId, branch, date]
  );

  useEffect(() => {
    if (existingPayment) {
      setAmount(String(existingPayment.amount));
      return;
    }

    const wage = selectedStaff?.dailyWage ?? DEFAULT_DAILY_WAGE;
    setAmount(String(wage));
  }, [existingPayment, selectedStaff]);

  async function handleRecordPayment() {
    if (!staffId || existingPayment) return;

    setIsSaving(true);
    setError(null);

    const parsedAmount = Number.parseFloat(amount);
    const result = await recordStaffPaymentAsync({
      staffId,
      date,
      branch,
      paymentType: "daily-wage",
      paymentMethod: "cash",
      amount: parsedAmount,
    });

    setIsSaving(false);

    if (!result.success) {
      setError(
        result.errors.form ??
          result.errors.amount ??
          result.errors.staffId ??
          "Unable to record staff cut."
      );
    }
  }

  if (date === getTodayISO()) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Staff Cut
      </h3>

      <div className="space-y-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-4">
        <p className="text-sm text-zinc-400">
          Record {selectedStaff?.name ?? "staff"}&apos;s pay for this historical
          day at {getBranchName(branch)}. It will appear in their profile.
        </p>

        <StaffPicker branch={branch} value={staffId} onChange={setStaffId} />

        {existingPayment ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Recorded for this date
            </p>
            <p className="text-lg font-semibold text-white">
              {formatCurrency(existingPayment.amount)}
            </p>
          </div>
        ) : (
          <>
            <Input
              label="Staff Cut (UGX)"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={!staffId}
            />
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button
              type="button"
              onClick={() => void handleRecordPayment()}
              disabled={isSaving || !staffId}
            >
              {isSaving ? "Recording..." : "Record Staff Cut"}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
