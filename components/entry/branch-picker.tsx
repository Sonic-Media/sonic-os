"use client";

import { BRANCHES } from "@/lib/constants";
import type { Branch } from "@/types";
import { cn } from "@/lib/utils";

interface BranchPickerProps {
  value: Branch;
  onChange: (branch: Branch) => void;
  disabled?: boolean;
}

export function BranchPicker({ value, onChange, disabled = false }: BranchPickerProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-400">Branch</label>
      <div className="grid grid-cols-2 gap-3">
        {BRANCHES.map((branch) => (
          <button
            key={branch.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(branch.id)}
            className={cn(
              "h-12 rounded-xl border text-sm font-medium transition-all duration-200",
              disabled && "cursor-not-allowed opacity-60",
              value === branch.id
                ? "border-white bg-white text-black"
                : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-600"
            )}
          >
            {branch.name}
          </button>
        ))}
      </div>
    </div>
  );
}
