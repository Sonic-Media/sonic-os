import { appendBranchQuery } from "@/lib/api/branch-request";
import { apiGet, apiPost } from "@/lib/api/client";
import type { Branch } from "@/types";
import type { BranchSaleProduct, Sale } from "@/types/sales";

export async function fetchSales(): Promise<Sale[]> {
  return apiGet<Sale[]>("/api/sales");
}

export async function fetchBranchProductsForSale(
  branch?: Branch
): Promise<BranchSaleProduct[]> {
  return apiGet<BranchSaleProduct[]>(
    appendBranchQuery("/api/sales/branch-products", branch ?? null)
  );
}

export async function createSaleApi(sale: Sale): Promise<Sale> {
  return apiPost<Sale>("/api/sales", sale);
}
