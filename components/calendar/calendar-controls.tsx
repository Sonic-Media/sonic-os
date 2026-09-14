"use client";

import type { CalendarViewMode } from "@/hooks/use-calendar-page";
import { cn } from "@/lib/utils";

interface CalendarControlsProps {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  periodLabel: string;
  onPrevious: () => void;
  onNext: () => void;
}

const VIEW_OPTIONS: { id: CalendarViewMode; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
];

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 shrink-0 rounded-xl px-3.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/15 text-white ring-1 ring-indigo-500/30"
          : "border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200"
      )}
    >
      {children}
    </button>
  );
}

export function CalendarControls({
  viewMode,
  onViewModeChange,
  periodLabel,
  onPrevious,
  onNext,
}: CalendarControlsProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {VIEW_OPTIONS.map((option) => (
          <FilterChip
            key={option.id}
            active={viewMode === option.id}
            onClick={() => onViewModeChange(option.id)}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          className="inline-flex h-9 items-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/[0.12] hover:text-white"
        >
          Previous
        </button>
        <div className="min-w-[180px] flex-1 text-center text-sm font-semibold text-white sm:text-base">
          {periodLabel}
        </div>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-9 items-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/[0.12] hover:text-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}
