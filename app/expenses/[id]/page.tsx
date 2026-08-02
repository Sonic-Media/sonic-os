"use client";

import { useParams } from "next/navigation";
import { ExpenseDetailCard } from "@/components/expenses/expense-detail-card";
import { ExpenseNotFound } from "@/components/expenses/expense-not-found";
import { ExpensesSubnav } from "@/components/expenses/expenses-subnav";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useExpensesModule } from "@/context/expenses-module-context";
import { useExpensesDialogs } from "@/hooks/use-expenses-dialogs";

export default function ExpenseDetailPage() {
  const params = useParams();
  const expenseId = params.id as string;
  const { getExpenseById, isLoaded } = useExpensesModule();
  const { openEditExpense, renderDialogs } = useExpensesDialogs();
  const expense = getExpenseById(expenseId);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  if (!expense) {
    return <ExpenseNotFound />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Expense Details"
        subtitle={expense.description}
      />

      <div className="mb-6 flex justify-end">
        <Button type="button" onClick={() => openEditExpense(expense)}>
          Edit Expense
        </Button>
      </div>

      <ExpensesSubnav />

      <ExpenseDetailCard expense={expense} />

      {renderDialogs()}
    </PageContainer>
  );
}
