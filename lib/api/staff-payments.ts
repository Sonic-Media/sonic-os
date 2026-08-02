import { apiGet, apiPost } from "@/lib/api/client";
import type { StaffPayment, StaffPaymentInput } from "@/types/staff-payment";
import type { StaffActionRecord } from "@/types/staff-session";

export async function fetchStaffPayments(): Promise<StaffPayment[]> {
  return apiGet<StaffPayment[]>("/api/staff-payments");
}

export async function createStaffPaymentApi(
  input: StaffPaymentInput & { paidBy?: StaffActionRecord }
): Promise<StaffPayment> {
  return apiPost<StaffPayment>("/api/staff-payments", input);
}
