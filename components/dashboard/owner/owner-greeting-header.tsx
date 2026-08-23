"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useBranches } from "@/context/branches-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import { getRotatingShiftGreeting } from "@/lib/ux/greeting";
import { getTodayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  OwnerCard,
  ownerSectionTitleClass,
} from "@/components/dashboard/owner/primitives";

interface OwnerGreetingHeaderProps {
  greeting: string;
  subtitle?: string;
  date: string;
  displayName: string;
}

function formatLongDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function OwnerGreetingHeader({
  greeting,
  subtitle,
  date,
  displayName,
}: OwnerGreetingHeaderProps) {
  const today = getTodayISO();
  const { activeBranch } = useActiveBranch();
  const { getBranchName } = useSettings();
  const { activeBranches } = useBranches();
  const { getBranchStatusInfo, isBranchDayClosed, isBranchDayOpened, isLoaded } =
    useDayClosing();
  const { staff } = useStaff();

  const rotatingGreeting = useMemo(
    () =>
      getRotatingShiftGreeting({
        displayName,
        dateKey: today,
        context: "owner-dashboard",
      }),
    [displayName, today]
  );

  const branchName = getBranchName(activeBranch);
  const branchEntity = activeBranches.find((branch) => branch.code === activeBranch);
  const branchStatus = branchEntity
    ? getBranchStatusInfo(branchEntity, today)
    : undefined;
  const isClosed = isBranchDayClosed(activeBranch, today);
  const isOpen = isBranchDayOpened(activeBranch, today);
  const businessStatus = isClosed
    ? "Business Closed"
    : isOpen
      ? "Business Open"
      : "Awaiting Shift Start";
  const statusTone = isClosed
    ? "text-zinc-400"
    : isOpen
      ? "text-emerald-400"
      : "text-amber-400";
  const statusDot = isClosed ? "bg-zinc-500" : isOpen ? "bg-emerald-400" : "bg-amber-400";
  return (
    <OwnerCard className="overflow-hidden p-0">
      <div className="border-b border-white/[0.05] px-6 py-5 sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
          Sonic OS
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {rotatingGreeting.headline}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          {subtitle ?? rotatingGreeting.subtitle}
        </p>
      </div>

      <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:px-8">
        <div>
          <p className={ownerSectionTitleClass}>Current Branch</p>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={cn("h-2.5 w-2.5 rounded-full shadow-[0_0_12px_currentColor]", statusDot)}
            />
            <p className="text-base font-medium text-white">{branchName}</p>
          </div>
          {isLoaded ? (
            <p className={cn("mt-1 text-sm font-medium", statusTone)}>
              {businessStatus}
            </p>
          ) : null}
        </div>

        <div>
          <p className={ownerSectionTitleClass}>Today</p>
          <p className="mt-3 text-base font-medium text-white">{formatLongDate()}</p>
          <p className="mt-1 text-sm text-zinc-500">{date}</p>
        </div>

        <div>
          <p className={ownerSectionTitleClass}>Operations</p>
          <p className="mt-3 text-base font-medium text-white">
            {staff.filter((member) => member.active).length} active staff
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {branchStatus?.openedAt
              ? `Opened ${new Date(branchStatus.openedAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : "No shift started yet"}
          </p>
        </div>
      </div>
    </OwnerCard>
  );
}

