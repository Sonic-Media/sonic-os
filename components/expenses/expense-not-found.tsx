import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";

export function ExpenseNotFound() {
  return (
    <PageContainer>
      <PageHeader
        title="Expense Not Found"
        subtitle="This expense may have been deleted."
      />
      <Button href="/expenses/history" variant="secondary">
        Back to Expenses
      </Button>
    </PageContainer>
  );
}
