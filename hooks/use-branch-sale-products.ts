"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchBranchProductsForSale } from "@/lib/api/sales";
import { getDataSourceErrorMessage } from "@/lib/data-source/context-api";
import type { Branch } from "@/types";
import type { BranchSaleProduct } from "@/types/sales";

export function useBranchSaleProducts(branch: Branch, enabled = true) {
  const [products, setProducts] = useState<BranchSaleProduct[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setProducts([]);
      setLoadError(null);
      setIsLoaded(true);
      return;
    }

    const currentRequest = ++requestId.current;

    try {
      const remoteProducts = await fetchBranchProductsForSale(branch);
      if (currentRequest !== requestId.current) return;

      setProducts(remoteProducts);
      setLoadError(null);
    } catch (error) {
      if (currentRequest !== requestId.current) return;

      setProducts([]);
      setLoadError(getDataSourceErrorMessage(error));
    } finally {
      if (currentRequest === requestId.current) {
        setIsLoaded(true);
      }
    }
  }, [branch, enabled]);

  useEffect(() => {
    setIsLoaded(false);
    void refresh();
  }, [refresh]);

  return {
    products,
    isLoaded,
    loadError,
    refresh,
  };
}
