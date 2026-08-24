"use client";

import { useEffect, useMemo, useState } from "react";
import { StaffSectionLabel } from "@/components/operations/staff/primitives";
import {
  formatCountdownParts,
  getCountdownParts,
  getShopScheduleState,
} from "@/lib/operations/opening-hours";
import { cn } from "@/lib/utils";

interface ShopScheduleCountdownProps {
  now: Date;
}

export function ShopScheduleCountdown({ now }: ShopScheduleCountdownProps) {
  const schedule = useMemo(() => getShopScheduleState(now), [now]);
  const countdown = useMemo(
    () => formatCountdownParts(getCountdownParts(now, schedule.targetTime)),
    [now, schedule.targetTime]
  );

  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-4 text-center">
      <StaffSectionLabel>{schedule.countdownLabel}</StaffSectionLabel>
      <p
        key={countdown}
        className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-white transition-opacity duration-200 ease-out animate-in fade-in"
      >
        {countdown}
      </p>
      <p
        className={cn(
          "mt-3 text-sm transition-colors duration-200",
          schedule.phase === "open" ? "text-emerald-400" : "text-amber-300"
        )}
      >
        {schedule.statusMessage}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{schedule.detailMessage}</p>
    </div>
  );
}

export function useShopScheduleNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

export function useShopCanOpenNow(now: Date): boolean {
  return useMemo(() => getShopScheduleState(now).canOpen, [now]);
}
