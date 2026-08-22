"use client";

import { useMemo } from "react";
import { SalesDashboardSummary } from "@/components/sales/sales-dashboard-summary";
import { SalesQuickActions } from "@/components/sales/sales-quick-actions";
import { SalesRecentSales } from "@/components/sales/sales-recent-sales";
import { SalesSubnav } from "@/components/sales/sales-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { isCashierRole } from "@/lib/auth/permissions";
import { useActiveBranch } from "@/context/active-branch-context";
import { useAuth } from "@/context/auth-context";
import { useSales } from "@/context/sales-context";
import { useSalesDashboard } from "@/hooks/use-sales-dashboard";
import { getTodayISO } from "@/lib/dates";

export default function SalesDashboardPage() {
  const { sales, isLoaded } = useSales();
  const { activeBranch, isLoaded: branchLoaded } = useActiveBranch();
  const { session } = useAuth();
  const { metrics } = useSalesDashboard();
  const isCashier = session ? isCashierRole(session.role) : false;
  const today = getTodayISO();
  const branchSales = useMemo(
    () => filterByBranchField(sales, activeBranch),
    [sales, activeBranch]
  );
  const visibleSales = useMemo(
    () => (isCashier ? branchSales.filter((sale) => sale.date === today) : branchSales),
    [branchSales, isCashier, today]
  );

  if (!isLoaded || !branchLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Accessory Sales"
        subtitle={
          isCashier
            ? "Record and review today's accessory sales"
            : "Physical accessory sales and revenue tracking"
        }
        showBranchBadge
      />

      <SalesSubnav />

      {!isCashier && <SalesDashboardSummary metrics={metrics} />}

      <div className="mb-8">
        <SalesQuickActions showHistoryLink={!isCashier} />
      </div>

      <SalesRecentSales
        sales={visibleSales}
        title={isCashier ? "Today's Accessory Sales" : "Recent Accessory Sales"}
        limit={isCashier ? 20 : 5}
      />
    </PageContainer>
  );
}
