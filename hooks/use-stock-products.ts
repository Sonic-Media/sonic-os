"use client";

import { useMemo, useState } from "react";
import { useStock } from "@/context/stock-context";
import {
  applyStockProductFilters,
  createDefaultStockProductFilterCriteria,
  sortStockProducts,
} from "@/lib/stock/filters";
import type { StockProductFilterCriteria } from "@/types/stock";

export function useStockProducts() {
  const { products } = useStock();
  const [criteria, setCriteria] = useState<StockProductFilterCriteria>(
    createDefaultStockProductFilterCriteria
  );

  const filteredProducts = useMemo(() => {
    const filtered = applyStockProductFilters(products, criteria);
    return sortStockProducts(filtered, criteria.sortField, criteria.sortOrder);
  }, [products, criteria]);

  const updateCriteria = (patch: Partial<StockProductFilterCriteria>) => {
    setCriteria((current) => ({ ...current, ...patch }));
  };

  return {
    criteria,
    products: filteredProducts,
    allProducts: products,
    updateCriteria,
  };
}
