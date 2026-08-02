"use client";

import { CashFlowSummaryPanel } from "@/components/expenses/cash-flow-summary";
import { ExpensesSubnav } from "@/components/expenses/expenses-subnav";
import { MonthlySummaryCards } from "@/components/expenses/monthly-summary-cards";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { useCashFlow } from "@/hooks/use-cash-flow";

export default function CashFlowPage() {
  const {
    period,
    setPeriod,
    customRange,
    setCustomRange,
    summary,
    monthlySummary,
  } = useCashFlow("month");

  return (
    <PageContainer>
      <PageHeader
        title="Cash Flow"
        subtitle="Real-time income, purchases, and operating expenses"
      />

      <ExpensesSubnav />

      <CashFlowSummaryPanel
        summary={summary}
        period={period}
        onPeriodChange={setPeriod}
        customStart={customRange.start}
        customEnd={customRange.end}
        onCustomStartChange={(start) =>
          setCustomRange((current) => ({ ...current, start }))
        }
        onCustomEndChange={(end) =>
          setCustomRange((current) => ({ ...current, end }))
        }
      />

      <div className="mt-8">
        <MonthlySummaryCards summary={monthlySummary} />
      </div>
    </PageContainer>
  );
}
