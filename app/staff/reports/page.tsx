"use client";

import { StaffSubnav } from "@/components/staff/staff-subnav";
import { Card } from "@/components/shared/ui/card";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { formatCurrency } from "@/lib/format";
import { useStaffPayments } from "@/hooks/use-staff-payments";

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-sm font-medium text-white">{title}</h2>
      {children}
    </section>
  );
}

export default function StaffReportsPage() {
  const { staffReports, isLoaded } = useStaffPayments();

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Staff Reports"
        subtitle="Payments, activity, and performance by employee"
      />

      <StaffSubnav />

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Total Paid This Month
          </p>
          <p className="mt-2 text-2xl font-semibold text-white tabular-nums">
            {formatCurrency(staffReports.totalPaidThisMonth)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Highest Paid
          </p>
          <p className="mt-2 text-sm font-medium text-white">
            {staffReports.highestPaid?.staffName ?? "—"}
          </p>
          {staffReports.highestPaid && (
            <p className="mt-1 text-lg font-semibold text-white tabular-nums">
              {formatCurrency(staffReports.highestPaid.total)}
            </p>
          )}
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Most Active Employee
          </p>
          <p className="mt-2 text-sm font-medium text-white">
            {staffReports.mostActiveEmployee?.staffName ?? "—"}
          </p>
          {staffReports.mostActiveEmployee && (
            <p className="mt-1 text-sm text-zinc-400">
              {staffReports.mostActiveEmployee.actionCount} actions
            </p>
          )}
        </Card>
      </div>

      <ReportSection title="Sales by Employee">
        {staffReports.salesByEmployee.length === 0 ? (
          <Card>
            <p className="text-sm text-zinc-500">No sales linked to staff yet.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {staffReports.salesByEmployee.map((item) => (
              <Card
                key={item.staffId}
                className="flex items-center justify-between py-4"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {item.staffName}
                  </p>
                  <p className="text-xs text-zinc-500">{item.count} sales</p>
                </div>
                <p className="text-sm font-semibold text-white tabular-nums">
                  {formatCurrency(item.total)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </ReportSection>

      <ReportSection title="Expenses Recorded">
        {staffReports.expensesRecorded.length === 0 ? (
          <Card>
            <p className="text-sm text-zinc-500">
              No expenses linked to staff yet.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {staffReports.expensesRecorded.map((item) => (
              <Card
                key={item.staffId}
                className="flex items-center justify-between py-4"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {item.staffName}
                  </p>
                  <p className="text-xs text-zinc-500">{item.count} records</p>
                </div>
                <p className="text-sm font-semibold text-white tabular-nums">
                  {formatCurrency(item.total)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </ReportSection>

      <ReportSection title="Purchases Recorded">
        {staffReports.purchasesRecorded.length === 0 ? (
          <Card>
            <p className="text-sm text-zinc-500">
              No purchases linked to staff yet.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {staffReports.purchasesRecorded.map((item) => (
              <Card
                key={item.staffId}
                className="flex items-center justify-between py-4"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {item.staffName}
                  </p>
                  <p className="text-xs text-zinc-500">{item.count} purchases</p>
                </div>
                <p className="text-sm font-semibold text-white tabular-nums">
                  {formatCurrency(item.total)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </ReportSection>

      <ReportSection title="Inventory Adjustments">
        {staffReports.inventoryAdjustments.length === 0 ? (
          <Card>
            <p className="text-sm text-zinc-500">
              No inventory adjustments recorded yet.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {staffReports.inventoryAdjustments.map((item) => (
              <Card
                key={item.staffId}
                className="flex items-center justify-between py-4"
              >
                <p className="text-sm font-medium text-white">{item.staffName}</p>
                <p className="text-sm text-zinc-400">{item.count} adjustments</p>
              </Card>
            ))}
          </div>
        )}
      </ReportSection>
    </PageContainer>
  );
}
