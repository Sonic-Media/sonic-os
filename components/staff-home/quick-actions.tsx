"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  onAddExpense?: () => void;
  showStock?: boolean;
  className?: string;
}

export function QuickActions({
  onAddExpense,
  showStock = true,
  className,
}: QuickActionsProps) {
  const actions: QuickActionItem[] = [
    {
      id: "expense",
      title: "Add Expense",
      description: "Record a business expense",
      onClick: onAddExpense,
    },
    {
      id: "sales",
      title: "View Today's Sales",
      description: "See all today's transactions",
      href: "/sales",
    },
  ];

  if (showStock) {
    actions.push({
      id: "stock",
      title: "View Stock",
      description: "Check inventory availability",
      href: "/stock",
    });
  }

  return (
    <section className={cn("space-y-4", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Quick Actions
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {actions.map((action) => {
          const content = (
            <>
              <p className="text-sm font-semibold text-white">{action.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                {action.description}
              </p>
            </>
          );

          const sharedClass = cn(
            "rounded-2xl border border-white/[0.08] bg-[rgba(12,14,24,0.75)] px-4 py-4 text-left transition-all duration-200",
            "hover:border-white/[0.14] hover:bg-[rgba(18,20,32,0.9)]"
          );

          if (action.href) {
            return (
              <Link key={action.id} href={action.href} className={sharedClass}>
                {content}
              </Link>
            );
          }

          return (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              className={sharedClass}
            >
              {content}
            </button>
          );
        })}
      </div>
    </section>
  );
}
