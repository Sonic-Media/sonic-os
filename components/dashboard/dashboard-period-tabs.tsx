"use client";

import { DASHBOARD_PERIODS } from "@/lib/constants";
import { SegmentedControl } from "@/components/shared/segmented-control";
import type { DashboardPeriod } from "@/types";

interface DashboardPeriodTabsProps {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

export function DashboardPeriodTabs({
  period,
  onPeriodChange,
}: DashboardPeriodTabsProps) {
  return (
    <div className="mb-6">
      <SegmentedControl
        options={DASHBOARD_PERIODS}
        value={period}
        onChange={onPeriodChange}
      />
    </div>
  );
}
