"use client";

import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Textarea } from "@/components/shared/ui/textarea";
import { EntryStatusBadge } from "@/components/entry/entry-status-badge";
import { EntrySummary } from "@/components/entry/entry-summary";
import { ExpenseList } from "@/components/entry/expense-list";
import type { EntryFormData, EntryStatus } from "@/types";

interface EntryFormProps {
  form: EntryFormData;
  isSaving: boolean;
  sales: number;
  totalExpenses: number;
  balance: number;
  submitLabel: string;
  status?: EntryStatus;
  lockBranch?: boolean;
  seedCommonExpenses?: boolean;
  updateField: <K extends keyof EntryFormData>(
    key: K,
    value: EntryFormData[K]
  ) => void;
  onSubmit: () => void;
}

export function EntryForm({
  form,
  isSaving,
  sales,
  totalExpenses,
  balance,
  submitLabel,
  status,
  lockBranch = false,
  seedCommonExpenses = false,
  updateField,
  onSubmit,
}: EntryFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
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
        label="Sales Amount (UGX)"
        type="number"
        inputMode="numeric"
        placeholder="0"
        value={form.sales}
        onChange={(e) => updateField("sales", e.target.value)}
      />

      <ExpenseList
        expenses={form.expenses}
        onChange={(expenses) => updateField("expenses", expenses)}
        seedFromTemplates={seedCommonExpenses}
      />

      <EntrySummary
        sales={sales}
        totalExpenses={totalExpenses}
        balance={balance}
      />

      <Textarea
        label="Notes"
        placeholder="Optional"
        value={form.notes}
        onChange={(e) => updateField("notes", e.target.value)}
      />

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSaving}
      >
        {isSaving ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
