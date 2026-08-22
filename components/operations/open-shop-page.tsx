"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { ShiftGreeting } from "@/components/shared/ux/shift-greeting";
import { useAuth } from "@/context/auth-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import { canOpenShop } from "@/lib/day-closing/permissions";
import { formatEntryDisplayDate, getTodayISO } from "@/lib/dates";
import {
  formatGreetingTime,
  getDaysSinceLastShift,
  getStartShiftSuccessLine,
} from "@/lib/ux/greeting";
import { toStaffFacingError } from "@/lib/ux/staff-messages";
import { resolveStaffDisplayName } from "@/lib/ux/user-display";
import type { DayClosingRecord } from "@/types/day-closing";

interface OpenShopPageProps {
  onShiftStarted?: () => void;
  onFlowComplete?: () => void;
}

function formatCurrentTime(date: Date): string {
  return formatGreetingTime(date);
}

export function OpenShopPage({
  onShiftStarted,
  onFlowComplete,
}: OpenShopPageProps) {
  const today = getTodayISO();
  const { session } = useAuth();
  const { activeBranch } = useActiveBranch();
  const { getBranchName, settings } = useSettings();
  const { staff } = useStaff();
  const { closings, openDay } = useDayClosing();
  const [now, setNow] = useState(() => new Date());
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [openedRecord, setOpenedRecord] = useState<DayClosingRecord | null>(
    null
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const staffName = useMemo(
    () => resolveStaffDisplayName(session, staff),
    [session, staff]
  );
  const daysSinceLastShift = useMemo(
    () => getDaysSinceLastShift(closings, activeBranch, today),
    [closings, activeBranch, today]
  );
  const successLine = useMemo(
    () => getStartShiftSuccessLine(staffName, today),
    [staffName, today]
  );

  const canOpen = session ? canOpenShop(session.role) : false;

  async function handleStartShift() {
    if (!canOpen) return;

    setIsOpening(true);
    setError(undefined);

    const result = await openDay(activeBranch, today);
    setIsOpening(false);

    if (!result.success) {
      setError(
        toStaffFacingError(result.errors.form ?? "", {
          ownerName: settings.ownerName,
          context: "start-shift",
        })
      );
      return;
    }

    onShiftStarted?.();
    setOpenedRecord(result.record ?? null);
  }

  function handleContinue() {
    onFlowComplete?.();
  }

  if (openedRecord) {
    const openedAt = openedRecord.openedAt ?? openedRecord.reopenedAt;

    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-8 shadow-2xl shadow-black/30">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <span className="text-2xl text-emerald-400">✓</span>
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-white">
              Shift Started
            </h2>
            <p className="mt-3 text-sm text-zinc-400">{successLine}</p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Opened at
              </p>
              <p className="mt-1 text-base font-medium text-white tabular-nums">
                {openedAt ? formatGreetingTime(openedAt) : formatCurrentTime(now)}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Branch
              </p>
              <p className="mt-1 text-base font-medium text-white">
                {getBranchName(activeBranch)}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={handleContinue}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-8 shadow-2xl shadow-black/30">
        <div className="mb-8">
          <ShiftGreeting
            displayName={staffName}
            date={now}
            dateKey={today}
            daysSinceLastShift={daysSinceLastShift}
            context="start-shift"
            align="center"
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Branch</p>
            <p className="mt-1 text-base font-medium text-white">
              {getBranchName(activeBranch)}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Staff Name
            </p>
            <p className="mt-1 text-base font-medium text-white">{staffName}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Date</p>
              <p className="mt-1 text-base font-medium text-white">
                {formatEntryDisplayDate(today)}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Current Time
              </p>
              <p className="mt-1 text-base font-medium text-white tabular-nums">
                {formatCurrentTime(now)}
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-4 whitespace-pre-line text-sm text-red-400">{error}</p>
        ) : null}

        <div className="mt-8">
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!canOpen || isOpening}
            onClick={handleStartShift}
          >
            {isOpening ? "Starting..." : "Start Shift"}
          </Button>
        </div>
      </div>
    </div>
  );
}
