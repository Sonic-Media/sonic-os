import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";

export function StaffNotFound() {
  return (
    <PageContainer>
      <PageHeader
        title="Staff Member Not Found"
        subtitle="This staff member may have been removed."
      />
      <Button href="/staff" variant="secondary">
        Back to Staff
      </Button>
    </PageContainer>
  );
}
