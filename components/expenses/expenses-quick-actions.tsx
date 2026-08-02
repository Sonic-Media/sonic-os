"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

function ExpensesQuickAction({
  label,
  icon,
  variant = "default",
  href,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "primary";
  href?: string;
  onClick?: () => void;
}) {
  const className = cn(
    "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all duration-200 active:scale-[0.98]",
    variant === "primary"
      ? "border-white/20 bg-white text-black shadow-lg shadow-white/10 hover:bg-zinc-100"
      : "border-zinc-800/80 bg-zinc-900/60 text-white hover:bg-zinc-900/80 hover:border-zinc-700"
  );

  const content = (
    <>
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
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}

export function ExpensesQuickActions({
  onNewExpense,
}: {
  onNewExpense?: () => void;
}) {
  return (
    <section>
      <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <ExpensesQuickAction
          label="New Expense"
          variant="primary"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          }
          onClick={onNewExpense}
        />
        <ExpensesQuickAction
          label="Cash Flow"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          href="/expenses/cash-flow"
        />
      </div>
    </section>
  );
}
