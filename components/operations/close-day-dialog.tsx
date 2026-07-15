"use client";

import { Button } from "@/components/shared/ui/button";

interface CloseDayDialogProps {
  branchName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CloseDayDialog({
  branchName,
  onConfirm,
  onCancel,
}: CloseDayDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Cancel close day"
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Close day confirmation"
        className="relative w-full max-w-md rounded-2xl border border-zinc-800/80 bg-zinc-950 p-6 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-white">Close Day?</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          This will finalize today&apos;s operations for {branchName}. The entry
          will become read-only and update analytics, reports, and history.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Close Day
          </Button>
        </div>
      </div>
    </div>
  );
}
