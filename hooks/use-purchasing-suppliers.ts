import { useMemo } from "react";
import { usePurchasing } from "@/context/purchasing-context";
import { computeSupplierStats } from "@/lib/purchasing/calculations";

export function usePurchasingSuppliers() {
  const { suppliers, purchases } = usePurchasing();

  const suppliersWithStats = useMemo(
    () =>
      suppliers.map((supplier) => computeSupplierStats(supplier, purchases)),
    [suppliers, purchases]
  );

  return { suppliers: suppliersWithStats };
}
