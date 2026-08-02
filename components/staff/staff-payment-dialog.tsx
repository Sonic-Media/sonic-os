"use client";

import { useMemo, useState } from "react";
import { StockDialog, StockFieldError } from "@/components/stock/stock-dialog";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { Textarea } from "@/components/shared/ui/textarea";
import { useBranches } from "@/context/branches-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { useStaff } from "@/context/staff-context";
import { getTodayISO } from "@/lib/dates";
import {
  EXPENSE_PAYMENT_METHODS,
  STAFF_PAYMENT_TYPES,
} from "@/lib/expenses-module/constants";
import { getStaffRoleName } from "@/lib/staff/roles";
import type { ExpensePaymentMethod } from "@/types/expenses-module";
import type { Staff } from "@/types";
import type { StaffPaymentType } from "@/types/staff-payment";

interface StaffPaymentDialogProps {
  staff?: Staff;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StaffPaymentDialog({
  staff,
  onClose,
  onSuccess,
}: StaffPaymentDialogProps) {
  const { recordStaffPayment } = useStaffPaymentsModule();
  const { activeStaff } = useStaff();
  const { getBranchName } = useBranches();

  const [staffId, setStaffId] = useState(staff?.id ?? "");
  const [date, setDate] = useState(getTodayISO());
  const [paymentType, setPaymentType] = useState<StaffPaymentType | "">(
    "daily-wage"
  );
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod | "">(
    "cash"
  );
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const selectedStaff = activeStaff.find((member) => member.id === staffId);

  const staffOptions = useMemo(
    () =>
      activeStaff.map((member) => ({
        value: member.id,
        label: `${member.name} (${getBranchName(member.branch)})`,
      })),
    [activeStaff, getBranchName]
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsedAmount = Number.parseFloat(amount);
    const result = recordStaffPayment({
      staffId,
      date,
      paymentType: paymentType as StaffPaymentType,
      amount: parsedAmount,
      paymentMethod: paymentMethod as ExpensePaymentMethod,
      notes,
    });

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    onSuccess?.();
    onClose();
  }

  return (
    <StockDialog
      title="Pay Staff"
      description="Creates a linked expense record for cash flow and reports."
      onClose={onClose}
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="staff-payment-form">
            Pay Staff
          </Button>
        </div>
      }
    >
      <form id="staff-payment-form" className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Select
            label="Staff Member"
            value={staffId}
            placeholder="Select staff member"
            options={staffOptions}
            onChange={(event) => {
              setStaffId(event.target.value);
              setErrors((current) => ({ ...current, staffId: undefined }));
            }}
            disabled={Boolean(staff)}
          />
          <StockFieldError message={errors.staffId} />
        </div>

        {selectedStaff && (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3 text-sm">
            <p className="text-zinc-400">
              Branch:{" "}
              <span className="text-white">
                {getBranchName(selectedStaff.branch)}
              </span>
            </p>
            <p className="mt-1 text-zinc-400">
              Role:{" "}
              <span className="text-white">
                {getStaffRoleName(selectedStaff.role)}
              </span>
            </p>
          </div>
        )}

        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <StockFieldError message={errors.date} />

        <Select
          label="Payment Type"
          value={paymentType}
          options={STAFF_PAYMENT_TYPES.map((item) => ({
            value: item.id,
            label: item.label,
          }))}
          onChange={(event) =>
            setPaymentType(event.target.value as StaffPaymentType)
          }
        />
        <StockFieldError message={errors.paymentType} />

        <Input
          label="Amount (UGX)"
          type="number"
          min="0"
          step="1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <StockFieldError message={errors.amount} />

        <Select
          label="Payment Method"
          value={paymentMethod}
          options={EXPENSE_PAYMENT_METHODS.map((method) => ({
            value: method.id,
            label: method.label,
          }))}
          onChange={(event) =>
            setPaymentMethod(event.target.value as ExpensePaymentMethod)
          }
        />
        <StockFieldError message={errors.paymentMethod} />

        <Textarea
          label="Notes (optional)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        <StockFieldError message={errors.form} />
      </form>
    </StockDialog>
  );
}
