import { StatCard } from "@/components/shared/ui/stat-card";
import type { BranchDashboardMetrics } from "@/types/branch";

interface BranchesDashboardSummaryProps {
  metrics: BranchDashboardMetrics;
}

export function BranchesDashboardSummary({
  metrics,
}: BranchesDashboardSummaryProps) {
  return (
    <section className="grid grid-cols-1 gap-3 mb-8 sm:grid-cols-2">
      <StatCard
        label="Total Branches"
        value={metrics.totalBranches}
        size="large"
        formatValue={() => metrics.totalBranches.toLocaleString("en-UG")}
        className="sm:col-span-2"
      />
      <StatCard
        label="Active Branches"
        value={metrics.activeBranches}
        formatValue={() => metrics.activeBranches.toLocaleString("en-UG")}
      />
    </section>
  );
}
