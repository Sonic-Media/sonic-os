import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";

interface EntryNotFoundProps {
  backHref?: string;
  backLabel?: string;
}

export function EntryNotFound({
  backHref = "/history",
  backLabel = "Back to History",
}: EntryNotFoundProps) {
  return (
    <PageContainer>
      <PageHeader
        title="Entry Not Found"
        subtitle="This entry may have been deleted."
      />
      <Button href={backHref} variant="secondary">
        {backLabel}
      </Button>
    </PageContainer>
  );
}
