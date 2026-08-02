"use client";

import { SalesDashboardSummary } from "@/components/sales/sales-dashboard-summary";
import { SalesQuickActions } from "@/components/sales/sales-quick-actions";
import { SalesRecentSales } from "@/components/sales/sales-recent-sales";
import { SalesSubnav } from "@/components/sales/sales-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useSales } from "@/context/sales-context";
import { useSalesDashboard } from "@/hooks/use-sales-dashboard";

export default function SalesDashboardPage() {
  const { sales, isLoaded } = useSales();
  const { metrics } = useSalesDashboard();

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Sales"
        subtitle="Point of sale and revenue tracking"
      />

      <SalesSubnav />

      <SalesDashboardSummary metrics={metrics} />

      <div className="mb-8">
        <SalesQuickActions />
      </div>

      <SalesRecentSales sales={sales} />
    </PageContainer>
  );
}
