import { usePurchasing } from "@/context/purchasing-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { useMemo } from "react";
import { computePurchasingDashboardMetrics } from "@/lib/purchasing/calculations";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { getTodayISO } from "@/lib/dates";

export function usePurchasingDashboard() {
  const { purchases } = usePurchasing();

  const { activeBranch } = useActiveBranch();

  const metrics = useMemo(() => {
    const branchPurchases = filterByBranchField(purchases, activeBranch);
    return computePurchasingDashboardMetrics(branchPurchases, getTodayISO());
  }, [purchases, activeBranch]);

  return { metrics };
}
