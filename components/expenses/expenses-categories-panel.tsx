"use client";

import Link from "next/link";
import { uiSurface } from "@/lib/ui/design-tokens";
import type { ExpenseCategory } from "@/types/expenses-module";
import { cn } from "@/lib/utils";

interface ExpensesCategoriesPanelProps {
  categories: ExpenseCategory[];
}

export function ExpensesCategoriesPanel({
  categories,
}: ExpensesCategoriesPanelProps) {
  return (
    <aside className={cn(uiSurface.card, "overflow-hidden p-0")}>
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Expense Categories</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Categories used when recording expenses
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">
          No categories configured yet.
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between gap-3 px-5 py-3.5"
            >
              <span className="font-medium text-white">{category.name}</span>
              <span className="text-xs text-zinc-500">
                {category.isDefault ? "Default" : "Custom"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-white/[0.06] px-5 py-4">
        <Link
          href="/settings/expense-settings"
          className="text-xs font-medium text-orange-400 transition-colors hover:text-orange-300"
        >
          Manage categories
        </Link>
      </div>
    </aside>
  );
}
