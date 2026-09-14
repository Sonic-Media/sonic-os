"use client";

import { useEffect } from "react";
import Link from "next/link";
import { StaffDetailPanel } from "@/components/staff/staff-detail-panel";
import { StaffManagementBottomSections } from "@/components/staff/staff-management-bottom-sections";
import { StaffManagementFilters } from "@/components/staff/staff-management-filters";
import { StaffManagementKpis } from "@/components/staff/staff-management-kpis";
import { StaffMembersTable } from "@/components/staff/staff-members-table";
import { StaffSubnav } from "@/components/staff/staff-subnav";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useStaffManagementPage } from "@/hooks/use-staff-management-page";

export function StaffManagementWorkspace() {
  const {
    isLoaded,
    canSwitchBranch,
    getBranchName,
    search,
    setSearch,
    shiftFilter,
    setShiftFilter,
    branchFilter,
    setBranchFilter,
    statusFilter,
    setStatusFilter,
    selectedStaffId,
    setSelectedStaffId,
    filteredRows,
    selectedRow,
    kpis,
    recentActivity,
    todayAttendance,
  } = useStaffManagementPage();

  useEffect(() => {
    if (!selectedStaffId && filteredRows.length > 0) {
      setSelectedStaffId(filteredRows[0]!.member.id);
    }
  }, [filteredRows, selectedStaffId, setSelectedStaffId]);

  useEffect(() => {
    if (
      selectedStaffId &&
      !filteredRows.some((row) => row.member.id === selectedStaffId)
    ) {
      setSelectedStaffId(filteredRows[0]?.member.id ?? null);
    }
  }, [filteredRows, selectedStaffId, setSelectedStaffId]);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer className="space-y-6 pb-10">
      <PageHeader
        title="Staff Management"
        subtitle="Manage your team, shifts, and performance"
        showBranchBadge={!canSwitchBranch}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button href="/staff/payments" variant="secondary">
          View Payments
        </Button>
        <Button href="/staff/payments?record=1">Pay Staff</Button>
      </div>

      <StaffSubnav />

      <StaffManagementKpis
        totalStaff={kpis.totalStaff}
        onShiftNow={kpis.onShiftNow}
        totalHoursToday={kpis.totalHoursToday}
        pendingPayments={kpis.pendingPayments}
      />

      <StaffManagementFilters
        search={search}
        onSearchChange={setSearch}
        shiftFilter={shiftFilter}
        onShiftFilterChange={setShiftFilter}
        branchFilter={branchFilter}
        onBranchFilterChange={setBranchFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        canSwitchBranch={canSwitchBranch}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)] xl:items-start">
        <StaffMembersTable
          rows={filteredRows}
          selectedStaffId={selectedStaffId}
          onSelect={setSelectedStaffId}
          getBranchName={getBranchName}
        />
        <StaffDetailPanel row={selectedRow} getBranchName={getBranchName} />
      </div>

      <StaffManagementBottomSections
        todayAttendance={todayAttendance}
        recentActivity={recentActivity}
        monthlyStaffCosts={kpis.monthlyStaffCosts}
      />

      {filteredRows.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Staff records are managed in{" "}
          <Link href="/settings" className="text-indigo-300 underline">
            Settings
          </Link>{" "}
          for owners.
        </p>
      ) : null}
    </PageContainer>
  );
}
