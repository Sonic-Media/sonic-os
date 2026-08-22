"use client";

import { Input } from "@/components/shared/ui/input";
import { AccessorySalesSection } from "@/components/operations/accessory-sales-section";
import { CashSummary } from "@/components/operations/cash-summary";
import { StaffPaymentSection } from "@/components/operations/staff-payment-section";
import { formatCurrency } from "@/lib/format";
import type { EntryFormData } from "@/types";

interface OperationsClosingPanelProps {
  form: EntryFormData;
  movieRevenue: number;
  accessorySales: number;
  totalExpenses: number;
  staffPayouts: number;
  netCash: number;
  readOnly?: boolean;
  updateField: <K extends keyof EntryFormData>(
    key: K,
    value: EntryFormData[K]
  ) => void;
}

export function OperationsClosingPanel({
  form,
  movieRevenue,
  accessorySales,
  totalExpenses,
  staffPayouts,
  netCash,
  readOnly = false,
  updateField,
}: OperationsClosingPanelProps) {
  return (
    <div className="space-y-6">
      {readOnly ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
          <p className="text-sm text-zinc-500">Movie Revenue</p>
          <p className="text-2xl font-semibold text-white">
            {formatCurrency(movieRevenue)}
          </p>
        </div>
      ) : (
        <Input
          label="Movie Revenue"
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={form.sales}
          onChange={(event) => updateField("sales", event.target.value)}
          hint="Enter today's total movie ticket revenue"
        />
      )}

      <AccessorySalesSection date={form.date} readOnly />

      <StaffPaymentSection
        branch={form.branch}
        date={form.date}
        readOnly={readOnly}
      />

      <CashSummary
        movieRevenue={movieRevenue}
        accessorySales={accessorySales}
        totalExpenses={totalExpenses}
        staffPayouts={staffPayouts}
        netCash={netCash}
        savingsAllocation={form.savingsAllocation}
        onSavingsAllocationChange={
          readOnly
            ? undefined
            : (value) => updateField("savingsAllocation", value)
        }
        readOnly={readOnly}
      />
    </div>
  );
}
