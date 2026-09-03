"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Textarea } from "@/components/shared/ui/textarea";
import { EntryStatusBadge } from "@/components/entry/entry-status-badge";
import { ExpenseList } from "@/components/entry/expense-list";
import { AccessorySalesSection } from "@/components/operations/accessory-sales-section";
import { CashSummary } from "@/components/operations/cash-summary";
import { OperationsClosingPanel } from "@/components/operations/operations-closing-panel";
import { HistoricalStaffPaymentSection } from "@/components/operations/historical-staff-payment-section";
import { StaffPaymentSection } from "@/components/operations/staff-payment-section";
import type { EntryFormData, EntryStatus } from "@/types";

export type OperationsMode = "today" | "historical";

interface OperationsFormProps {
  mode: OperationsMode;
  form: EntryFormData;
  isSaving: boolean;
  saveError?: string | null;
  lastSavedAt?: number | null;
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
  saveError,
  lastSavedAt,
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
  const [, setSavedPulseTick] = useState(0);
  const savedRecently =
    typeof lastSavedAt === "number" && Date.now() - lastSavedAt < 2500;
  const savedAtLabel =
    typeof lastSavedAt === "number"
      ? new Date(lastSavedAt).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : null;

  useEffect(() => {
    if (!lastSavedAt) return;
    const timeout = window.setTimeout(() => {
      setSavedPulseTick((tick) => tick + 1);
    }, 2500);
    return () => window.clearTimeout(timeout);
  }, [lastSavedAt]);

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

      {mode === "today" && (
        <>
          <AccessorySalesSection date={form.date} />

          <ExpenseList
            expenses={form.expenses}
            onChange={(expenses) => updateField("expenses", expenses)}
            seedFromTemplates={seedCommonExpenses}
          />

          <StaffPaymentSection branch={form.branch} date={form.date} />

          <CashSummary
            movieRevenue={movieRevenue}
            accessorySales={accessorySales}
            totalExpenses={totalExpenses}
            staffPayouts={staffPayouts}
            netCash={netCash}
            savingsAllocation={form.savingsAllocation}
            onSavingsAllocationChange={(value) =>
              updateField("savingsAllocation", value)
            }
          />
        </>
      )}

      {mode === "historical" && (
        <>
          <Input
            label="Movie Revenue"
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={form.sales}
            onChange={(event) => updateField("sales", event.target.value)}
            hint="Enter total movie ticket revenue for this day"
          />

          <AccessorySalesSection date={form.date} />

          <ExpenseList
            expenses={form.expenses}
            onChange={(expenses) => updateField("expenses", expenses)}
            seedFromTemplates={seedCommonExpenses}
          />

          <HistoricalStaffPaymentSection branch={form.branch} date={form.date} />
        </>
      )}

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
          showStaffPayment={false}
          updateField={updateField}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {saveError ? (
          <p className="sm:col-span-2 text-sm text-red-400">{saveError}</p>
        ) : lastSavedAt ? (
          <p className="sm:col-span-2 text-sm text-emerald-400">
            Progress saved{savedAtLabel ? ` at ${savedAtLabel}` : ""}.
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={isSaving}>
          {isSaving ? "Saving..." : savedRecently ? "Saved!" : submitLabel}
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
