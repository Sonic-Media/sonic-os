"use client";

import { useMemo } from "react";
import { useStock } from "@/context/stock-context";
import {
  buildProductTimeline,
  computeProductMetrics,
  getLastStockMovement,
} from "@/lib/stock/calculations";

export function useStockProduct(productId: string) {
  const { getProductById, movements, priceChanges, isLoaded } = useStock();

  const product = getProductById(productId);

  const productMovements = useMemo(
    () => movements.filter((movement) => movement.productId === productId),
    [movements, productId]
  );

  const productPriceChanges = useMemo(
    () => priceChanges.filter((change) => change.productId === productId),
    [priceChanges, productId]
  );

  const metrics = useMemo(
    () =>
      product
        ? computeProductMetrics(product, productMovements)
        : null,
    [product, productMovements]
  );

  const timeline = useMemo(
    () =>
      product
        ? buildProductTimeline(product, productMovements, productPriceChanges)
        : [],
    [product, productMovements, productPriceChanges]
  );

  const lastStockIn = useMemo(
    () => getLastStockMovement(productMovements, "in"),
    [productMovements]
  );

  const lastStockOut = useMemo(
    () => getLastStockMovement(productMovements, "out"),
    [productMovements]
  );

  return {
    product,
    movements: productMovements,
    metrics,
    timeline,
    lastStockIn,
    lastStockOut,
    isLoaded,
  };
}
