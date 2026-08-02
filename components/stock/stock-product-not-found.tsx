import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";

export function StockProductNotFound() {
  return (
    <PageContainer>
      <PageHeader
        title="Item Not Found"
        subtitle="This item may have been deleted."
      />
      <Button href="/stock/products" variant="secondary">
        Back to Items
      </Button>
    </PageContainer>
  );
}
