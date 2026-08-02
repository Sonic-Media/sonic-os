"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StaffPaymentDialog } from "@/components/staff/staff-payment-dialog";
import { StaffPaymentHistory } from "@/components/staff/staff-payment-history";
import { StaffSubnav } from "@/components/staff/staff-subnav";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { formatCurrency } from "@/lib/format";
import { useStaffPayments } from "@/hooks/use-staff-payments";

export default function StaffPaymentsPage() {
  const searchParams = useSearchParams();
  const { allPayments, report, isLoaded } = useStaffPayments();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  useEffect(() => {
    if (searchParams.get("record") === "1") {
      setShowPaymentDialog(true);
    }
  }, [searchParams]);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Staff Payments"
        subtitle="Record wages, salaries, bonuses, and deductions"
      />

      <div className="mb-6 flex justify-end">
        <Button type="button" onClick={() => setShowPaymentDialog(true)}>
          Record Payment
        </Button>
      </div>

      <StaffSubnav />

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Total This Month
          </p>
          <p className="mt-2 text-2xl font-semibold text-white tabular-nums">
            {formatCurrency(report.totalStaffPayments)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Staff Members Paid
          </p>
          <p className="mt-2 text-2xl font-semibold text-white tabular-nums">
            {report.byStaff.length}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Branches
          </p>
          <p className="mt-2 text-2xl font-semibold text-white tabular-nums">
            {report.byBranch.length}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Payment Records
          </p>
          <p className="mt-2 text-2xl font-semibold text-white tabular-nums">
            {allPayments.length}
          </p>
        </Card>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-medium text-white">
          All Staff Payments
        </h2>
        <StaffPaymentHistory
          payments={allPayments}
          emptyMessage="No staff payments recorded yet."
        />
      </section>

      {showPaymentDialog && (
        <StaffPaymentDialog onClose={() => setShowPaymentDialog(false)} />
      )}
    </PageContainer>
  );
}
