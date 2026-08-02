"use client";

import { PurchasingDashboardSummary } from "@/components/purchasing/purchasing-dashboard-summary";
import { PurchasingQuickActions } from "@/components/purchasing/purchasing-quick-actions";
import { PurchasingSubnav } from "@/components/purchasing/purchasing-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { usePurchasing } from "@/context/purchasing-context";
import { usePurchasingDashboard } from "@/hooks/use-purchasing-dashboard";

export default function PurchasingDashboardPage() {
  const { isLoaded } = usePurchasing();
  const { metrics } = usePurchasingDashboard();

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Purchasing"
        subtitle="Supplier purchases and inventory intake"
        showBranchBadge
      />

      <PurchasingSubnav />

      <PurchasingDashboardSummary metrics={metrics} />

      <PurchasingQuickActions />
    </PageContainer>
  );
}
