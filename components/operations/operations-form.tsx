"use client";

import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Textarea } from "@/components/shared/ui/textarea";
import { EntryStatusBadge } from "@/components/entry/entry-status-badge";
import { ExpenseList } from "@/components/entry/expense-list";
import { AccessorySalesSection } from "@/components/operations/accessory-sales-section";
import { OperationsClosingPanel } from "@/components/operations/operations-closing-panel";
import type { EntryFormData, EntryStatus } from "@/types";

export type OperationsMode = "today" | "historical";

interface OperationsFormProps {
  mode: OperationsMode;
  form: EntryFormData;
  isSaving: boolean;
  movieRevenue?: number;
  accessorySales?: number;
  totalExpenses?: number;
  staffPayouts?: number;
  netCash?: number;
  status?: EntryStatus;
  lockDate?: boolean;
  seedCommonExpenses?: boolean;
  updateField: <K extends keyof EntryFormData>(
    key: K,
    value: EntryFormData[K]
  ) => void;
  onSubmit: () => void;
  onCloseDay?: () => void;
}

export function OperationsForm({
  mode,
  form,
  isSaving,
  movieRevenue = 0,
  accessorySales = 0,
  totalExpenses = 0,
  staffPayouts = 0,
  netCash = 0,
  status,
  lockDate = false,
  seedCommonExpenses = false,
  updateField,
  onSubmit,
  onCloseDay,
}: OperationsFormProps) {
  const submitLabel = mode === "today" ? "Save Progress" : "Save Record";

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

      <AccessorySalesSection date={form.date} />

      <ExpenseList
        expenses={form.expenses}
        onChange={(expenses) => updateField("expenses", expenses)}
        seedFromTemplates={seedCommonExpenses}
      />

      <Textarea
        label="Daily Notes"
        placeholder="Optional notes for this day"
        value={form.notes}
        onChange={(event) => updateField("notes", event.target.value)}
      />

      {mode === "historical" && (
        <OperationsClosingPanel
          form={form}
          movieRevenue={movieRevenue}
          accessorySales={accessorySales}
          totalExpenses={totalExpenses}
          staffPayouts={staffPayouts}
          netCash={netCash}
          updateField={updateField}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button type="submit" size="lg" disabled={isSaving}>
          {isSaving ? "Saving..." : submitLabel}
        </Button>
        {mode === "today" && onCloseDay && (
          <Button
            type="button"
            size="lg"
            variant="secondary"
            onClick={onCloseDay}
          >
            Close Day
          </Button>
        )}
      </div>
    </form>
  );
}
