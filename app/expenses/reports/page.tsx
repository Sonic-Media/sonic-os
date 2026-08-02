"use client";

import { ExpensesReportsPlaceholders } from "@/components/expenses/expenses-reports-placeholders";
import { ExpensesSubnav } from "@/components/expenses/expenses-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { useCashFlow } from "@/hooks/use-cash-flow";

export default function ExpensesReportsPage() {
  const {
    topCategories,
    branchComparison,
    staffPaymentReport,
    staffExpenseDetails,
    staffExpenseCategoryName,
  } = useCashFlow("month");

  return (
    <PageContainer>
      <PageHeader
        title="Expense Reports"
        subtitle="Category and branch expense insights"
      />

      <ExpensesSubnav />

      <ExpensesReportsPlaceholders
        topCategories={topCategories}
        branchComparison={branchComparison}
        staffPaymentReport={staffPaymentReport}
        staffExpenseDetails={staffExpenseDetails}
        staffExpenseCategoryName={staffExpenseCategoryName}
      />
    </PageContainer>
  );
}
