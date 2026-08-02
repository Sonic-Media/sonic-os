import { Card } from "@/components/shared/ui/card";
import { formatCurrency } from "@/lib/format";
import type { StaffPaymentReportSummary } from "@/types/staff-payment";

interface ExpensesReportsPlaceholdersProps {
  topCategories: { category: string; total: number }[];
  branchComparison: { branch: string; total: number }[];
  staffPaymentReport: StaffPaymentReportSummary;
}

function formatMonthLabel(month: string): string {
  const parsed = new Date(`${month}-01T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return month;

  return parsed.toLocaleDateString("en-UG", {
    month: "short",
    year: "numeric",
  });
}

export function ExpensesReportsPlaceholders({
  topCategories,
  branchComparison,
  staffPaymentReport,
}: ExpensesReportsPlaceholdersProps) {
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="min-h-[220px] border-dashed border-zinc-700/80 bg-zinc-900/30">
          <h3 className="text-sm font-medium text-white">
            Top Expense Categories
          </h3>
          {topCategories.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500">No expense data yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {topCategories.map((item) => (
                <li
                  key={item.category}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-zinc-400">{item.category}</span>
                  <span className="font-medium text-white">
                    {formatCurrency(item.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex min-h-[220px] flex-col justify-between border-dashed border-zinc-700/80 bg-zinc-900/30">
          <div>
            <h3 className="text-sm font-medium text-white">
              Monthly Expense Trend
            </h3>
            <p className="mt-2 text-xs text-zinc-500">
              Chart coming soon — track expense trends over time.
            </p>
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-600">
            Coming Soon
          </p>
        </Card>

        <Card className="min-h-[220px] border-dashed border-zinc-700/80 bg-zinc-900/30">
          <h3 className="text-sm font-medium text-white">Branch Comparison</h3>
          {branchComparison.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500">No branch data yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {branchComparison.map((item) => (
                <li
                  key={item.branch}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-zinc-400">{item.branch}</span>
                  <span className="font-medium text-white">
                    {formatCurrency(item.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="min-h-[220px]">
          <h3 className="text-sm font-medium text-white">Staff Payments</h3>
          <p className="mt-2 text-2xl font-semibold text-white">
            {formatCurrency(staffPaymentReport.totalStaffPayments)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Total for selected period</p>
        </Card>

        <Card className="min-h-[220px]">
          <h3 className="text-sm font-medium text-white">
            Staff Payments by Branch
          </h3>
          {staffPaymentReport.byBranch.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500">No staff payments yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {staffPaymentReport.byBranch.map((item) => (
                <li
                  key={item.branch}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-zinc-400">{item.branch}</span>
                  <span className="font-medium text-white">
                    {formatCurrency(item.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="min-h-[220px]">
          <h3 className="text-sm font-medium text-white">
            Staff Payments by Staff Member
          </h3>
          {staffPaymentReport.byStaff.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500">No staff payments yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {staffPaymentReport.byStaff.map((item) => (
                <li
                  key={item.staffId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-zinc-400">{item.staffName}</span>
                  <span className="font-medium text-white">
                    {formatCurrency(item.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="min-h-[220px]">
          <h3 className="text-sm font-medium text-white">
            Monthly Staff Payment Totals
          </h3>
          {staffPaymentReport.monthlyTotals.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500">No staff payments yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {staffPaymentReport.monthlyTotals.map((item) => (
                <li
                  key={item.month}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-zinc-400">
                    {formatMonthLabel(item.month)}
                  </span>
                  <span className="font-medium text-white">
                    {formatCurrency(item.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
