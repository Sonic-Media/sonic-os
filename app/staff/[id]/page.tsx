"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { StaffNotFound } from "@/components/staff/staff-not-found";
import { StaffPaymentDialog } from "@/components/staff/staff-payment-dialog";
import { StaffPaymentHistory } from "@/components/staff/staff-payment-history";
import { StaffPaymentStatusBadge } from "@/components/staff/staff-payment-status-badge";
import { StaffSubnav } from "@/components/staff/staff-subnav";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import { formatCurrency } from "@/lib/format";
import { getStaffRoleName } from "@/lib/staff/roles";
import { useStaffPayments } from "@/hooks/use-staff-payments";
import type { Branch } from "@/types";

function formatLastPaymentDate(date: string | null): string {
  if (!date) return "No payments yet";

  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function StaffProfilePage() {
  const params = useParams();
  const staffId = params.id as string;
  const { getStaffById, isLoaded: staffLoaded } = useStaff();
  const { summaries, getPaymentHistoryForStaff, isLoaded: paymentsLoaded } =
    useStaffPayments();
  const { getBranchName } = useSettings();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const member = getStaffById(staffId);
  const paymentSummary = summaries.find((item) => item.staffId === staffId);

  const paymentHistory = useMemo(
    () => getPaymentHistoryForStaff(staffId),
    [getPaymentHistoryForStaff, staffId]
  );

  if (!staffLoaded || !paymentsLoaded) {
    return <PageSkeleton />;
  }

  if (!member) {
    return <StaffNotFound />;
  }

  return (
    <PageContainer>
      <PageHeader
        title={member.name}
        subtitle={`${getBranchName(member.branch)} · ${getStaffRoleName(member.role)}`}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button href="/staff" variant="secondary">
          Back to Team
        </Button>
        <Button type="button" onClick={() => setShowPaymentDialog(true)}>
          Record Payment
        </Button>
      </div>

      <StaffSubnav />

      {paymentSummary && (
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Today
            </p>
            <div className="mt-2">
              <StaffPaymentStatusBadge paidToday={paymentSummary.paidToday} />
            </div>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Last Payment
            </p>
            <p className="mt-2 text-sm font-medium text-white">
              {formatLastPaymentDate(paymentSummary.lastPaymentDate)}
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Paid This Month
            </p>
            <p className="mt-2 text-lg font-semibold text-white tabular-nums">
              {formatCurrency(paymentSummary.monthTotal)}
            </p>
          </Card>
        </div>
      )}

      <section>
        <h2 className="mb-4 text-sm font-medium text-white">Payment History</h2>
        <StaffPaymentHistory payments={paymentHistory} />
      </section>

      {showPaymentDialog && (
        <StaffPaymentDialog
          staff={member}
          onClose={() => setShowPaymentDialog(false)}
        />
      )}
    </PageContainer>
  );
}
