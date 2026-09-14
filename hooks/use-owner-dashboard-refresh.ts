"use client";

import { useManagementDashboardRefresh } from "@/hooks/use-management-dashboard-refresh";

export function useOwnerDashboardRefresh(): void {
  useManagementDashboardRefresh();
}
