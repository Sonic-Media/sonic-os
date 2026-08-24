"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface SalesQuickActionsProps {
  showHistoryLink?: boolean;
}

function SalesQuickAction({
  label,
  icon,
  href,
}: {
  label: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all duration-200 active:scale-[0.98]",
        "border-zinc-800/80 bg-zinc-900/60 text-white hover:bg-zinc-900/80 hover:border-zinc-700"
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
        {icon}
      </span>
      <span className="text-xs font-medium text-center leading-tight">{label}</span>
    </Link>
  );
}

function HistoryIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function OperationsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
    </svg>
  );
}

export function SalesQuickActions({
  showHistoryLink = true,
}: SalesQuickActionsProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Quick Links
      </h2>
      <div
        className={
          showHistoryLink
            ? "grid grid-cols-2 gap-3 sm:max-w-md"
            : "grid grid-cols-1 gap-3 sm:max-w-xs"
        }
      >
        <SalesQuickAction
          label="Today's Operations"
          icon={<OperationsIcon />}
          href="/operations/today"
        />
        {showHistoryLink ? (
          <SalesQuickAction
            label="View History"
            icon={<HistoryIcon />}
            href="/sales/history"
          />
        ) : null}
      </div>
    </section>
  );
}
