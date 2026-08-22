import { apiGet, apiPost } from "@/lib/api/client";
import type { Branch } from "@/types";
import type { BranchSaleProduct, Sale } from "@/types/sales";

export async function fetchSales(): Promise<Sale[]> {
  return apiGet<Sale[]>("/api/sales");
}

export async function fetchBranchProductsForSale(
  branch: Branch
): Promise<BranchSaleProduct[]> {
  const params = new URLSearchParams({ branch });
  return apiGet<BranchSaleProduct[]>(`/api/sales/branch-products?${params}`);
}

export async function createSaleApi(sale: Sale): Promise<Sale> {
  return apiPost<Sale>("/api/sales", sale);
}
