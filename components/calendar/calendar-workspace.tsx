"use client";

import { CalendarBranchFilters } from "@/components/calendar/calendar-branch-filters";
import { CalendarControls } from "@/components/calendar/calendar-controls";
import { CalendarDayDetail } from "@/components/calendar/calendar-day-detail";
import { CalendarLegend } from "@/components/calendar/calendar-legend";
import { CalendarMonthGrid } from "@/components/calendar/calendar-month-grid";
import { CalendarWeekView } from "@/components/calendar/calendar-week-view";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useCalendarPage } from "@/hooks/use-calendar-page";

export function CalendarWorkspace() {
  const {
    isLoaded,
    canSwitchBranch,
    getBranchName,
    activeBranches,
    viewMode,
    setViewMode,
    periodLabel,
    goToPreviousPeriod,
    goToNextPeriod,
    monthGrid,
    weekDays,
    selectedDate,
    selectDate,
    getMarkers,
    selectedTransactions,
    branchFilter,
    setBranchFilter,
  } = useCalendarPage();

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer className="space-y-6 pb-10">
      <PageHeader
        title="Calendar"
        subtitle="View business activity by date"
        showBranchBadge={!canSwitchBranch}
      />

      <CalendarBranchFilters
        canSwitchBranch={canSwitchBranch}
        activeBranches={activeBranches}
        getBranchName={getBranchName}
        branchFilter={branchFilter}
        onBranchFilterChange={setBranchFilter}
      />

      <CalendarControls
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        periodLabel={periodLabel}
        onPrevious={goToPreviousPeriod}
        onNext={goToNextPeriod}
      />

      <CalendarLegend />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)] xl:items-start">
        <div>
          {viewMode === "month" ? (
            <CalendarMonthGrid
              days={monthGrid}
              selectedDate={selectedDate}
              getMarkers={getMarkers}
              onSelectDate={selectDate}
            />
          ) : null}

          {viewMode === "week" ? (
            <CalendarWeekView
              days={weekDays}
              selectedDate={selectedDate}
              getMarkers={getMarkers}
              onSelectDate={selectDate}
            />
          ) : null}

          {viewMode === "day" ? (
            <CalendarDayDetail
              date={selectedDate}
              transactions={selectedTransactions}
            />
          ) : null}
        </div>

        {viewMode !== "day" ? (
          <CalendarDayDetail
            date={selectedDate}
            transactions={selectedTransactions}
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
