"use client";

import { Input } from "@/components/shared/ui/input";
import { formatEntryDisplayDate } from "@/lib/dates";

interface ReportsDatePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function ReportsDatePicker({ value, onChange }: ReportsDatePickerProps) {
  return (
    <div className="space-y-1">
      <Input
        label="Date"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="text-xs text-zinc-500">
        Business date: {formatEntryDisplayDate(value)}
      </p>
    </div>
  );
}
