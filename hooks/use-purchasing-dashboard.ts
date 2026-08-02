import { usePurchasing } from "@/context/purchasing-context";

export function usePurchasingDashboard() {
  const { metrics } = usePurchasing();
  return { metrics };
}
