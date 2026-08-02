import type { StaffPaymentInput } from "@/types/staff-payment";

export function validateStaffPaymentInput(
  input: StaffPaymentInput
): Record<string, string | undefined> {
  const errors: Record<string, string | undefined> = {};

  if (!input.staffId) {
    errors.staffId = "Select a staff member.";
  }

  if (!input.date.trim()) {
    errors.date = "Date is required.";
  }

  if (!input.paymentType) {
    errors.paymentType = "Select a payment type.";
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.amount = "Amount must be greater than zero.";
  }

  if (!input.paymentMethod) {
    errors.paymentMethod = "Select a payment method.";
  }

  return errors;
}
