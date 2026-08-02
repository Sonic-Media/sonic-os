import type { SaleInput, CustomerInput, CustomerUpdateInput } from "@/types/sales";

export function hasValidationErrors(
  errors: Record<string, string | undefined>
): boolean {
  return Object.values(errors).some(Boolean);
}

export function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
}

export function parseNonNegativeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return parsed;
}

export function parsePositivePrice(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
}

export function validateSaleInput(
  input: SaleInput,
  availableStock: number
): Record<string, string | undefined> {
  const errors: Record<string, string | undefined> = {};

  if (!input.productId) {
    errors.productId = "Select an item.";
  }

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    errors.quantity = "Quantity must be a positive whole number.";
  } else if (!Number.isInteger(input.quantity)) {
    errors.quantity = "Quantity must be a whole number.";
  } else if (input.quantity > availableStock) {
    errors.quantity = `Cannot exceed available stock (${availableStock.toLocaleString("en-UG")}).`;
  }

  if (!Number.isFinite(input.unitPrice) || input.unitPrice <= 0) {
    errors.unitPrice = "Selling price must be greater than zero.";
  }

  if (input.discount !== undefined) {
    if (!Number.isFinite(input.discount) || input.discount < 0) {
      errors.discount = "Discount cannot be negative.";
    } else if (input.discount > input.quantity * input.unitPrice) {
      errors.discount = "Discount cannot exceed subtotal.";
    }
  }

  if (!input.paymentMethod) {
    errors.paymentMethod = "Select a payment method.";
  }

  if (!input.branch?.trim()) {
    errors.branch = "Select a branch.";
  }

  return errors;
}

export function validateCustomerInput(
  input: CustomerInput | CustomerUpdateInput
): Record<string, string | undefined> {
  const errors: Record<string, string | undefined> = {};

  if (!input.name.trim()) {
    errors.name = "Customer name is required.";
  }

  if (input.email?.trim()) {
    const email = input.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address.";
    }
  }

  return errors;
}
