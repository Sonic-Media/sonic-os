"use client";

import { useEntryForm } from "@/hooks/use-entry-form";
import { EntryForm } from "@/components/entry/entry-form";
import { DuplicateEntryDialog } from "@/components/entry/duplicate-entry-dialog";
import { useActiveBranch } from "@/context/active-branch-context";

export function NewEntryForm() {
  const { activeBranch } = useActiveBranch();
  const {
    form,
    isSaving,
    status,
    sales,
    totalExpenses,
    balance,
    duplicateEntry,
    updateField,
    handleSave,
    handleEditExisting,
    handleCancelDuplicate,
  } = useEntryForm({ initialBranch: activeBranch });

  return (
    <>
      <EntryForm
        form={form}
        isSaving={isSaving}
        sales={sales}
        totalExpenses={totalExpenses}
        balance={balance}
        submitLabel="Save Entry"
        status={status}
        seedCommonExpenses
        updateField={updateField}
        onSubmit={handleSave}
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
