"use client";

import { CloseDayWorkspace } from "@/components/operations/close-day-workspace";
import { OperationsSubnav } from "@/components/operations/operations-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";

export default function CloseDayPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Close Day"
        subtitle="End-of-day closing and cash reconciliation"
        showBranchBadge
      />
      <OperationsSubnav />
      <CloseDayWorkspace />
    </PageContainer>
  );
}
