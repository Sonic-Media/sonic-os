"use client";

import { useMemo, useState } from "react";
import { ExpenseHistoryFilters } from "@/components/expenses/expense-history-filters";
import { ExpenseHistoryTable } from "@/components/expenses/expense-history-table";
import { ExpensesSubnav } from "@/components/expenses/expenses-subnav";
import { HistoricalExpenseGateDialog } from "@/components/expenses/historical-expense-gate-dialog";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { useExpensesHistory } from "@/hooks/use-expenses-history";
import { useExpensesDialogs } from "@/hooks/use-expenses-dialogs";
import { useExpensesModule } from "@/context/expenses-module-context";
import { filterSelectableExpenseCategories } from "@/lib/expenses-module/constants";

export default function ExpensesHistoryPage() {
  const { criteria, expenses, updateCriteria } = useExpensesHistory();
  const { categories, deleteExpense } = useExpensesModule();
  const { openAddHistoricalExpense, openEditExpense, renderDialogs } =
    useExpensesDialogs();
  const [showHistoricalGate, setShowHistoricalGate] = useState(false);

  const categoryOptions = useMemo(
    () =>
      filterSelectableExpenseCategories(categories).map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [categories]
  );

  function handleDelete(expenseId: string, description: string) {
    const confirmed = window.confirm(
      `Delete expense "${description}"? This cannot be undone.`
    );
    if (confirmed) {
      deleteExpense(expenseId);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Expense History"
        subtitle="Master history of every expense recorded across the business"
      />

      <div className="mb-6 flex justify-end">
        <Button type="button" onClick={() => setShowHistoricalGate(true)}>
          Add Historical Expense
        </Button>
      </div>

      <ExpensesSubnav />

      <div className="lg:grid lg:grid-cols-[minmax(280px,320px)_1fr] lg:gap-8 lg:items-start">
        <ExpenseHistoryFilters
          criteria={criteria}
          onCriteriaChange={updateCriteria}
          categoryOptions={categoryOptions}
          className="lg:sticky lg:top-8 lg:mb-0"
        />

        <ExpenseHistoryTable
          expenses={expenses}
          onEdit={openEditExpense}
          onDelete={(expense) => handleDelete(expense.id, expense.description)}
        />
      </div>

      <HistoricalExpenseGateDialog
        open={showHistoricalGate}
        onClose={() => setShowHistoricalGate(false)}
        onConfirm={() => {
          setShowHistoricalGate(false);
          openAddHistoricalExpense();
        }}
      />

      {renderDialogs()}
    </PageContainer>
  );
}
