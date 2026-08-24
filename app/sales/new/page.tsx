"use client";

import { NewSaleForm } from "@/components/sales/new-sale-form";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";

export default function NewSalePage() {
  return (
    <PageContainer>
      <PageHeader
        title="New Accessory Sale"
        subtitle="Record a physical accessory sale for today"
        showBranchBadge
      />

      <NewSaleForm />
    </PageContainer>
  );
}
