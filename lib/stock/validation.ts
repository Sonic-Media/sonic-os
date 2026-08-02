import { parseAmount } from "@/lib/amounts";
import type {
  StockMovementInput,
  StockProductInput,
  StockProductUpdateInput,
} from "@/types/stock";

export interface StockValidationErrors {
  [field: string]: string | undefined;
}

export function validateStockProductInput(
  input: StockProductInput,
  options?: { isEdit?: boolean }
): StockValidationErrors {
  const errors: StockValidationErrors = {};
  const name = input.name.trim();

  if (!name) {
    errors.name = "Item name is required.";
  }

  if (input.buyingPrice <= 0) {
    errors.buyingPrice = "Buying price must be a positive number.";
  }

  if (input.sellingPrice <= 0) {
    errors.sellingPrice = "Selling price must be a positive number.";
  }

  if (!options?.isEdit) {
    const initialStock = input.initialStock ?? 0;
    if (
      input.initialStock !== undefined &&
      (!Number.isInteger(initialStock) || initialStock < 0)
    ) {
      errors.initialStock = "Opening stock cannot be negative.";
    }
  }

  if (
    !Number.isInteger(input.minimumStockLevel) ||
    input.minimumStockLevel < 0
  ) {
    errors.minimumStockLevel = "Minimum stock level cannot be negative.";
  }

  return errors;
}

export function validateStockProductUpdateInput(
  input: StockProductUpdateInput
): StockValidationErrors {
  return validateStockProductInput(
    {
      ...input,
      initialStock: 0,
    },
    { isEdit: true }
  );
}

export function validateStockMovementInput(
  input: StockMovementInput,
  currentStock: number
): StockValidationErrors {
  const errors: StockValidationErrors = {};

  if (!input.productId) {
    errors.productId = "Select an item.";
  }

  if (!input.reason.trim()) {
    errors.reason = "Reason is required.";
  }

  if (!input.branch?.trim()) {
    errors.branch = "Select a branch.";
  }

  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    errors.quantity = "Quantity must be a positive whole number.";
  }

  if (
    input.movement === "out" &&
    Number.isInteger(input.quantity) &&
    input.quantity > currentStock
  ) {
    errors.quantity = `Cannot remove more than current stock (${currentStock.toLocaleString("en-UG")}).`;
  }

  return errors;
}

export function hasValidationErrors(errors: StockValidationErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = parseAmount(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function parsePositivePrice(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = parseAmount(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}
