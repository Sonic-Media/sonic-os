"use client";

import { useMemo } from "react";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { useActiveBranch } from "@/context/active-branch-context";
import { useSettings } from "@/context/settings-context";
import { getTodayISO } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import {
  getCloseDayFarewell,
  getCloseDayHeadline,
} from "@/lib/ux/greeting";
import type { DayClosingRecord } from "@/types/day-closing";

interface CloseDaySuccessProps {
  staffName: string;
  record: DayClosingRecord;
  movieRevenue: number;
  accessorySales: number;
  onDone: () => void;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800/80 py-3 last:border-b-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-semibold text-white tabular-nums">{value}</span>
    </div>
  );
}

export function CloseDaySuccess({
  staffName,
  record,
  movieRevenue,
  accessorySales,
  onDone,
}: CloseDaySuccessProps) {
  const today = getTodayISO();
  const { activeBranch } = useActiveBranch();
  const { getBranchName } = useSettings();

  const headline = useMemo(() => getCloseDayHeadline(today), [today]);
  const farewell = useMemo(
    () => getCloseDayFarewell(staffName, today),
    [staffName, today]
  );

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <p className="text-3xl">🎉</p>
          <h2 className="mt-4 text-2xl font-semibold text-white">{headline}</h2>
          <p className="mt-3 text-sm text-emerald-400">
            Branch Closed Successfully
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {getBranchName(activeBranch)}
          </p>
        </div>

        <Card className="px-5 py-2">
          <SummaryRow
            label="Movie Revenue"
            value={formatCurrency(movieRevenue)}
          />
          <SummaryRow
            label="Accessory Sales"
            value={formatCurrency(accessorySales)}
          />
          <SummaryRow
            label="Expenses"
            value={formatCurrency(record.summary.expenses)}
          />
          <SummaryRow
            label="Remaining Cash"
            value={formatCurrency(record.summary.remainingCash)}
          />
        </Card>

        <div className="space-y-4 text-center">
          <p className="text-sm text-zinc-400">{farewell}</p>
          <Button type="button" size="lg" className="w-full" onClick={onDone}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
