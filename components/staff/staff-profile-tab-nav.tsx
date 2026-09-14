"use client";

import { cn } from "@/lib/utils";

export type StaffProfileTab =
  | "overview"
  | "attendance"
  | "activity"
  | "payments"
  | "sales"
  | "inventory"
  | "expenses"
  | "login-history"
  | "audit-log";

export const STAFF_PROFILE_TABS: { id: StaffProfileTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "attendance", label: "Attendance" },
  { id: "payments", label: "Payments" },
  { id: "activity", label: "Activity" },
  { id: "sales", label: "Sales" },
  { id: "inventory", label: "Inventory" },
  { id: "expenses", label: "Expenses" },
  { id: "login-history", label: "Login History" },
  { id: "audit-log", label: "Audit Log" },
];

interface StaffProfileTabNavProps {
  activeTab: StaffProfileTab;
  onTabChange: (tab: StaffProfileTab) => void;
}

export function StaffProfileTabNav({
  activeTab,
  onTabChange,
}: StaffProfileTabNavProps) {
  return (
    <nav className="mb-8">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STAFF_PROFILE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-xl px-4 text-sm font-medium transition-all duration-200",
              activeTab === tab.id
                ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/15 text-white ring-1 ring-indigo-500/30"
                : "border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
