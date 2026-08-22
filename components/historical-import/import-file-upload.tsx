"use client";

import { useRef } from "react";
import { Card } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
interface ImportFileUploadProps {
  fileName: string | null;
  branchName: string;
  onFileSelected: (file: File) => void;
  onReset: () => void;
  disabled?: boolean;
}

export function ImportFileUpload({
  fileName,
  branchName,
  onFileSelected,
  onReset,
  disabled = false,
}: ImportFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    onFileSelected(file);
    event.target.value = "";
  }

  return (
    <Card>
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Upload File
      </h3>
      <p className="mb-4 text-sm text-zinc-400">
        Import historical daily ledger spreadsheets (.xlsx) into{" "}
        {branchName}. Every row is validated and previewed before
        anything is saved.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json,.json"
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Choose Ledger File
        </Button>
        {fileName && (
          <div className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3">
            <span className="truncate text-sm text-white">{fileName}</span>
            <Button type="button" variant="ghost" onClick={onReset} disabled={disabled}>
              Clear
            </Button>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Expected columns: Date, Total Sales (UGX), Lunch/Food, Home, Rent,
        Transport, Other (label), Other (UGX), Total Exp (UGX), Total Bal (UGX),
        Note.
      </p>
    </Card>
  );
}
