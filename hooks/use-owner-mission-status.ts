"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useOwnerDashboardAlerts } from "@/hooks/use-owner-dashboard-alerts";
import { useBusinessHealth } from "@/hooks/use-business-health";
import { getTodayISO } from "@/lib/dates";
import type { BranchProgress, ReportSummary } from "@/types";

export interface MissionStatus {
  emoji: string;
  label: string;
  message: string;
  tone: "healthy" | "waiting" | "attention";
}

export function useOwnerMissionStatus(
  summary: ReportSummary,
  progress: BranchProgress[]
) {
  const today = getTodayISO();
  const { activeBranch } = useActiveBranch();
  const { isBranchDayClosed, isBranchDayOpened, isLoaded } = useDayClosing();
  const health = useBusinessHealth(summary);
  const alerts = useOwnerDashboardAlerts(summary);

  return useMemo(() => {
    const isOpen = isBranchDayOpened(activeBranch, today);
    const isClosed = isBranchDayClosed(activeBranch, today);
    const warningAlerts = alerts.filter((alert) => alert.tone === "warning");
    const pendingBranches = progress.filter((item) => !item.completed);

    if (!isLoaded) {
      return {
        emoji: "🟡",
        label: "Loading Status",
        message: "Syncing today's branch activity.",
        tone: "waiting" as const,
      };
    }

    if (!isOpen && !isClosed) {
      return {
        emoji: "🟡",
        label: "Waiting for Shift Start",
        message: "Open the branch to begin today's operating rhythm.",
        tone: "waiting" as const,
      };
    }

    if (
      warningAlerts.length > 0 ||
      health.label === "Needs Attention" ||
      pendingBranches.length > 0
    ) {
      const topAlert = warningAlerts[0]?.message;
      return {
        emoji: "🔴",
        label: "Attention Needed",
        message:
          topAlert ??
          (pendingBranches.length > 0
            ? "Today's workflow still has pending steps."
            : "Review alerts and complete outstanding tasks."),
        tone: "attention" as const,
      };
    }

    if (health.label === "In Progress" || !isClosed) {
      return {
        emoji: "🟡",
        label: "Day In Progress",
        message: isClosed
          ? "Today is closed. Review performance before tomorrow."
          : `${health.completedCount} of ${health.totalCount} daily checkpoints complete.`,
        tone: "waiting" as const,
      };
    }

    return {
      emoji: "🟢",
      label: "Business Healthy",
      message: "Today's operations are on track.",
      tone: "healthy" as const,
    };
  }, [
    activeBranch,
    alerts,
    health.completedCount,
    health.label,
    health.totalCount,
    isBranchDayClosed,
    isBranchDayOpened,
    isLoaded,
    progress,
    today,
  ]);
}
