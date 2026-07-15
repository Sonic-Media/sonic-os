"use client";

import { Button } from "@/components/shared/ui/button";
import { formatEntryDisplayDate } from "@/lib/dates";
import { useSettings } from "@/context/settings-context";
import type { Entry } from "@/types";

interface DuplicateEntryDialogProps {
  entry: Entry;
  onEditExisting: () => void;
  onCancel: () => void;
}

export function DuplicateEntryDialog({
  entry,
  onEditExisting,
  onCancel,
}: DuplicateEntryDialogProps) {
  const { getBranchName } = useSettings();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-800/80 bg-zinc-950 p-5 shadow-2xl shadow-black/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-entry-title"
      >
        <h2
          id="duplicate-entry-title"
          className="text-base font-semibold text-white"
        >
          Entry Already Completed
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {getBranchName(entry.branch)} already has a completed entry for{" "}
          {formatEntryDisplayDate(entry.date)}.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button type="button" onClick={onEditExisting}>
            Edit Existing
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
