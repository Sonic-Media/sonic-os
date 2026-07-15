"use client";

import { useEntryForm } from "@/hooks/use-entry-form";
import { EntryForm } from "@/components/entry/entry-form";
import { DuplicateEntryDialog } from "@/components/entry/duplicate-entry-dialog";
import type { Branch } from "@/types";

interface NewEntryFormProps {
  branch: Branch;
}

export function NewEntryForm({ branch }: NewEntryFormProps) {
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
  } = useEntryForm({ initialBranch: branch });

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
