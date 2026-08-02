"use client";

import { NewSaleForm } from "@/components/sales/new-sale-form";
import { SalesSubnav } from "@/components/sales/sales-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";

export default function NewSalePage() {
  return (
    <PageContainer>
      <PageHeader
        title="New Sale"
        subtitle="Record a sale and update inventory automatically"
      />

      <SalesSubnav />

      <NewSaleForm />
    </PageContainer>
  );
}
