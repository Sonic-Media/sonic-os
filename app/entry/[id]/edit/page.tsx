"use client";

import { useParams } from "next/navigation";
import { EntryForm } from "@/components/entry/entry-form";
import { DuplicateEntryDialog } from "@/components/entry/duplicate-entry-dialog";
import { EntryNotFound } from "@/components/shared/entry-not-found";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useEntryForm } from "@/hooks/use-entry-form";
import { useEntriesContext } from "@/context/entries-context";
import type { Entry } from "@/types";

function EditEntryForm({ entry }: { entry: Entry }) {
  const {
    form,
    isSaving,
    status,
    isDraftEdit,
    lockBranch,
    sales,
    totalExpenses,
    balance,
    duplicateEntry,
    updateField,
    handleSave,
    handleEditExisting,
    handleCancelDuplicate,
  } = useEntryForm({
    entry,
    redirectTo: entry.status === "draft" ? "/" : "/history",
  });

  return (
    <>
      <EntryForm
        form={form}
        isSaving={isSaving}
        sales={sales}
        totalExpenses={totalExpenses}
        balance={balance}
        submitLabel={isDraftEdit ? "Save Entry" : "Save Changes"}
        status={status}
        seedCommonExpenses={false}
        lockBranch={lockBranch}
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

export default function EditEntryPage() {
  const params = useParams();
  const id = params.id as string;
  const { entries, isLoaded } = useEntriesContext();
  const entry = entries.find((item) => item.id === id);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  if (!entry) {
    return <EntryNotFound />;
  }

  return (
    <PageContainer>
      <PageHeader
        title={entry.status === "draft" ? "Continue Entry" : "Edit Entry"}
        subtitle={
          entry.status === "draft"
            ? "Finish today's sales and expenses"
            : "Update saved sales and expenses"
        }
      />
      <EditEntryForm entry={entry} />
    </PageContainer>
  );
}
