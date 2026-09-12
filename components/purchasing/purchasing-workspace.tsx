"use client";

import { useState } from "react";
import { NewPurchaseForm } from "@/components/purchasing/new-purchase-form";
import { PurchasesPageFilters } from "@/components/purchasing/purchases-page-filters";
import { PurchasesPageKpis } from "@/components/purchasing/purchases-page-kpis";
import { PurchasesPremiumTable } from "@/components/purchasing/purchases-premium-table";
import { PurchasingSubnav } from "@/components/purchasing/purchasing-subnav";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { usePurchasesPage } from "@/hooks/use-purchases-page";
import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

export function PurchasingWorkspace() {
  const {
    isLoaded,
    filteredPurchases,
    kpis,
    statusFilter,
    setStatusFilter,
  } = usePurchasesPage();
  const [showNewPurchase, setShowNewPurchase] = useState(false);
  const [formKey, setFormKey] = useState(0);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer className="space-y-6 pb-10">
      <PageHeader
        title="Purchases"
        subtitle="Record stock purchases and supplier payments"
        showBranchBadge
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          onClick={() => setShowNewPurchase((current) => !current)}
        >
          + New Purchase
        </Button>
      </div>

      <PurchasingSubnav />

      <PurchasesPageFilters
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {showNewPurchase ? (
        <section className={cn(uiSurface.card, "p-5 sm:p-6")}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">New Purchase</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Record a supplier purchase and update stock
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-3"
              onClick={() => setShowNewPurchase(false)}
            >
              Close
            </Button>
          </div>
          <NewPurchaseForm
            key={formKey}
            onSuccess={() => {
              setShowNewPurchase(false);
              setFormKey((value) => value + 1);
            }}
          />
        </section>
      ) : null}

      <PurchasesPremiumTable purchases={filteredPurchases} />

      <PurchasesPageKpis
        totalPurchases={kpis.totalPurchases}
        suppliers={kpis.suppliers}
        pendingDeliveries={kpis.pendingDeliveries}
        lastPurchaseDate={kpis.lastPurchaseDate}
        lastPurchaseLabel={kpis.lastPurchaseLabel}
      />
    </PageContainer>
  );
}
