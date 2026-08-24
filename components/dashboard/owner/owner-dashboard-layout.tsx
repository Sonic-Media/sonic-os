"use client";

import { BusinessPulseKpis } from "@/components/dashboard/owner/business-pulse-kpis";
import { MissionControlClosedSummary } from "@/components/dashboard/owner/mission-control-closed-summary";
import { MissionControlEndOfDay } from "@/components/dashboard/owner/mission-control-end-of-day";
import { MissionControlHero } from "@/components/dashboard/owner/mission-control-hero";
import { MissionControlInsightsPanel } from "@/components/dashboard/owner/mission-control-insights-panel";
import { MissionControlShopStatus } from "@/components/dashboard/owner/mission-control-shop-status";
import { MissionControlStaffStatus } from "@/components/dashboard/owner/mission-control-staff-status";
import { TodayTimeline } from "@/components/dashboard/owner/today-timeline";
import { PageContainer } from "@/components/shared/layout/page-container";
import { useBranchState } from "@/hooks/use-branch-state";
import { uiSpacing } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

interface OwnerDashboardLayoutProps {
  displayName: string;
}

export function OwnerDashboardLayout({ displayName }: OwnerDashboardLayoutProps) {
  const branchState = useBranchState();
  const isClosed = branchState.status === "closed";

  return (
    <PageContainer className={cn(uiSpacing.page, "space-y-8")}>
      <MissionControlHero displayName={displayName} />

      {isClosed ? <MissionControlClosedSummary /> : null}

      <BusinessPulseKpis />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)]">
        <TodayTimeline />
        <MissionControlShopStatus />
      </div>

      <MissionControlStaffStatus />

      {!isClosed ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <MissionControlEndOfDay />
          <MissionControlInsightsPanel />
        </div>
      ) : (
        <MissionControlInsightsPanel />
      )}
    </PageContainer>
  );
}
