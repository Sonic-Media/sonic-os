"use client";

import { StockDashboardSummary } from "@/components/stock/stock-dashboard-summary";
import { StockQuickActions } from "@/components/stock/stock-quick-actions";
import { StockSubnav } from "@/components/stock/stock-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useStock } from "@/context/stock-context";
import { useStockDashboard } from "@/hooks/use-stock-dashboard";
import { useStockDialogs } from "@/hooks/use-stock-dialogs";

export default function StockDashboardPage() {
  const { isLoaded } = useStock();
  const { metrics } = useStockDashboard();
  const {
    openAddProduct,
    openStockIn,
    openStockOut,
    renderDialogs,
  } = useStockDialogs();

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Stock"
        subtitle="Physical product inventory"
        showBranchBadge
      />

      <StockSubnav />

      <StockDashboardSummary metrics={metrics} />

      <StockQuickActions
        onAddProduct={() => openAddProduct()}
        onStockIn={() => openStockIn()}
        onStockOut={() => openStockOut()}
      />

      {renderDialogs()}
    </PageContainer>
  );
}
