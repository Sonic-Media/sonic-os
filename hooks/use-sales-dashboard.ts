import { useSales } from "@/context/sales-context";

export function useSalesDashboard() {
  const { metrics } = useSales();
  return { metrics };
}
