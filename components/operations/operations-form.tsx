"use client";

import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Textarea } from "@/components/shared/ui/textarea";
import { EntryStatusBadge } from "@/components/entry/entry-status-badge";
import { ExpenseList } from "@/components/entry/expense-list";
import { CashSummary } from "@/components/operations/cash-summary";
import type { EntryFormData, EntryStatus } from "@/types";

export type OperationsMode = "today" | "historical";

interface OperationsFormProps {
  mode: OperationsMode;
  form: EntryFormData;
  isSaving: boolean;
  sales: number;
  totalExpenses: number;
  staffPayouts?: number;
  netCash: number;
  status?: EntryStatus;
  lockDate?: boolean;
  seedCommonExpenses?: boolean;
  updateField: <K extends keyof EntryFormData>(
    key: K,
    value: EntryFormData[K]
  ) => void;
  onSubmit: () => void;
}

export function OperationsForm({
  mode,
  form,
  isSaving,
  sales,
  totalExpenses,
  staffPayouts = 0,
  netCash,
  status,
  lockDate = false,
  seedCommonExpenses = false,
  updateField,
  onSubmit,
}: OperationsFormProps) {
  const submitLabel = mode === "today" ? "Close Day" : "Save Record";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-6"
    >
      {status && (
        <div className="flex justify-end">
          <EntryStatusBadge status={status} />
        </div>
      )}

      <Input
        label="Date"
        type="date"
        value={form.date}
        onChange={(event) => updateField("date", event.target.value)}
        disabled={lockDate}
        hint={lockDate ? "Locked to today" : "Select a historical date"}
      />

      <Input
        label="Sales"
        type="number"
        inputMode="numeric"
        placeholder="0"
        value={form.sales}
        onChange={(event) => updateField("sales", event.target.value)}
      />

      <ExpenseList
        expenses={form.expenses}
        onChange={(expenses) => updateField("expenses", expenses)}
        seedFromTemplates={seedCommonExpenses}
      />

      <CashSummary
        sales={sales}
        totalExpenses={totalExpenses}
        staffPayouts={staffPayouts}
        netCash={netCash}
        savingsAllocation={form.savingsAllocation}
        onSavingsAllocationChange={(value) =>
          updateField("savingsAllocation", value)
        }
      />

      <Textarea
        label="Daily Notes"
        placeholder="Optional notes for this day"
        value={form.notes}
        onChange={(event) => updateField("notes", event.target.value)}
      />

      <Button type="submit" size="lg" className="w-full" disabled={isSaving}>
        {isSaving ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
