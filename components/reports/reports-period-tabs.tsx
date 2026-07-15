import { REPORT_PERIODS } from "@/lib/constants";
import { SegmentedControl } from "@/components/shared/segmented-control";
import type { ReportPeriod } from "@/types";

interface ReportsPeriodTabsProps {
  period: ReportPeriod;
  onPeriodChange: (period: ReportPeriod) => void;
}

export function ReportsPeriodTabs({ period, onPeriodChange }: ReportsPeriodTabsProps) {
  return (
    <div className="mb-8">
      <SegmentedControl
        options={REPORT_PERIODS}
        value={period}
        onChange={onPeriodChange}
      />
    </div>
  );
}
