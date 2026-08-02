"use client";

import { useState } from "react";
import { StockDialog, StockFieldError } from "@/components/stock/stock-dialog";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { Textarea } from "@/components/shared/ui/textarea";
import { useStock } from "@/context/stock-context";
import { STOCK_PRODUCT_CATEGORIES } from "@/lib/stock/constants";
import {
  parsePositiveInteger,
  parsePositivePrice,
} from "@/lib/stock/validation";
import type {
  StockProduct,
  StockProductCategory,
  StockProductInput,
  StockProductUpdateInput,
} from "@/types/stock";

interface StockProductDialogProps {
  mode: "add" | "edit";
  product?: StockProduct;
  onClose: () => void;
  onSuccess?: (product?: StockProduct) => void;
}

const CATEGORY_OPTIONS = STOCK_PRODUCT_CATEGORIES.map((category) => ({
  value: category.id,
  label: category.label,
}));

const EMPTY_FORM = {
  name: "",
  category: "" as StockProductCategory | "",
  sku: "",
  buyingPrice: "",
  sellingPrice: "",
  minimumStockLevel: "0",
  notes: "",
};

function createFormState(
  mode: "add" | "edit",
  product?: StockProductDialogProps["product"]
) {
  if (mode === "edit" && product) {
    return {
      name: product.name,
      category: product.category,
      sku: product.sku ?? "",
      buyingPrice: String(product.buyingPrice),
      sellingPrice: String(product.sellingPrice),
      minimumStockLevel: String(product.minimumStockLevel),
      notes: product.notes ?? "",
    };
  }

  return { ...EMPTY_FORM };
}

export function StockProductDialog({
  mode,
  product,
  onClose,
  onSuccess,
}: StockProductDialogProps) {
  const { addProduct, updateProduct } = useStock();
  const [form, setForm] = useState(() => createFormState(mode, product));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | undefined>();

  function updateField<K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
    setFormError(undefined);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(undefined);

    const buyingPrice = parsePositivePrice(form.buyingPrice);
    const sellingPrice = parsePositivePrice(form.sellingPrice);
    const minimumStockLevel = parsePositiveInteger(form.minimumStockLevel);

    const nextErrors: Record<string, string | undefined> = {};

    if (!form.category) {
      nextErrors.category = "Category is required.";
    }

    if (buyingPrice === null) {
      nextErrors.buyingPrice = "Buying price must be a positive number.";
    }

    if (sellingPrice === null) {
      nextErrors.sellingPrice = "Selling price must be a positive number.";
    }

    if (minimumStockLevel === null) {
      nextErrors.minimumStockLevel = "Minimum stock level cannot be negative.";
    }

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }

    if (mode === "add") {
      const input: StockProductInput = {
        name: form.name,
        category: form.category as StockProductCategory,
        sku: form.sku,
        buyingPrice: buyingPrice!,
        sellingPrice: sellingPrice!,
        minimumStockLevel: minimumStockLevel!,
        notes: form.notes,
      };

      const result = addProduct(input);
      if (!result.success) {
        setErrors(result.errors);
        setFormError(result.errors.form);
        return;
      }

      onSuccess?.(result.product);
      return;
    } else if (product) {
      const input: StockProductUpdateInput = {
        name: form.name,
        category: form.category as StockProductCategory,
        sku: form.sku,
        buyingPrice: buyingPrice!,
        sellingPrice: sellingPrice!,
        minimumStockLevel: minimumStockLevel!,
        notes: form.notes,
      };

      const result = updateProduct(product.id, input);
      if (!result.success) {
        setErrors(result.errors);
        setFormError(result.errors.form);
        return;
      }
    }

    onSuccess?.();
    onClose();
  }

  return (
    <StockDialog
      title={mode === "add" ? "Add Item" : "Edit Item"}
      description={
        mode === "add"
          ? "Add a new product to your global catalog. Opening stock is recorded after creation."
          : "Update item details. Stock levels can only change through stock movements."
      }
      onClose={onClose}
      className="max-w-xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="stock-product-form">
            {mode === "add" ? "Add Item" : "Save Changes"}
          </Button>
        </div>
      }
    >
      <form id="stock-product-form" className="space-y-4" onSubmit={handleSubmit}>
        {formError && <StockFieldError message={formError} />}

        <div>
          <Input
            label="Item Name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="e.g. SanDisk 32GB Flash Disk"
            required
          />
          <StockFieldError message={errors.name} />
        </div>

        <div>
          <Select
            label="Category"
            value={form.category}
            placeholder="Select category"
            options={CATEGORY_OPTIONS}
            onChange={(event) =>
              updateField("category", event.target.value as StockProductCategory)
            }
          />
          <StockFieldError message={errors.category} />
        </div>

        <Input
          label="SKU (optional)"
          value={form.sku}
          onChange={(event) => updateField("sku", event.target.value)}
          placeholder="Product code"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Input
              label="Buying Price (UGX)"
              type="number"
              min="0"
              step="1"
              value={form.buyingPrice}
              onChange={(event) => updateField("buyingPrice", event.target.value)}
              placeholder="0"
            />
            <StockFieldError message={errors.buyingPrice} />
          </div>

          <div>
            <Input
              label="Selling Price (UGX)"
              type="number"
              min="0"
              step="1"
              value={form.sellingPrice}
              onChange={(event) => updateField("sellingPrice", event.target.value)}
              placeholder="0"
            />
            <StockFieldError message={errors.sellingPrice} />
          </div>
        </div>

        {mode === "edit" && product && (
          <Input
            label="Total Stock"
            value={product.currentStock.toLocaleString("en-UG")}
            readOnly
            hint="Use Stock In or Stock Out to change quantity."
          />
        )}

        <div>
          <Input
            label="Minimum Stock Level"
            type="number"
            min="0"
            step="1"
            value={form.minimumStockLevel}
            onChange={(event) =>
              updateField("minimumStockLevel", event.target.value)
            }
          />
          <StockFieldError message={errors.minimumStockLevel} />
        </div>

        <Textarea
          label="Notes (optional)"
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Additional details"
        />
      </form>
    </StockDialog>
  );
}
