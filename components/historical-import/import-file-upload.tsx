"use client";

import { useRef } from "react";
import { Card } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";

interface ImportFileUploadProps {
  fileName: string | null;
  onFileSelected: (file: File) => void;
  onReset: () => void;
  disabled?: boolean;
}

export function ImportFileUpload({
  fileName,
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
        Import historical daily operations as JSON. Records are saved using the
        existing Daily Operations entry model.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
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
          Choose JSON File
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

      <pre className="mt-4 overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 text-xs text-zinc-400">
{`{
  "records": [
    {
      "date": "2024-01-15",
      "branch": "kansanga",
      "sales": 150000,
      "expenses": [
        { "name": "Rent", "amount": 50000 },
        { "name": "Lunch", "amount": 3000 }
      ],
      "staffName": "Staff K",
      "notes": "Historical record",
      "savingsAllocation": 97000
    }
  ]
}`}
      </pre>
    </Card>
  );
}
