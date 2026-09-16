"use client";

import { useEffect, useMemo, useState } from "react";
import { StaffSectionLabel } from "@/components/operations/staff/primitives";
import { getShopScheduleState } from "@/lib/operations/opening-hours";
import { cn } from "@/lib/utils";

interface ShopScheduleCountdownProps {
  /** Kept for layout compatibility; schedule is not time-gated. */
  now?: Date;
}

export function ShopScheduleCountdown({ now }: ShopScheduleCountdownProps) {
  const schedule = useMemo(
    () => getShopScheduleState(now ?? new Date()),
    [now]
  );

  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-4 text-center">
      <StaffSectionLabel>READY TO OPEN</StaffSectionLabel>
      <p
        className={cn(
          "mt-3 text-sm leading-relaxed transition-colors duration-200 text-emerald-400"
        )}
      >
        {schedule.statusMessage}
      </p>
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

export function useShopCanOpenNow(_now: Date): boolean {
  return true;
}
