"use client";

import { useMemo } from "react";
import {
  BranchCard,
  DashboardGreeting,
} from "@/components/dashboard/branch-card";
import { CompactBusinessPulseCard } from "@/components/dashboard/analytics/compact-business-pulse-card";
import { DashboardAnalyticsSection } from "@/components/dashboard/dashboard-analytics";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { DayClosingStatusCardContainer } from "@/components/dashboard/day-closing-status";
import { TodayAtAGlance } from "@/components/dashboard/today-at-a-glance";
import { CashFlowGlanceCard } from "@/components/dashboard/cash-flow-glance-card";
import { TodayProgress } from "@/components/dashboard/today-progress";
import { PageContainer } from "@/components/shared/layout/page-container";
import { BranchBadge } from "@/components/shared/layout/branch-badge";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useDashboard } from "@/hooks/use-dashboard";
import { useEntriesContext } from "@/context/entries-context";
import { useSettings } from "@/context/settings-context";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { getTodayISO } from "@/lib/dates";
import { filterEntriesByDate } from "@/lib/entry-helpers";

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
    activeBranch,
  } = useDashboard();
  const { entries } = useEntriesContext();
  const { branches } = useSettings();
  const today = getTodayISO();
  const activeBranchConfig = branches.find((branch) => branch.id === activeBranch);

  const lastUpdatedAt = useMemo(() => {
    const todayEntries = filterEntriesByDate(
      filterByBranchField(entries, activeBranch),
      today
    );
    if (todayEntries.length === 0) return null;

    return todayEntries.reduce((latest, entry) => {
      if (!latest) return entry.createdAt;
      return new Date(entry.createdAt) > new Date(latest)
        ? entry.createdAt
        : latest;
    }, todayEntries[0]?.createdAt ?? null);
  }, [entries, today, activeBranch]);

  if (!isLoaded) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <PageContainer>
      <div className="relative mb-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(280px,340px)] lg:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <DashboardGreeting greeting={greeting} date={date} className="mb-0" />
              <BranchBadge />
            </div>
            <CompactBusinessPulseCard />
          </div>
          <div className="space-y-4">
            <TodayAtAGlance
              summary={summary}
              progress={progress}
              lastUpdatedAt={lastUpdatedAt}
            />
            <DayClosingStatusCardContainer />
            <CashFlowGlanceCard />
          </div>
        </div>
      </div>

      <DashboardAnalyticsSection />

      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6 lg:items-start">
        <TodayProgress progress={progress} className="mb-0" />

        <section className="mb-0">
          <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
            Branch
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {activeBranchConfig ? (
              <BranchCard
                key={activeBranchConfig.id}
                name={activeBranchConfig.name}
                totals={summary.byBranch[activeBranchConfig.id]}
              />
            ) : null}
          </div>
        </section>
      </div>

      <QuickActions
        progress={progress}
        draftEntry={draftEntry}
        completedEntry={completedEntry}
        allEntriesCompleted={allEntriesCompleted}
      />
    </PageContainer>
  );
}
