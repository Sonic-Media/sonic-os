"use client";

import { useStock } from "@/context/stock-context";

export function useStockDashboard() {
  const { metrics } = useStock();

  return {
    metrics,
  };
}
