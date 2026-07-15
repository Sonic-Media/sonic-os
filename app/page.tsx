"use client";

import { useMemo } from "react";
import {
  BranchCard,
  DashboardGreeting,
} from "@/components/dashboard/branch-card";
import { CompactBusinessPulseCard } from "@/components/dashboard/analytics/compact-business-pulse-card";
import { DashboardAnalyticsSection } from "@/components/dashboard/dashboard-analytics";
import { DashboardNotificationCenter } from "@/components/dashboard/dashboard-notification-center";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TodayAtAGlance } from "@/components/dashboard/today-at-a-glance";
import { TodayProgress } from "@/components/dashboard/today-progress";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useDashboard } from "@/hooks/use-dashboard";
import { useEntriesContext } from "@/context/entries-context";
import { useSettings } from "@/context/settings-context";
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
  } = useDashboard();
  const { entries } = useEntriesContext();
  const { branches } = useSettings();
  const today = getTodayISO();

  const lastUpdatedAt = useMemo(() => {
    const todayEntries = filterEntriesByDate(entries, today);
    if (todayEntries.length === 0) return null;

    return todayEntries.reduce((latest, entry) => {
      if (!latest) return entry.createdAt;
      return new Date(entry.createdAt) > new Date(latest)
        ? entry.createdAt
        : latest;
    }, todayEntries[0]?.createdAt ?? null);
  }, [entries, today]);

  if (!isLoaded) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <PageContainer>
      <div className="relative mb-8">
        <div className="absolute right-0 top-0 z-10">
          <DashboardNotificationCenter />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(280px,340px)] lg:items-start lg:pr-14">
          <div className="space-y-4">
            <DashboardGreeting greeting={greeting} date={date} className="mb-0" />
            <CompactBusinessPulseCard />
          </div>
          <TodayAtAGlance
            summary={summary}
            progress={progress}
            lastUpdatedAt={lastUpdatedAt}
          />
        </div>
      </div>

      <DashboardAnalyticsSection />

      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6 lg:items-start">
        <TodayProgress progress={progress} className="mb-0" />

        <section className="mb-0">
          <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
            Branches
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {branches.map((branch) => (
              <BranchCard
                key={branch.id}
                name={branch.name}
                totals={summary.byBranch[branch.id]}
              />
            ))}
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
