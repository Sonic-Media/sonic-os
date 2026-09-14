"use client";

import { useMemo, useState } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { usePurchasing } from "@/context/purchasing-context";
import { filterByBranchField } from "@/lib/active-branch/filters";
import {
  getPurchaseDisplayStatus,
  type PurchaseDisplayStatus,
} from "@/lib/purchasing/display-status";
import type { Purchase } from "@/types/purchasing";

export type PurchasesPageStatusFilter = "all" | PurchaseDisplayStatus;

export interface PurchasesPageKpis {
  totalPurchases: number;
  suppliers: number;
  pendingDeliveries: number;
  lastPurchaseDate: string | null;
  lastPurchaseLabel: string | null;
}

function sortPurchases(purchases: Purchase[]): Purchase[] {
  return [...purchases].sort((left, right) => {
    const createdAtCompare = right.createdAt.localeCompare(left.createdAt);
    if (createdAtCompare !== 0) return createdAtCompare;
    return right.date.localeCompare(left.date);
  });
}

function computeKpis(purchases: Purchase[]): PurchasesPageKpis {
  if (purchases.length === 0) {
    return {
      totalPurchases: 0,
      suppliers: 0,
      pendingDeliveries: 0,
      lastPurchaseDate: null,
      lastPurchaseLabel: null,
    };
  }

  const supplierIds = new Set(purchases.map((purchase) => purchase.supplierId));
  const pendingDeliveries = purchases.filter(
    (purchase) => getPurchaseDisplayStatus(purchase) === "pending"
  ).length;
  const sorted = sortPurchases(purchases);
  const latest = sorted[0]!;

  return {
    totalPurchases: purchases.length,
    suppliers: supplierIds.size,
    pendingDeliveries,
    lastPurchaseDate: latest.date,
    lastPurchaseLabel: latest.supplierName,
  };
}

export function usePurchasesPage() {
  const { purchases, suppliers, isLoaded } = usePurchasing();
  const { activeBranch } = useActiveBranch();
  const [statusFilter, setStatusFilter] =
    useState<PurchasesPageStatusFilter>("all");

  const branchPurchases = useMemo(
    () => filterByBranchField(purchases, activeBranch),
    [purchases, activeBranch]
  );

  const filteredPurchases = useMemo(() => {
    const filtered =
      statusFilter === "all"
        ? branchPurchases
        : branchPurchases.filter(
            (purchase) => getPurchaseDisplayStatus(purchase) === statusFilter
          );

    return sortPurchases(filtered);
  }, [branchPurchases, statusFilter]);

  const kpis = useMemo(() => computeKpis(branchPurchases), [branchPurchases]);

  return {
    isLoaded,
    suppliers,
    filteredPurchases,
    kpis,
    statusFilter,
    setStatusFilter,
  };
}
