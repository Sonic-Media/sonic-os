"use client";

import { NewPurchaseForm } from "@/components/purchasing/new-purchase-form";
import { PurchasingSubnav } from "@/components/purchasing/purchasing-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";

export default function NewPurchasePage() {
  return (
    <PageContainer>
      <PageHeader
        title="New Purchase"
        subtitle="Record a supplier purchase and update stock automatically"
      />

      <PurchasingSubnav />

      <NewPurchaseForm />
    </PageContainer>
  );
}
