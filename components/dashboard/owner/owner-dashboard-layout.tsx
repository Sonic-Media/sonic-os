"use client";

import { BusinessIntelligenceCard } from "@/components/dashboard/owner/business-intelligence-card";
import { BusinessPulseKpis } from "@/components/dashboard/owner/business-pulse-kpis";
import { MissionControlBranchStrip } from "@/components/dashboard/owner/mission-control-branch-strip";
import { MissionControlClosedSummary } from "@/components/dashboard/owner/mission-control-closed-summary";
import { MissionControlEndOfDay } from "@/components/dashboard/owner/mission-control-end-of-day";
import { MissionControlHero } from "@/components/dashboard/owner/mission-control-hero";
import { MissionControlRightPanel } from "@/components/dashboard/owner/mission-control-right-panel";
import { TodayTimeline } from "@/components/dashboard/owner/today-timeline";
import { PageContainer } from "@/components/shared/layout/page-container";
import { useBranchState } from "@/hooks/use-branch-state";
import { useOwnerDashboardRefresh } from "@/hooks/use-owner-dashboard-refresh";
import { uiSpacing } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

interface OwnerDashboardLayoutProps {
  displayName: string;
}

export function OwnerDashboardLayout({ displayName }: OwnerDashboardLayoutProps) {
  useOwnerDashboardRefresh();
  const branchState = useBranchState();
  const isClosed = branchState.status === "closed";

  return (
    <PageContainer className={cn(uiSpacing.page, "space-y-6")}>
      <MissionControlHero displayName={displayName} />

      <MissionControlBranchStrip />

      {isClosed ? <MissionControlClosedSummary /> : null}

      <BusinessPulseKpis />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.65fr)] xl:items-start">
        <TodayTimeline />
        <MissionControlRightPanel />
      </div>

      <BusinessIntelligenceCard />

      {!isClosed ? <MissionControlEndOfDay /> : null}
    </PageContainer>
  );
}
