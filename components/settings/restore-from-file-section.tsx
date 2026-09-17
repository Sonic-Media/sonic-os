"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { cn } from "@/lib/utils";

interface RestoreFromFileSectionProps {
  disabled?: boolean;
  isRestoring: boolean;
  onFileSelected: (file: File) => void;
  /** Expose the file picker so the Data Protection CTA can open it. */
  inputId?: string;
}

function isAcceptedBackupFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".json.gz") ||
    name.endsWith(".json") ||
    (name.endsWith(".gz") && name.includes("json"))
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

export function RestoreFromFileSection({
  disabled = false,
  isRestoring,
  onFileSelected,
  inputId = "restore-from-file-input",
}: RestoreFromFileSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      setLocalError(null);
      const file = files?.[0];
      if (!file) return;

      if (!isAcceptedBackupFile(file)) {
        setLocalError("Please choose a .json or .json.gz Sonic OS backup file.");
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected]
  );

  function openPicker() {
    if (disabled || isRestoring) return;
    inputRef.current?.click();
  }

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Restore From File
        </p>
        <p className="mt-1.5 text-sm text-zinc-400">
          Have a backup file from another device? You can restore it here.
        </p>
      </div>

      <div
        role="button"
        tabIndex={disabled || isRestoring ? -1 : 0}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
        className={cn(
          "flex min-w-0 cursor-pointer flex-col gap-4 rounded-2xl border border-dashed px-4 py-5 transition-colors sm:flex-row sm:items-center sm:justify-between sm:px-5",
          dragActive
            ? "border-violet-400/50 bg-violet-500/10"
            : "border-white/[0.12] bg-black/20 hover:border-white/[0.18]",
          (disabled || isRestoring) && "cursor-not-allowed opacity-60"
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!disabled && !isRestoring) setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!disabled && !isRestoring) setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragActive(false);
          if (disabled || isRestoring) return;
          handleFiles(event.dataTransfer.files);
        }}
      >
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20">
            <UploadIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">Select a backup file</p>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
              Drag and drop a .json.gz file here, or click to browse.
            </p>
          </div>
        </div>

        <Button
          type="button"
          className="w-full shrink-0 sm:w-auto"
          disabled={disabled || isRestoring}
          loading={isRestoring}
          loadingLabel="Restoring..."
          onClick={(event) => {
            event.stopPropagation();
            openPicker();
          }}
        >
          Choose File
        </Button>

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept=".json,.json.gz,application/gzip,application/json"
          className="hidden"
          disabled={disabled || isRestoring}
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {localError ? (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {localError}
        </p>
      ) : null}
    </div>
  );
}
