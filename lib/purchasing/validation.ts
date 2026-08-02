import type {
  PurchaseInput,
  PurchaseLineItemInput,
  SupplierInput,
  SupplierUpdateInput,
} from "@/types/purchasing";

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

export function parsePositivePrice(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
}

export function validatePurchaseLineItemInput(
  item: PurchaseLineItemInput,
  index: number
): Record<string, string | undefined> {
  const errors: Record<string, string | undefined> = {};
  const prefix = `items.${index}`;

  if (!item.productId) {
    errors[`${prefix}.productId`] = "Select a product.";
  }

  if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
    errors[`${prefix}.quantity`] = "Quantity must be a positive whole number.";
  } else if (!Number.isInteger(item.quantity)) {
    errors[`${prefix}.quantity`] = "Quantity must be a whole number.";
  }

  if (!Number.isFinite(item.buyingPrice) || item.buyingPrice <= 0) {
    errors[`${prefix}.buyingPrice`] =
      "Buying price must be greater than zero.";
  }

  return errors;
}

export function validatePurchaseInput(
  input: PurchaseInput
): Record<string, string | undefined> {
  const errors: Record<string, string | undefined> = {};

  if (!input.supplierId) {
    errors.supplierId = "Select a supplier.";
  }

  if (!input.branch?.trim()) {
    errors.branch = "Select a branch.";
  }

  if (!input.items.length) {
    errors.items = "Add at least one product.";
  }

  input.items.forEach((item, index) => {
    const itemErrors = validatePurchaseLineItemInput(item, index);
    Object.assign(errors, itemErrors);
  });

  return errors;
}

export function validateSupplierInput(
  input: SupplierInput | SupplierUpdateInput
): Record<string, string | undefined> {
  const errors: Record<string, string | undefined> = {};

  if (!input.name.trim()) {
    errors.name = "Supplier name is required.";
  }

  if (input.email?.trim()) {
    const email = input.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address.";
    }
  }

  return errors;
}
