"use client";

import { useMemo } from "react";
import { getRotatingShiftGreeting } from "@/lib/ux/greeting";
import { cn } from "@/lib/utils";

interface ShiftGreetingProps {
  displayName: string;
  date?: Date;
  dateKey?: string;
  daysSinceLastShift?: number | null;
  context?: string;
  align?: "left" | "center";
  className?: string;
}

export function ShiftGreeting({
  displayName,
  date,
  dateKey,
  daysSinceLastShift,
  context = "start-shift",
  align = "center",
  className,
}: ShiftGreetingProps) {
  const greeting = useMemo(
    () =>
      getRotatingShiftGreeting({
        displayName,
        date,
        dateKey,
        daysSinceLastShift,
        context,
      }),
    [displayName, date, dateKey, daysSinceLastShift, context]
  );

  return (
    <div className={cn(align === "center" && "text-center", className)}>
      <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {greeting.headline}
      </h1>
      <p className="mt-3 text-sm text-zinc-400">{greeting.subtitle}</p>
    </div>
  );
}
