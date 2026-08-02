"use client";

import { cn } from "@/lib/utils";

export type StaffProfileTab =
  | "overview"
  | "activity"
  | "payments"
  | "sales"
  | "inventory"
  | "expenses"
  | "login-history"
  | "audit-log";

export const STAFF_PROFILE_TABS: { id: StaffProfileTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "payments", label: "Payments" },
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
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {STAFF_PROFILE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex-shrink-0 h-10 px-5 rounded-xl text-sm font-medium transition-all duration-200 inline-flex items-center",
              activeTab === tab.id
                ? "bg-white text-black"
                : "bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:border-zinc-600"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
