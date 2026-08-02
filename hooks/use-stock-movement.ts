"use client";

import { useStock } from "@/context/stock-context";

export function useStockMovement() {
  const { movements } = useStock();

  return {
    movements,
  };
}
