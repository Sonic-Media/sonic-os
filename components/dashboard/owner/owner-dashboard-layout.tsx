"use client";

import { OwnerBranchComparison } from "@/components/owner-command-center/owner-branch-comparison";
import { BusinessPulseKpis } from "@/components/dashboard/owner/business-pulse-kpis";
import { BusinessIntelligenceCard } from "@/components/dashboard/owner/business-intelligence-card";
import { MissionControlBranchOverview } from "@/components/dashboard/owner/mission-control-branch-overview";
import { MissionControlClosedSummary } from "@/components/dashboard/owner/mission-control-closed-summary";
import { MissionControlEndOfDay } from "@/components/dashboard/owner/mission-control-end-of-day";
import { MissionControlHero } from "@/components/dashboard/owner/mission-control-hero";
import { MissionControlShopStatus } from "@/components/dashboard/owner/mission-control-shop-status";
import { MissionControlStaffStatus } from "@/components/dashboard/owner/mission-control-staff-status";
import { TodayTimeline } from "@/components/dashboard/owner/today-timeline";
import { PageContainer } from "@/components/shared/layout/page-container";
import { useBranchState } from "@/hooks/use-branch-state";
import { useOwnerCommandCenter } from "@/hooks/use-owner-command-center";
import { useOwnerDashboardRefresh } from "@/hooks/use-owner-dashboard-refresh";
import { uiSpacing } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

interface OwnerDashboardLayoutProps {
  displayName: string;
}

export function OwnerDashboardLayout({ displayName }: OwnerDashboardLayoutProps) {
  useOwnerDashboardRefresh();
  const branchState = useBranchState();
  const { metrics, isLoaded: commandCenterLoaded } = useOwnerCommandCenter();
  const isClosed = branchState.status === "closed";

  return (
    <PageContainer className={cn(uiSpacing.page, "space-y-8")}>
      <MissionControlHero displayName={displayName} />

      <MissionControlBranchOverview />

      {isClosed ? <MissionControlClosedSummary /> : null}

      <BusinessPulseKpis />

      <BusinessIntelligenceCard />

      {commandCenterLoaded && metrics.branchComparison.length > 1 ? (
        <OwnerBranchComparison branches={metrics.branchComparison} />
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)]">
        <TodayTimeline />
        <MissionControlShopStatus />
      </div>

      <MissionControlStaffStatus />

      {!isClosed ? (
        <MissionControlEndOfDay />
      ) : null}
    </PageContainer>
  );
}
