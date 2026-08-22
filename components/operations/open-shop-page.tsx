"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { PersonalGreeting } from "@/components/shared/ux/personal-greeting";
import { useAuth } from "@/context/auth-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import { canOpenShop } from "@/lib/day-closing/permissions";
import { formatEntryDisplayDate, getTodayISO } from "@/lib/dates";
import { mapAuthRoleToGreetingRole } from "@/lib/ux/greeting";
import { toStaffFacingError } from "@/lib/ux/staff-messages";
import { resolveStaffDisplayName } from "@/lib/ux/user-display";

interface OpenShopPageProps {
  onShiftStarted?: () => void;
  onFlowComplete?: () => void;
}

function formatCurrentTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
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
  const { openDay } = useDayClosing();
  const [now, setNow] = useState(() => new Date());
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const staffName = useMemo(
    () => resolveStaffDisplayName(session, staff),
    [session, staff]
  );
  const greetingRole = session
    ? mapAuthRoleToGreetingRole(session.role)
    : undefined;

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
    setShowSuccess(true);

    window.setTimeout(() => {
      onFlowComplete?.();
    }, 1600);
  }

  if (showSuccess) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-8 text-center shadow-2xl shadow-black/30">
          <p className="text-2xl font-semibold text-emerald-400">🟢 Shift Started</p>
          <p className="mt-4 text-sm text-zinc-400">Have a productive day.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-8 shadow-2xl shadow-black/30">
        <div className="mb-8 text-center">
          <PersonalGreeting
            name={staffName}
            role={greetingRole}
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
