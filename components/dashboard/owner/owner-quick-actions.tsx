"use client";

import Link from "next/link";
import { getBranchEntryHref } from "@/lib/entry-helpers";
import { OwnerCard, OwnerSectionTitle } from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";
import type { BranchProgress, Entry } from "@/types";

interface OwnerQuickActionsProps {
  progress: BranchProgress[];
  draftEntry?: Entry;
  completedEntry?: Entry;
  allEntriesCompleted: boolean;
}

function resolveOperationsHref(
  progress: BranchProgress[],
  draftEntry?: Entry,
  completedEntry?: Entry,
  allEntriesCompleted = false
) {
  if (draftEntry) {
    return `/operations/today?branch=${draftEntry.branch}`;
  }

  if (allEntriesCompleted && completedEntry) {
    return `/operations/today?branch=${completedEntry.branch}`;
  }

  const nextPending = progress.find((item) => item.status === "pending");
  const target = nextPending ?? progress[0];
  return target ? getBranchEntryHref(target) : "/operations/today";
}

export function OwnerQuickActions({
  progress,
  draftEntry,
  completedEntry,
  allEntriesCompleted,
}: OwnerQuickActionsProps) {
  const operationsHref = resolveOperationsHref(
    progress,
    draftEntry,
    completedEntry,
    allEntriesCompleted
  );

  const actions = [
    {
      label: "Record Revenue",
      description: "Log movie revenue for today's branch.",
      icon: "🎬",
      primary: true,
    },
    {
      label: "Accessory Sale",
      description: "Record accessory sales during today's shift.",
      icon: "🛍️",
    },
    {
      label: "Expense",
      description: "Capture operating expenses for today.",
      icon: "💸",
    },
    {
      label: "Purchase",
      description: "Log inventory purchases for today.",
      icon: "📦",
    },
    {
      label: "Close Day",
      description: "Review and close today's operations.",
      icon: "🌙",
    },
  ];

  return (
    <OwnerCard>
      <OwnerSectionTitle>Today&apos;s Operations</OwnerSectionTitle>
      <p className="mt-2 text-sm text-zinc-500">
        All operational records are captured in one place.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={operationsHref}
            className={cn(
              "group rounded-3xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-32px_rgba(0,0,0,0.8)]",
              action.primary
                ? "border-white/15 bg-white text-black shadow-[0_20px_60px_-30px_rgba(255,255,255,0.55)] hover:bg-zinc-100"
                : "border-white/[0.06] bg-zinc-900/40 text-white hover:border-white/10 hover:bg-zinc-900/70"
            )}
          >
            <div className="flex items-start gap-4">
              <span
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-transform duration-300 group-hover:scale-105",
                  action.primary ? "bg-black/5" : "bg-white/5"
                )}
              >
                {action.icon}
              </span>
              <div>
                <p className="text-base font-semibold">{action.label}</p>
                <p
                  className={cn(
                    "mt-1 text-sm leading-relaxed",
                    action.primary ? "text-zinc-700" : "text-zinc-400"
                  )}
                >
                  {action.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </OwnerCard>
  );
}
