"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { cn } from "@/lib/utils";

interface RestoreFromFileSectionProps {
  disabled?: boolean;
  isRestoring: boolean;
  onFileSelected: (file: File) => void;
}

function isAcceptedBackupFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".json.gz") ||
    name.endsWith(".json") ||
    (name.endsWith(".gz") && name.includes("json"))
  );
}

export function RestoreFromFileSection({
  disabled = false,
  isRestoring,
  onFileSelected,
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

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Restore From File
      </p>
      <p className="text-sm text-zinc-400">
        Have a backup file from another device? Restore it here.
      </p>

      <div
        className={cn(
          "rounded-2xl border border-dashed px-4 py-8 text-center transition-colors",
          dragActive
            ? "border-violet-400/50 bg-violet-500/10"
            : "border-white/[0.12] bg-black/20",
          (disabled || isRestoring) && "opacity-60"
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
        <p className="text-sm font-medium text-white">
          Drag and drop a backup file here
        </p>
        <p className="mt-1 text-xs text-zinc-500">Accepts .json.gz and .json</p>
        <div className="mt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || isRestoring}
            loading={isRestoring}
            loadingLabel="Restoring..."
            onClick={() => inputRef.current?.click()}
          >
            Choose File
          </Button>
        </div>
        <input
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
