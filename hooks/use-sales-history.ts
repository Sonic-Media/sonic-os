"use client";

import { useMemo, useState } from "react";
import { useSales } from "@/context/sales-context";
import {
  applySaleFilters,
  createDefaultSaleFilterCriteria,
} from "@/lib/sales/filters";
import type { SaleFilterCriteria } from "@/types/sales";

export function useSalesHistory() {
  const { sales } = useSales();
  const [criteria, setCriteria] = useState<SaleFilterCriteria>(
    createDefaultSaleFilterCriteria
  );

  const filteredSales = useMemo(
    () => applySaleFilters(sales, criteria),
    [sales, criteria]
  );

  function updateCriteria(patch: Partial<SaleFilterCriteria>) {
    setCriteria((current) => ({ ...current, ...patch }));
  }

  return {
    criteria,
    sales: filteredSales,
    allSales: sales,
    updateCriteria,
  };
}
