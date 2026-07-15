"use client";

import { useEntryForm } from "@/hooks/use-entry-form";
import { CloseDayDialog } from "@/components/operations/close-day-dialog";
import { OperationsForm } from "@/components/operations/operations-form";
import { DuplicateEntryDialog } from "@/components/entry/duplicate-entry-dialog";
import { useSettings } from "@/context/settings-context";
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
  const { getBranchName } = useSettings();
  const {
    form,
    isSaving,
    status,
    sales,
    totalExpenses,
    balance,
    duplicateEntry,
    showCloseDayDialog,
    updateField,
    handleSubmitRequest,
    handleConfirmCloseDay,
    handleCancelCloseDay,
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

  return (
    <>
      <OperationsForm
        mode={mode}
        form={form}
        isSaving={isSaving}
        sales={sales}
        totalExpenses={totalExpenses}
        netCash={balance}
        status={status}
        lockDate={lockDate}
        seedCommonExpenses={seedCommonExpenses}
        updateField={updateField}
        onSubmit={handleSubmitRequest}
      />

      {showCloseDayDialog && (
        <CloseDayDialog
          branchName={getBranchName(form.branch)}
          onConfirm={handleConfirmCloseDay}
          onCancel={handleCancelCloseDay}
        />
      )}

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
