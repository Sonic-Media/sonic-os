import { apiGet, apiPost } from "@/lib/api/client";
import type { Sale } from "@/types/sales";

export async function fetchSales(): Promise<Sale[]> {
  return apiGet<Sale[]>("/api/sales");
}

export async function createSaleApi(sale: Sale): Promise<Sale> {
  return apiPost<Sale>("/api/sales", sale);
}
