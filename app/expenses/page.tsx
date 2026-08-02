"use client";

import { ExpensesDashboardSummary } from "@/components/expenses/expenses-dashboard-summary";
import { ExpensesQuickActions } from "@/components/expenses/expenses-quick-actions";
import { ExpensesSubnav } from "@/components/expenses/expenses-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useExpensesModule } from "@/context/expenses-module-context";
import { useExpensesDashboard } from "@/hooks/use-expenses-dashboard";
import { useExpensesDialogs } from "@/hooks/use-expenses-dialogs";

export default function ExpensesDashboardPage() {
  const { isLoaded } = useExpensesModule();
  const { metrics } = useExpensesDashboard();
  const { openAddExpense, renderDialogs } = useExpensesDialogs();

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Expenses"
        subtitle="Operating expenses and cash flow visibility"
      />

      <ExpensesSubnav />

      <ExpensesDashboardSummary metrics={metrics} />

      <ExpensesQuickActions onNewExpense={openAddExpense} />

      {renderDialogs()}
    </PageContainer>
  );
}
