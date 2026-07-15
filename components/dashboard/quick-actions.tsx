"use client";

import Link from "next/link";
import { getBranchEntryHref } from "@/lib/entry-helpers";
import type { BranchProgress, Entry } from "@/types";
import { cn } from "@/lib/utils";

interface QuickActionProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "primary";
}

function QuickAction({ href, label, icon, variant = "default" }: QuickActionProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all duration-200 active:scale-[0.98]",
        variant === "primary"
          ? "border-white/20 bg-white text-black shadow-lg shadow-white/10 hover:bg-zinc-100"
          : "border-zinc-800/80 bg-zinc-900/60 text-white hover:bg-zinc-900/80 hover:border-zinc-700"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          variant === "primary" ? "bg-black/5" : "bg-white/5"
        )}
      >
        {icon}
      </span>
      <span className="text-xs font-medium text-center leading-tight">
        {label}
      </span>
    </Link>
  );
}

interface QuickActionsProps {
  progress: BranchProgress[];
  draftEntry?: Entry;
  completedEntry?: Entry;
  allEntriesCompleted: boolean;
}

function NewEntryIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ViewEntryIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function resolvePrimaryEntryAction(
  progress: BranchProgress[],
  draftEntry?: Entry,
  completedEntry?: Entry,
  allEntriesCompleted = false
) {
  if (draftEntry) {
    return {
      href: `/operations/today?branch=${draftEntry.branch}`,
      label: "Today's Operations",
      icon: <NewEntryIcon />,
    };
  }

  if (allEntriesCompleted && completedEntry) {
    return {
      href: `/operations/today?branch=${completedEntry.branch}`,
      label: "Today's Operations",
      icon: <ViewEntryIcon />,
    };
  }

  const nextPending = progress.find((item) => item.status === "pending");
  const target = nextPending ?? progress[0];

  return {
    href: target ? getBranchEntryHref(target) : "/operations/today",
    label: "Today's Operations",
    icon: <NewEntryIcon />,
  };
}

export function QuickActions({
  progress,
  draftEntry,
  completedEntry,
  allEntriesCompleted,
}: QuickActionsProps) {
  const entryAction = resolvePrimaryEntryAction(
    progress,
    draftEntry,
    completedEntry,
    allEntriesCompleted
  );

  return (
    <section>
      <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction
          href={entryAction.href}
          label={entryAction.label}
          variant="primary"
          icon={entryAction.icon}
        />
        <QuickAction
          href="/reports"
          label="Reports"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
        />
        <QuickAction
          href="/operations/historical"
          label="Historical Operations"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <QuickAction
          href="/history"
          label="History"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <QuickAction
          href="/staff"
          label="Staff"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          }
        />
        <QuickAction
          href="/settings"
          label="Settings"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </div>
    </section>
  );
}
