"use client";

import { ExpensesCategoriesPanel } from "@/components/expenses/expenses-categories-panel";
import { ExpensesPageFilters } from "@/components/expenses/expenses-page-filters";
import { ExpensesPageKpis } from "@/components/expenses/expenses-page-kpis";
import { ExpensesPremiumTable } from "@/components/expenses/expenses-premium-table";
import { ExpensesSubnav } from "@/components/expenses/expenses-subnav";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useExpensesDialogs } from "@/hooks/use-expenses-dialogs";
import { useExpensesPage } from "@/hooks/use-expenses-page";
import { useExpensesModule } from "@/context/expenses-module-context";
import { filterSelectableExpenseCategories } from "@/lib/expenses-module/constants";
import { useMemo } from "react";

export function ExpensesWorkspace() {
  const {
    isLoaded,
    categories,
    filteredExpenses,
    kpis,
    dateFilter,
    setDateFilter,
    customRange,
    updateCustomRange,
    search,
    setSearch,
  } = useExpensesPage();
  const { deleteExpense } = useExpensesModule();
  const { openAddExpense, openEditExpense, renderDialogs } = useExpensesDialogs();

  const displayCategories = useMemo(
    () => filterSelectableExpenseCategories(categories),
    [categories]
  );

  async function handleDelete(expenseId: string, description: string) {
    const confirmed = window.confirm(
      `Delete expense "${description}"? This cannot be undone.`
    );
    if (!confirmed) return;

    const result = await deleteExpense(expenseId);
    if (!result.success) {
      window.alert(result.errors.form ?? "Unable to delete expense.");
    }
  }

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer className="space-y-6 pb-10">
      <PageHeader
        title="Expenses"
        subtitle="Track and manage all business expenses"
        showBranchBadge
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" onClick={openAddExpense}>
          + Add Expense
        </Button>
      </div>

      <ExpensesSubnav />

      <ExpensesPageKpis
        totalExpenses={kpis.totalExpenses}
        numberOfExpenses={kpis.numberOfExpenses}
        largestExpense={kpis.largestExpense}
        averageExpense={kpis.averageExpense}
      />

      <ExpensesPageFilters
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        customRange={customRange}
        onCustomRangeChange={updateCustomRange}
        search={search}
        onSearchChange={setSearch}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)] xl:items-start">
        <ExpensesPremiumTable
          expenses={filteredExpenses}
          onEdit={openEditExpense}
          onDelete={(expense) => handleDelete(expense.id, expense.description)}
        />
        <ExpensesCategoriesPanel categories={displayCategories} />
      </div>

      {renderDialogs()}
    </PageContainer>
  );
}
