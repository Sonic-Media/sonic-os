"use client";

import { ExpensesDashboardSummary } from "@/components/expenses/expenses-dashboard-summary";
import { ExpensesSubnav } from "@/components/expenses/expenses-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useExpensesModule } from "@/context/expenses-module-context";
import { useExpensesDashboard } from "@/hooks/use-expenses-dashboard";

export default function ExpensesDashboardPage() {
  const { isLoaded } = useExpensesModule();
  const { metrics } = useExpensesDashboard();

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Expense Management"
        subtitle="Read-only overview of operating expenses and trends"
        showBranchBadge
      />

      <ExpensesSubnav />

      <ExpensesDashboardSummary metrics={metrics} />
    </PageContainer>
  );
}
