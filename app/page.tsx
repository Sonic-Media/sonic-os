"use client";

import {
  BranchCard,
  DashboardGreeting,
} from "@/components/dashboard/branch-card";
import { DashboardAnalyticsSection } from "@/components/dashboard/dashboard-analytics";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TodayProgress } from "@/components/dashboard/today-progress";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useDashboard } from "@/hooks/use-dashboard";
import { useSettings } from "@/context/settings-context";

export default function DashboardPage() {
  const {
    isLoaded,
    greeting,
    date,
    summary,
    progress,
    draftEntry,
    completedEntry,
    allEntriesCompleted,
    analytics,
    period,
    setPeriod,
  } = useDashboard();
  const { branches } = useSettings();

  if (!isLoaded) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <PageContainer>
      <DashboardGreeting greeting={greeting} date={date} />

      <DashboardAnalyticsSection
        analytics={analytics}
        period={period}
        onPeriodChange={setPeriod}
      />

      <TodayProgress progress={progress} />

      <section className="mb-8">
        <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
          Branches
        </h2>
        <div className="space-y-3">
          {branches.map((branch) => (
            <BranchCard
              key={branch.id}
              name={branch.name}
              totals={summary.byBranch[branch.id]}
            />
          ))}
        </div>
      </section>

      <QuickActions
        progress={progress}
        draftEntry={draftEntry}
        completedEntry={completedEntry}
        allEntriesCompleted={allEntriesCompleted}
      />
    </PageContainer>
  );
}
