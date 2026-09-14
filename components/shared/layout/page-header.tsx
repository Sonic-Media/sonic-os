"use client";

import { useEffect, useMemo, useState } from "react";
import { BranchBadge } from "@/components/shared/layout/branch-badge";
import { UserAccountMenu } from "@/components/shared/layout/user-account-menu";
import { useActiveBranch } from "@/context/active-branch-context";
import { useAuth } from "@/context/auth-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useTodayISO } from "@/hooks/use-today-iso";
import { uiTypography } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
  showBranchBadge?: boolean;
  showMeta?: boolean;
}

function formatClockTime(date: Date): string {
  return date.toLocaleTimeString("en-UG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatBusinessDateLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PageHeader({
  title,
  subtitle,
  children,
  className,
  showBranchBadge = false,
  showMeta = true,
}: PageHeaderProps) {
  const { session } = useAuth();
  const { activeBranch } = useActiveBranch();
  const { getActiveOpenRecord, isLoaded: closingLoaded } = useDayClosing();
  const calendarToday = useTodayISO();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const businessDate = useMemo(() => {
    if (!closingLoaded) return calendarToday;
    const openRecord = getActiveOpenRecord(activeBranch);
    return openRecord?.date ?? calendarToday;
  }, [activeBranch, calendarToday, closingLoaded, getActiveOpenRecord]);

  return (
    <header className={cn("mb-8", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {title ? (
            <div className="flex flex-wrap items-center gap-3">
              <h1 className={uiTypography.pageTitle}>{title}</h1>
              {showBranchBadge ? <BranchBadge /> : null}
            </div>
          ) : null}
          {subtitle ? (
            <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
          ) : null}
        </div>

        {showMeta && session ? (
          <div className="flex shrink-0 items-center gap-4 lg:gap-5">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium tabular-nums text-white">
                {formatClockTime(now)}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Business day · {formatBusinessDateLabel(businessDate)}
              </p>
            </div>
            <div className="hidden lg:block">
              <UserAccountMenu compact />
            </div>
          </div>
        ) : null}
      </div>
      {children}
    </header>
  );
}
