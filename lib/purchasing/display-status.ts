import { getTodayISO } from "@/lib/dates";
import type { Purchase } from "@/types/purchasing";

export type PurchaseDisplayStatus = "received" | "pending";

/**
 * Presentation-only status for the purchasing UI.
 * Persisted purchases with a future business date are treated as pending deliveries;
 * all others are received (stock intake completed at record time).
 */
export function getPurchaseDisplayStatus(
  purchase: Purchase
): PurchaseDisplayStatus {
  return purchase.date > getTodayISO() ? "pending" : "received";
}

export function getPurchaseDisplayStatusLabel(
  status: PurchaseDisplayStatus
): string {
  return status === "pending" ? "Pending" : "Received";
}
