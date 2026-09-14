"use client";

import { AnimatedMoney } from "@/components/dashboard/owner/primitives";
import {
  formatExpensesCount,
  formatExpensesCurrency,
} from "@/lib/expenses-module/format";
import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";
import type { ExpensesPageKpis } from "@/hooks/use-expenses-page";

interface ExpensesPageKpisProps extends ExpensesPageKpis {}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent: "blue" | "green" | "purple" | "orange";
}) {
  const border = {
    blue: "border-blue-500/15",
    green: "border-emerald-500/15",
    purple: "border-violet-500/15",
    orange: "border-orange-500/15",
  }[accent];

  return (
    <div className={cn(uiSurface.card, "p-5", border)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

export function ExpensesPageKpis({
  totalExpenses,
  numberOfExpenses,
  largestExpense,
  averageExpense,
}: ExpensesPageKpisProps) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Total Expenses"
        value={
          <AnimatedMoney
            value={totalExpenses}
            className="text-2xl font-semibold"
          />
        }
        accent="orange"
      />
      <KpiCard
        label="Number of Expenses"
        value={formatExpensesCount(numberOfExpenses)}
        accent="purple"
      />
      <KpiCard
        label="Largest Expense"
        value={formatExpensesCurrency(largestExpense)}
        accent="green"
      />
      <KpiCard
        label="Average Expense"
        value={formatExpensesCurrency(averageExpense)}
        accent="blue"
      />
    </section>
  );
}
