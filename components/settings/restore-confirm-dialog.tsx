"use client";

import { Button } from "@/components/shared/ui/button";
import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

interface RestoreConfirmDialogProps {
  backupLabel: string;
  isRestoring: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RestoreConfirmDialog({
  backupLabel,
  isRestoring,
  onConfirm,
  onCancel,
}: RestoreConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Cancel restore"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        disabled={isRestoring}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-confirm-title"
        className={cn(uiSurface.modal, "relative w-full max-w-md p-6 sm:p-7")}
      >
        <h3
          id="restore-confirm-title"
          className="text-xl font-semibold tracking-tight text-white"
        >
          Restore backup?
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          This will replace your current Sonic OS data with the data from{" "}
          <span className="font-medium text-zinc-200">{backupLabel}</span>. A
          safety backup of your current data will be created first.
        </p>

        <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.08] px-4 py-3">
          <p className="text-sm leading-relaxed text-amber-100/90">
            You can undo this by restoring the automatic{" "}
            <span className="font-medium text-amber-50">
              Pre-Restore Safety Backup
            </span>{" "}
            afterward.
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isRestoring}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            loading={isRestoring}
            loadingLabel="Restoring..."
            disabled={isRestoring}
          >
            Restore Backup
          </Button>
        </div>
      </div>
    </div>
  );
}
