"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { StaffNotFound } from "@/components/staff/staff-not-found";
import { StaffPaymentDialog } from "@/components/staff/staff-payment-dialog";
import { StaffProfileContent } from "@/components/staff/staff-profile-content";
import {
  StaffProfileTabNav,
  type StaffProfileTab,
} from "@/components/staff/staff-profile-tab-nav";
import { StaffSubnav } from "@/components/staff/staff-subnav";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import { getStaffRoleName } from "@/lib/staff/roles";
import { useStaffPayments } from "@/hooks/use-staff-payments";

export default function StaffProfilePage() {
  const params = useParams();
  const staffId = params.id as string;
  const { getStaffById, isLoaded: staffLoaded } = useStaff();
  const { getStaffDashboard, isLoaded: paymentsLoaded } = useStaffPayments();
  const { getBranchName } = useSettings();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<StaffProfileTab>("overview");

  const member = getStaffById(staffId);

  const dashboard = useMemo(
    () => (member ? getStaffDashboard(member) : null),
    [getStaffDashboard, member]
  );

  if (!staffLoaded || !paymentsLoaded) {
    return <PageSkeleton />;
  }

  if (!member || !dashboard) {
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
          Pay Staff
        </Button>
      </div>

      <StaffSubnav />
      <StaffProfileTabNav activeTab={activeTab} onTabChange={setActiveTab} />

      <StaffProfileContent
        member={member}
        branchName={getBranchName(member.branch)}
        todayStatus={dashboard.todayStatus}
        activity={dashboard.activity}
        payments={dashboard.payments}
        sales={dashboard.sales}
        inventory={dashboard.inventory}
        expenses={dashboard.expenses}
        loginHistory={dashboard.loginHistory}
        auditLog={dashboard.auditLog}
        purchases={dashboard.purchases}
        tab={activeTab}
      />

      {showPaymentDialog && (
        <StaffPaymentDialog
          staff={member}
          onClose={() => setShowPaymentDialog(false)}
        />
      )}
    </PageContainer>
  );
}
