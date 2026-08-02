"use client";

import { useParams } from "next/navigation";
import { PurchaseDetailCard } from "@/components/purchasing/purchase-detail-card";
import { PurchaseNotFound } from "@/components/purchasing/purchase-not-found";
import { PurchasingSubnav } from "@/components/purchasing/purchasing-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { usePurchasing } from "@/context/purchasing-context";

export default function PurchaseDetailPage() {
  const params = useParams();
  const purchaseId = params.id as string;
  const { getPurchaseById, isLoaded } = usePurchasing();
  const purchase = getPurchaseById(purchaseId);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  if (!purchase) {
    return <PurchaseNotFound />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Purchase Detail"
        subtitle={purchase.invoiceNumber}
      />

      <PurchasingSubnav />

      <PurchaseDetailCard purchase={purchase} />
    </PageContainer>
  );
}
