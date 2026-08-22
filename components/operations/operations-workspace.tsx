"use client";

import { useState } from "react";
import { useEntryForm } from "@/hooks/use-entry-form";
import { CloseDayWorkspace } from "@/components/operations/close-day-workspace";
import { OperationsClosingPanel } from "@/components/operations/operations-closing-panel";
import { OperationsForm } from "@/components/operations/operations-form";
import { DuplicateEntryDialog } from "@/components/entry/duplicate-entry-dialog";
import type { Branch, Entry } from "@/types";

interface OperationsWorkspaceProps {
  mode: "today" | "historical";
  branch: Branch;
  entry?: Entry;
  initialDate?: string;
  lockDate?: boolean;
}

export function OperationsWorkspace({
  mode,
  branch,
  entry,
  initialDate,
  lockDate = mode === "today",
}: OperationsWorkspaceProps) {
  const [closeFlowActive, setCloseFlowActive] = useState(false);
  const {
    form,
    isSaving,
    status,
    movieRevenue,
    accessorySales,
    totalExpenses,
    staffPayouts,
    balance,
    duplicateEntry,
    updateField,
    handleSubmitRequest,
    handleEditExisting,
    handleCancelDuplicate,
    seedCommonExpenses,
  } = useEntryForm({
    entry,
    initialBranch: branch,
    initialDate: entry?.date ?? initialDate,
    lockDate,
    mode,
    redirectTo: mode === "historical" ? "/history" : undefined,
  });

  if (mode === "today" && closeFlowActive) {
    return (
      <div className="space-y-8">
        <OperationsClosingPanel
          form={form}
          movieRevenue={movieRevenue}
          accessorySales={accessorySales}
          totalExpenses={totalExpenses}
          staffPayouts={staffPayouts}
          netCash={balance}
          updateField={updateField}
        />
        <CloseDayWorkspace
          onCancel={() => setCloseFlowActive(false)}
          onCloseComplete={() => setCloseFlowActive(false)}
          movieRevenue={movieRevenue}
          accessorySales={accessorySales}
          savings={Number.parseFloat(form.savingsAllocation) || 0}
          redirectAfterClose="/operations/today"
        />
      </div>
    );
  }

  return (
    <>
      <OperationsForm
        mode={mode}
        form={form}
        isSaving={isSaving}
        movieRevenue={movieRevenue}
        accessorySales={accessorySales}
        totalExpenses={totalExpenses}
        staffPayouts={staffPayouts}
        netCash={balance}
        status={status}
        lockDate={lockDate}
        seedCommonExpenses={seedCommonExpenses}
        updateField={updateField}
        onSubmit={handleSubmitRequest}
        onCloseDay={
          mode === "today"
            ? () => {
                handleSubmitRequest();
                setCloseFlowActive(true);
              }
            : undefined
        }
      />

      {duplicateEntry && (
        <DuplicateEntryDialog
          entry={duplicateEntry}
          onEditExisting={handleEditExisting}
          onCancel={handleCancelDuplicate}
        />
      )}
    </>
  );
}
