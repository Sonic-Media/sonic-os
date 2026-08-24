"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { ShiftGreeting } from "@/components/shared/ux/shift-greeting";
import {
  StaffCard,
  StaffMetricTile,
} from "@/components/operations/staff/primitives";
import {
  ShopScheduleCountdown,
  useShopCanOpenNow,
  useShopScheduleNow,
} from "@/components/operations/shop-schedule-countdown";
import { useAuth } from "@/context/auth-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import { useStaffAttendance } from "@/hooks/use-staff-attendance";
import { useTodayISO } from "@/hooks/use-today-iso";
import { useToast } from "@/context/toast-context";
import { canOpenShop } from "@/lib/day-closing/permissions";
import { formatEntryDisplayDate } from "@/lib/dates";
import {
  formatClockTime,
  recordStaffClockIn,
  recordStaffStartShiftAttendance,
} from "@/lib/staff/attendance";
import {
  formatGreetingTime,
  getDaysSinceLastShift,
  getStartShiftSuccessLine,
} from "@/lib/ux/greeting";
import { toStaffFacingError } from "@/lib/ux/staff-messages";
import { resolveStaffDisplayName } from "@/lib/ux/user-display";
import { cn } from "@/lib/utils";

type ShiftGateMode = "start-shift" | "clock-in";

interface OpenShopPageProps {
  mode?: ShiftGateMode;
}

function formatCurrentTime(date: Date): string {
  return formatGreetingTime(date);
}

export function OpenShopPage({
  mode = "start-shift",
}: OpenShopPageProps) {
  const today = useTodayISO();
  const { session } = useAuth();
  const { activeBranch } = useActiveBranch();
  const { getBranchName, settings } = useSettings();
  const { staff } = useStaff();
  const { closings, openDay } = useDayClosing();
  const { currentAttendance } = useStaffAttendance(today);
  const { success: toastSuccess } = useToast();
  const now = useShopScheduleNow();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const staffName = useMemo(
    () => resolveStaffDisplayName(session, staff),
    [session, staff]
  );
  const daysSinceLastShift = useMemo(
    () => getDaysSinceLastShift(closings, activeBranch, today),
    [closings, activeBranch, today]
  );
  const successLine = useMemo(
    () =>
      mode === "start-shift"
        ? getStartShiftSuccessLine(staffName, today)
        : `${staffName}, you are now on shift.`,
    [mode, staffName, today]
  );

  const canStart = session ? canOpenShop(session.role) : false;
  const isStartShift = mode === "start-shift";
  const canOpenNow = useShopCanOpenNow(now);
  const scheduleAllowsOpen = isStartShift ? canOpenNow : true;
  const actionLabel = isStartShift ? "Open Shop" : "Clock In";
  const isOnShift = currentAttendance?.presence === "on-shift";

  async function handleSubmit() {
    if (!canStart || isSubmitting || !scheduleAllowsOpen) return;

    setIsSubmitting(true);
    setError(undefined);

    try {
      if (isStartShift) {
        const result = await openDay(activeBranch, today);

        if (!result.success) {
          setError(
            toStaffFacingError(result.errors.form ?? "", {
              ownerName: settings.ownerName,
              context: "start-shift",
            })
          );
          return;
        }

        const attendanceRecord = recordStaffStartShiftAttendance(activeBranch);
        if (!attendanceRecord) {
          setError(
            "The branch opened, but we couldn't start your attendance session. Please try Clock In again."
          );
          return;
        }
        toastSuccess("Shop Opened");
        return;
      }

      const clockInRecord = recordStaffClockIn(activeBranch);
      if (!clockInRecord) {
        setError(
          "We couldn't record your clock-in. Please sign out and back in, then try again."
        );
        return;
      }
      toastSuccess("Clocked In");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isOnShift) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center py-10">
        <StaffCard accent="revenue" className="w-full text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <span className="text-2xl text-emerald-400">✓</span>
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-white">
            {isStartShift ? "Shop Opened" : "Clocked In"}
          </h2>
          <p className="mt-3 text-sm text-zinc-400">{successLine}</p>
          <p className="mt-6 text-sm text-zinc-500">
            Opening Today&apos;s Operations...
          </p>
        </StaffCard>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center py-10">
      <StaffCard accent="hero" hero className="w-full">
        <div className="mb-8 text-center">
          <ShiftGreeting
            displayName={staffName}
            date={now}
            dateKey={today}
            daysSinceLastShift={isStartShift ? daysSinceLastShift : undefined}
            context={isStartShift ? "start-shift" : "clock-in"}
            align="center"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <StaffMetricTile
            label="Branch"
            value={getBranchName(activeBranch)}
          />
          <StaffMetricTile label="Staff" value={staffName} />
          <StaffMetricTile
            label="Date"
            value={formatEntryDisplayDate(today)}
          />
          <StaffMetricTile
            label="Current Time"
            value={formatCurrentTime(now)}
          />
        </div>

        <div className="mt-5">
          {!isStartShift ? (
            <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] px-4 py-4 text-center">
              <p className="text-sm text-emerald-300">
                The branch is already open. Clock in to start your session.
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Last check: {formatClockTime(now.toISOString())}
              </p>
            </div>
          ) : (
            <ShopScheduleCountdown now={now} />
          )}
        </div>

        {error ? (
          <p className="mt-5 whitespace-pre-line text-center text-sm text-red-400">
            {error}
          </p>
        ) : null}

        <div className="mt-8">
          <Button
            type="button"
            size="lg"
            className={cn(
              "h-14 w-full rounded-2xl text-base font-semibold",
              isStartShift
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-[0_16px_40px_-16px_rgba(16,185,129,0.7)] hover:from-emerald-500 hover:to-teal-500"
                : ""
            )}
            disabled={!canStart || isSubmitting || !scheduleAllowsOpen}
            loading={isSubmitting}
            loadingLabel={isStartShift ? "Opening shop..." : "Clocking in..."}
            onClick={() => void handleSubmit()}
          >
            {actionLabel}
          </Button>
        </div>
      </StaffCard>
    </div>
  );
}
