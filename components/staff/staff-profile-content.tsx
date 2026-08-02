"use client";

import { StaffPaymentHistory } from "@/components/staff/staff-payment-history";
import { StaffPaymentStatusBadge } from "@/components/staff/staff-payment-status-badge";
import { Card } from "@/components/shared/ui/card";
import { DATE_FORMATS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { getStaffRoleName } from "@/lib/staff/roles";
import type { StaffActivityItem } from "@/lib/staff/dashboard";
import type { AuthAuditRecord } from "@/types/auth";
import type { ExpenseRecord } from "@/types/expenses-module";
import type { Purchase } from "@/types/purchasing";
import type { Sale } from "@/types/sales";
import type { Staff } from "@/types";
import type { StaffAuditRecord } from "@/types/staff-audit";
import type { StaffPaymentRecord, StaffTodayStatus } from "@/types/staff-payment";

interface StaffProfileContentProps {
  member: Staff;
  branchName: string;
  todayStatus: StaffTodayStatus;
  activity: StaffActivityItem[];
  payments: StaffPaymentRecord[];
  sales: Sale[];
  inventory: StaffAuditRecord[];
  expenses: ExpenseRecord[];
  loginHistory: AuthAuditRecord[];
  auditLog: StaffAuditRecord[];
  purchases: Purchase[];
  tab: import("@/components/staff/staff-profile-tab-nav").StaffProfileTab;
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-UG", DATE_FORMATS.entryDisplay);
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-UG", {
    ...DATE_FORMATS.entryDisplay,
    ...DATE_FORMATS.time,
  });
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <p className="text-sm text-zinc-500">{message}</p>
    </Card>
  );
}

function AuditTable({
  rows,
}: {
  rows: { timestamp: string; action: string; module: string; branch: string; detail?: string }[];
}) {
  if (rows.length === 0) {
    return <EmptyState message="No audit records yet." />;
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <Card
          key={`${row.timestamp}-${row.action}-${row.module}`}
          className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-medium text-white">{row.action}</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {formatTimestamp(row.timestamp)} · {row.module} · {row.branch}
            </p>
            {row.detail && (
              <p className="mt-1 text-xs text-zinc-400">{row.detail}</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function StaffProfileContent({
  member,
  branchName,
  todayStatus,
  activity,
  payments,
  sales,
  inventory,
  expenses,
  loginHistory,
  auditLog,
  tab,
}: StaffProfileContentProps) {
  if (tab === "overview") {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Today</p>
            <div className="mt-2">
              <StaffPaymentStatusBadge paidToday={todayStatus.paidToday} />
            </div>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Paid This Month
            </p>
            <p className="mt-2 text-lg font-semibold text-white tabular-nums">
              {formatCurrency(todayStatus.monthTotal)}
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Today&apos;s Sales
            </p>
            <p className="mt-2 text-lg font-semibold text-white tabular-nums">
              {formatCurrency(todayStatus.todaySalesTotal)}
            </p>
          </Card>
        </div>

        <Card>
          <h3 className="text-sm font-medium text-white mb-4">Profile</h3>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Full Name</dt>
              <dd className="text-white">{member.name}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Username</dt>
              <dd className="text-white">{member.username ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Role</dt>
              <dd className="text-white">{getStaffRoleName(member.role)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Branch</dt>
              <dd className="text-white">{branchName}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Status</dt>
              <dd className="text-white capitalize">{member.status}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Phone</dt>
              <dd className="text-white">{member.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Email</dt>
              <dd className="text-white">{member.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Daily Wage</dt>
              <dd className="text-white">
                {member.dailyWage != null
                  ? formatCurrency(member.dailyWage)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Monthly Salary</dt>
              <dd className="text-white">
                {member.monthlySalary != null
                  ? formatCurrency(member.monthlySalary)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Date Joined</dt>
              <dd className="text-white">{formatDateLabel(member.dateJoined)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Emergency Contact</dt>
              <dd className="text-white">{member.emergencyContact ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Notes</dt>
              <dd className="text-white">{member.notes ?? "—"}</dd>
            </div>
          </dl>
        </Card>
      </div>
    );
  }

  if (tab === "activity") {
    return (
      <AuditTable
        rows={activity.map((item) => ({
          timestamp: item.timestamp,
          action: item.action,
          module: item.module,
          branch: item.branch,
          detail: item.detail,
        }))}
      />
    );
  }

  if (tab === "payments") {
    return <StaffPaymentHistory payments={payments} />;
  }

  if (tab === "sales") {
    if (sales.length === 0) {
      return <EmptyState message="No sales recorded for this staff member." />;
    }

    return (
      <div className="space-y-2">
        {sales.map((sale) => (
          <Card
            key={sale.id}
            className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium text-white">
                {sale.invoiceNumber}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {formatDateLabel(sale.date)} · {sale.branch}
              </p>
            </div>
            <p className="text-sm font-semibold text-white tabular-nums">
              {formatCurrency(sale.total)}
            </p>
          </Card>
        ))}
      </div>
    );
  }

  if (tab === "inventory") {
    return (
      <AuditTable
        rows={inventory.map((item) => ({
          timestamp: item.timestamp,
          action: item.action,
          module: item.module,
          branch: item.branch,
          detail: item.detail,
        }))}
      />
    );
  }

  if (tab === "expenses") {
    if (expenses.length === 0) {
      return <EmptyState message="No expenses linked to this staff member." />;
    }

    return (
      <div className="space-y-2">
        {expenses.map((expense) => (
          <Card
            key={expense.id}
            className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium text-white">
                {expense.description}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {formatDateLabel(expense.date)} · {expense.categoryName}
              </p>
            </div>
            <p className="text-sm font-semibold text-white tabular-nums">
              {formatCurrency(expense.amount)}
            </p>
          </Card>
        ))}
      </div>
    );
  }

  if (tab === "login-history") {
    if (loginHistory.length === 0) {
      return <EmptyState message="No login history for this staff member." />;
    }

    return (
      <AuditTable
        rows={loginHistory.map((record) => ({
          timestamp: record.timestamp,
          action: record.action === "login" ? "Login" : "Logout",
          module: "auth",
          branch: record.branch,
          detail: record.detail,
        }))}
      />
    );
  }

  return (
    <AuditTable
      rows={auditLog.map((record) => ({
        timestamp: record.timestamp,
        action: record.action,
        module: record.module,
        branch: record.branch,
        detail: record.detail,
      }))}
    />
  );
}
