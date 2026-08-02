"use client";

import { useMemo } from "react";
import { useBranches } from "@/context/branches-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSales } from "@/context/sales-context";
import { useStaff } from "@/context/staff-context";
import { useStock } from "@/context/stock-context";
import { computeOwnerCommandCenter } from "@/lib/owner-command-center/calculations";

export function useOwnerCommandCenter() {
  const { branches, isLoaded: branchesLoaded } = useBranches();
  const { sales, isLoaded: salesLoaded } = useSales();
  const { purchases, isLoaded: purchasingLoaded } = usePurchasing();
  const { expenses, isLoaded: expensesLoaded } = useExpensesModule();
  const { entries, isLoaded: entriesLoaded } = useEntriesContext();
  const { products, movements, isLoaded: stockLoaded } = useStock();
  const { staff, isLoaded: staffLoaded } = useStaff();

  const metrics = useMemo(
    () =>
      computeOwnerCommandCenter(
        branches,
        sales,
        purchases,
        expenses,
        entries,
        products,
        movements,
        staff
      ),
    [branches, sales, purchases, expenses, entries, products, movements, staff]
  );

  return {
    metrics,
    sales,
    expenses,
    isLoaded:
      branchesLoaded &&
      salesLoaded &&
      purchasingLoaded &&
      expensesLoaded &&
      entriesLoaded &&
      stockLoaded &&
      staffLoaded,
  };
}
