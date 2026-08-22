"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { useStaff } from "@/context/staff-context";
import { getTodayISO } from "@/lib/dates";
import { getShiftCompletedGreeting } from "@/lib/ux/greeting";
import { resolveStaffDisplayName } from "@/lib/ux/user-display";

export function ShiftCompletedPage() {
  const today = getTodayISO();
  const { session } = useAuth();
  const { staff } = useStaff();

  const staffName = useMemo(
    () => resolveStaffDisplayName(session, staff),
    [session, staff]
  );
  const greeting = useMemo(
    () => getShiftCompletedGreeting(staffName, today),
    [staffName, today]
  );

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-8 shadow-2xl shadow-black/30">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <span className="text-xl text-emerald-400">✓</span>
          </div>
          <p className="mt-5 text-xl font-medium text-white">
            {greeting.headline}
          </p>
          <p className="mt-4 text-sm text-zinc-400">{greeting.subtitle}</p>
        </div>
      </div>
    </div>
  );
}
