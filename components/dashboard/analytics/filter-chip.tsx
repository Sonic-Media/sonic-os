"use client";

import { cn } from "@/lib/utils";

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function FilterChip({ label, isActive, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "h-9 shrink-0 rounded-full border px-4 text-xs font-medium tracking-wide transition-[border-color,background-color,color,box-shadow] duration-200",
        isActive
          ? "border-white/30 bg-white text-black shadow-md shadow-white/10"
          : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
      )}
    >
      {label}
    </button>
  );
}

interface FilterChipRowProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterChipRow({ children, className }: FilterChipRowProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
    </div>
  );
}
