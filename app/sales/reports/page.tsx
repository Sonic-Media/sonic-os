"use client";

import { SalesReportsPlaceholders } from "@/components/sales/sales-reports-placeholders";
import { SalesSubnav } from "@/components/sales/sales-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";

export default function SalesReportsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Accessory Sales Reports"
        subtitle="Accessory sales analytics and performance insights"
      />

      <SalesSubnav />

      <SalesReportsPlaceholders />
    </PageContainer>
  );
}
