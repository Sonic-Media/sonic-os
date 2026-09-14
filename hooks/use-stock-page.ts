"use client";

import { useEffect, useMemo, useState } from "react";
import { filterByBranchField } from "@/lib/active-branch/filters";
import {
  computeBranchNetQuantity,
  withProductStatus,
} from "@/lib/stock/calculations";
import {
  applyStockProductFilters,
  sortStockProducts,
} from "@/lib/stock/filters";
import { computeAuthoritativeBranchInventoryValue } from "@/lib/inventory/valuation";
import { useBranch } from "@/context/branch-context";
import { useStock } from "@/context/stock-context";
import type { Branch } from "@/types";
import type {
  StockCategoryFilter,
  StockProduct,
  StockStatusFilter,
} from "@/types/stock";

export type StockPageBranchFilter = "all" | Branch;

export interface StockPageKpis {
  totalItems: number;
  lowStock: number;
  outOfStock: number;
  totalStockValue: number;
}

function computeKpis(products: StockProduct[], totalStockValue: number): StockPageKpis {
  return {
    totalItems: products.length,
    lowStock: products.filter((product) => product.status === "low-stock").length,
    outOfStock: products.filter((product) => product.status === "out-of-stock")
      .length,
    totalStockValue,
  };
}

export function useStockPage() {
  const { products, movements, isLoaded } = useStock();
  const {
    activeBranch,
    activeBranches,
    canSwitchBranch,
    getBranchName,
    isLoaded: branchLoaded,
  } = useBranch();

  const [branchFilter, setBranchFilter] = useState<StockPageBranchFilter>("all");
  const [categoryFilter, setCategoryFilter] =
    useState<StockCategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>("all");
  const [search, setSearch] = useState("");

  const effectiveBranchFilter: StockPageBranchFilter = canSwitchBranch
    ? branchFilter
    : activeBranch;

  useEffect(() => {
    if (!canSwitchBranch) {
      setBranchFilter(activeBranch);
    }
  }, [activeBranch, canSwitchBranch]);

  const scopedProducts = useMemo(() => {
    const pool =
      effectiveBranchFilter === "all"
        ? products
        : filterByBranchField(products, effectiveBranchFilter);

    return pool.map((product) => {
      const stockBranch =
        effectiveBranchFilter === "all" ? product.branch : effectiveBranchFilter;
      const currentStock = computeBranchNetQuantity(
        stockBranch,
        product.id,
        movements
      );

      return withProductStatus({
        ...product,
        currentStock,
      });
    });
  }, [products, movements, effectiveBranchFilter]);

  const filteredProducts = useMemo(() => {
    const filtered = applyStockProductFilters(scopedProducts, {
      search,
      category: categoryFilter,
      status: statusFilter,
      sortField: "name",
      sortOrder: "asc",
    });

    return sortStockProducts(filtered, "name", "asc");
  }, [scopedProducts, search, categoryFilter, statusFilter]);

  const kpis = useMemo(() => {
    const totalStockValue =
      effectiveBranchFilter === "all"
        ? activeBranches.reduce(
            (sum, branch) =>
              sum +
              computeAuthoritativeBranchInventoryValue(
                branch,
                products,
                movements
              ),
            0
          )
        : (() => {
            const branchEntity = activeBranches.find(
              (branch) => branch.code === effectiveBranchFilter
            );
            if (!branchEntity) return 0;
            return computeAuthoritativeBranchInventoryValue(
              branchEntity,
              products,
              movements
            );
          })();

    return computeKpis(scopedProducts, totalStockValue);
  }, [
    scopedProducts,
    effectiveBranchFilter,
    activeBranches,
    products,
    movements,
  ]);

  return {
    isLoaded: isLoaded && branchLoaded,
    canSwitchBranch,
    getBranchName,
    activeBranches,
    filteredProducts,
    kpis,
    branchFilter: effectiveBranchFilter,
    setBranchFilter,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
  };
}
