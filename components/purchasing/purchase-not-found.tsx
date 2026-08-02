import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";

export function PurchaseNotFound() {
  return (
    <PageContainer>
      <PageHeader
        title="Purchase Not Found"
        subtitle="This purchase may have been deleted."
      />
      <Button href="/purchasing/history" variant="secondary">
        Back to Purchase History
      </Button>
    </PageContainer>
  );
}
