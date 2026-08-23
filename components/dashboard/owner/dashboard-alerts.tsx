"use client";

import { useOwnerDashboardAlerts } from "@/hooks/use-owner-dashboard-alerts";
import { OwnerCard, OwnerSectionTitle } from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";
import type { ReportSummary } from "@/types";

interface DashboardAlertsProps {
  summary: ReportSummary;
}

export function DashboardAlerts({ summary }: DashboardAlertsProps) {
  const alerts = useOwnerDashboardAlerts(summary);

  return (
    <OwnerCard>
      <OwnerSectionTitle>Alerts</OwnerSectionTitle>

      {alerts.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] px-5 py-5">
          <p className="text-sm font-medium text-emerald-300">
            Everything looks good today.
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            No urgent issues need your attention right now.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "rounded-2xl border px-5 py-4 transition-all duration-300 hover:-translate-y-0.5",
                alert.tone === "warning"
                  ? "border-amber-500/15 bg-amber-500/[0.05]"
                  : "border-white/[0.06] bg-zinc-900/40"
              )}
            >
              <p
                className={cn(
                  "text-sm font-medium",
                  alert.tone === "warning" ? "text-amber-300" : "text-zinc-200"
                )}
              >
                {alert.tone === "warning" ? "⚠ " : "• "}
                {alert.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </OwnerCard>
  );
}
