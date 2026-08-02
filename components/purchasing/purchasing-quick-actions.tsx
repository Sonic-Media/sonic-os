"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

function PurchasingQuickAction({
  label,
  icon,
  variant = "default",
  href,
}: {
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "primary";
  href: string;
}) {
  const className = cn(
    "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all duration-200 active:scale-[0.98]",
    variant === "primary"
      ? "border-white/20 bg-white text-black shadow-lg shadow-white/10 hover:bg-zinc-100"
      : "border-zinc-800/80 bg-zinc-900/60 text-white hover:bg-zinc-900/80 hover:border-zinc-700"
  );

  return (
    <Link href={href} className={className}>
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

function NewPurchaseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function PurchasingQuickActions() {
  return (
    <section>
      <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <PurchasingQuickAction
          label="New Purchase"
          variant="primary"
          icon={<NewPurchaseIcon />}
          href="/purchasing/new"
        />
        <PurchasingQuickAction
          label="View History"
          icon={<HistoryIcon />}
          href="/purchasing/history"
        />
      </div>
    </section>
  );
}
