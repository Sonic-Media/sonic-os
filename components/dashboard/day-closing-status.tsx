"use client";

import { Card } from "@/components/shared/ui/card";
import { useBranches } from "@/context/branches-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { getTodayISO } from "@/lib/dates";
import type { DayClosingStatusInfo } from "@/types/day-closing";
import { cn } from "@/lib/utils";

interface DayClosingStatusCardProps {
  statuses: DayClosingStatusInfo[];
  className?: string;
}

function formatClosedAt(value?: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-UG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DayClosingStatusCard({
  statuses,
  className,
}: DayClosingStatusCardProps) {
  const allClosed =
    statuses.length > 0 && statuses.every((item) => item.status === "closed");
  const latestClosed = statuses
    .filter((item) => item.status === "closed" && item.closedAt)
    .sort((left, right) =>
      (right.closedAt ?? "").localeCompare(left.closedAt ?? "")
    )[0];

  return (
    <Card className={cn(className)}>
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Today&apos;s Status
      </h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Status
          </span>
          <span
            className={cn(
              "text-sm font-semibold",
              allClosed ? "text-emerald-400" : "text-amber-400"
            )}
          >
            {allClosed ? "CLOSED" : "OPEN"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Last Closed
          </span>
          <span className="text-sm font-semibold text-white">
            {formatClosedAt(latestClosed?.closedAt)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Closed By
          </span>
          <span className="text-sm font-semibold text-white">
            {latestClosed?.closedByName ?? "—"}
          </span>
        </div>
      </div>

      {statuses.length > 1 && (
        <div className="mt-4 space-y-2 border-t border-zinc-800/80 pt-4">
          {statuses.map((item) => (
            <div
              key={item.branch}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-zinc-400">{item.branchName}</span>
              <span
                className={
                  item.status === "closed" ? "text-emerald-400" : "text-amber-400"
                }
              >
                {item.status === "closed" ? "Closed" : "Open"}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function DayClosingStatusCardContainer({
  className,
}: {
  className?: string;
}) {
  const { activeBranches } = useBranches();
  const { activeBranch } = useActiveBranch();
  const { getBranchStatusInfo, isLoaded } = useDayClosing();
  const today = getTodayISO();

  if (!isLoaded) return null;

  const branchEntity = activeBranches.find(
    (branch) => branch.code === activeBranch
  );
  const statuses = branchEntity
    ? [getBranchStatusInfo(branchEntity, today)]
    : [];

  return <DayClosingStatusCard statuses={statuses} className={className} />;
}
