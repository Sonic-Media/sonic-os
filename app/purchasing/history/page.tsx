"use client";

import { useMemo } from "react";
import { PurchaseHistoryFilters } from "@/components/purchasing/purchase-history-filters";
import { PurchaseHistoryTable } from "@/components/purchasing/purchase-history-table";
import { PurchasingSubnav } from "@/components/purchasing/purchasing-subnav";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { usePurchaseHistory } from "@/hooks/use-purchase-history";
import { usePurchasing } from "@/context/purchasing-context";

export default function PurchaseHistoryPage() {
  const { criteria, purchases, updateCriteria } = usePurchaseHistory();
  const { suppliers } = usePurchasing();

  const supplierOptions = useMemo(
    () =>
      suppliers.map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      })),
    [suppliers]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Purchase History"
        subtitle="All supplier purchase records"
      />

      <div className="mb-6 flex justify-end">
        <Button href="/purchasing/new">New Purchase</Button>
      </div>

      <PurchasingSubnav />

      <div className="lg:grid lg:grid-cols-[minmax(280px,320px)_1fr] lg:gap-8 lg:items-start">
        <PurchaseHistoryFilters
          criteria={criteria}
          onCriteriaChange={updateCriteria}
          supplierOptions={supplierOptions}
          className="lg:sticky lg:top-8 lg:mb-0"
        />

        <PurchaseHistoryTable purchases={purchases} />
      </div>
    </PageContainer>
  );
}
