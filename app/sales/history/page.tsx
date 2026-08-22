"use client";

import { useMemo } from "react";
import { SalesHistoryFilters } from "@/components/sales/sales-history-filters";
import { SalesHistoryTable } from "@/components/sales/sales-history-table";
import { SalesSubnav } from "@/components/sales/sales-subnav";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { useSalesHistory } from "@/hooks/use-sales-history";
import { useSales } from "@/context/sales-context";

export default function SalesHistoryPage() {
  const { criteria, sales, updateCriteria } = useSalesHistory();
  const { customers } = useSales();

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: customer.name,
      })),
    [customers]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Accessory Sales History"
        subtitle="All completed accessory sales"
      />

      <div className="mb-6 flex justify-end">
        <Button href="/sales/new">New Accessory Sale</Button>
      </div>

      <SalesSubnav />

      <div className="lg:grid lg:grid-cols-[minmax(280px,320px)_1fr] lg:gap-8 lg:items-start">
        <SalesHistoryFilters
          criteria={criteria}
          onCriteriaChange={updateCriteria}
          customerOptions={customerOptions}
          className="lg:sticky lg:top-8 lg:mb-0"
        />

        <SalesHistoryTable sales={sales} />
      </div>
    </PageContainer>
  );
}
