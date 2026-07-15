import { StatCard } from "@/components/shared/ui/stat-card";
import type { ReportSummary } from "@/types";

interface ReportsSummaryProps {
  summary: Pick<ReportSummary, "totalSales" | "totalExpenses" | "totalSavings">;
}

export function ReportsSummary({ summary }: ReportsSummaryProps) {
  return (
    <section className="grid grid-cols-1 gap-3 mb-8">
      <StatCard label="Total Sales" value={summary.totalSales} size="large" />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Expenses" value={summary.totalExpenses} />
        <StatCard
          label="Total Savings"
          value={summary.totalSavings}
          variant={summary.totalSavings >= 0 ? "accent" : "default"}
        />
      </div>
    </section>
  );
}
