import { apiGet, apiPost } from "@/lib/api/client";
import type { Purchase, PurchaseInput } from "@/types/purchasing";

export async function fetchPurchases(): Promise<Purchase[]> {
  return apiGet<Purchase[]>("/api/purchases");
}

export async function createPurchaseApi(
  input: PurchaseInput
): Promise<Purchase> {
  return apiPost<Purchase>("/api/purchases", input);
}
