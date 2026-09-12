"use client";

import { useState } from "react";
import { SalesNewSaleWorkspace } from "@/components/sales/sales-new-sale-workspace";
import { SalesPageKpis } from "@/components/sales/sales-page-kpis";
import { SalesRecentSalesTable } from "@/components/sales/sales-recent-sales-table";
import { SalesSubnav } from "@/components/sales/sales-subnav";
import { SalesTodaySummary } from "@/components/sales/sales-today-summary";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useSalesPage } from "@/hooks/use-sales-page";

export function SalesWorkspace() {
  const {
    isLoaded,
    kpis,
    todaySummary,
    recentSales,
  } = useSalesPage();
  const [refreshKey, setRefreshKey] = useState(0);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer className="space-y-6 pb-10">
      <PageHeader
        title="Sales"
        subtitle="Record and manage all sales"
        showBranchBadge
      />

      <SalesSubnav />

      <SalesPageKpis
        transactions={kpis.transactions}
        totalRevenue={kpis.totalRevenue}
        accessoryRevenue={kpis.accessoryRevenue}
        movieRevenue={kpis.movieRevenue}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)] xl:items-start">
        <SalesNewSaleWorkspace
          key={refreshKey}
          onSuccess={() => setRefreshKey((value) => value + 1)}
        />
        <SalesTodaySummary
          transactions={todaySummary.transactions}
          totalRevenue={todaySummary.totalRevenue}
          accessoryRevenue={todaySummary.accessoryRevenue}
          movieRevenue={todaySummary.movieRevenue}
          operatingExpenses={todaySummary.operatingExpenses}
          netSales={todaySummary.netSales}
        />
      </div>

      <SalesRecentSalesTable sales={recentSales} />
    </PageContainer>
  );
}
