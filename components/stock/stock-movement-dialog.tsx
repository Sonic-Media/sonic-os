"use client";

import { useMemo, useState } from "react";
import { StockDialog, StockFieldError } from "@/components/stock/stock-dialog";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { Textarea } from "@/components/shared/ui/textarea";
import { useStock } from "@/context/stock-context";
import { STOCK_MOVEMENT_REASONS } from "@/lib/stock/constants";
import { parsePositiveInteger } from "@/lib/stock/validation";
import type { Branch } from "@/types";
import type { StockMovementType } from "@/types/stock";

interface StockMovementDialogProps {
  movementType: StockMovementType;
  initialProductId?: string;
  defaultBranch: Branch;
  onBranchChange?: (branch: Branch) => void;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StockMovementDialog({
  movementType,
  initialProductId,
  defaultBranch,
  onBranchChange,
  onClose,
  onSuccess,
}: StockMovementDialogProps) {
  const { products, recordMovement } = useStock();
  const [productId, setProductId] = useState(initialProductId ?? "");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: product.id,
        label: `${product.name} (${product.currentStock.toLocaleString("en-UG")} in stock)`,
      })),
    [products]
  );

  const reasonOptions = STOCK_MOVEMENT_REASONS[movementType].map((item) => ({
    value: item,
    label: item,
  }));

  const selectedProduct = products.find((product) => product.id === productId);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsedQuantity = parsePositiveInteger(quantity);
    const nextErrors: Record<string, string | undefined> = {};

    if (!productId) {
      nextErrors.productId = "Select an item.";
    }

    if (!reason.trim()) {
      nextErrors.reason = "Reason is required.";
    }

    if (parsedQuantity === null || parsedQuantity <= 0) {
      nextErrors.quantity = "Quantity must be a positive whole number.";
    }

    if (
      movementType === "out" &&
      selectedProduct &&
      parsedQuantity !== null &&
      parsedQuantity > selectedProduct.currentStock
    ) {
      nextErrors.quantity = `Cannot remove more than current stock (${selectedProduct.currentStock.toLocaleString("en-UG")}).`;
    }

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }

    const result = recordMovement({
      productId,
      movement: movementType,
      quantity: parsedQuantity!,
      reason,
      branch: defaultBranch,
      notes,
    });

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    onBranchChange?.(defaultBranch);
    onSuccess?.();
    onClose();
  }

  return (
    <StockDialog
      title={movementType === "in" ? "Stock In" : "Stock Out"}
      description={
        movementType === "in"
          ? "Record incoming stock for an item."
          : "Record outgoing stock. Quantity cannot exceed current stock."
      }
      onClose={onClose}
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="stock-movement-form">
            Record {movementType === "in" ? "Stock In" : "Stock Out"}
          </Button>
        </div>
      }
    >
      <form
        id="stock-movement-form"
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        {products.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Add an item before recording stock movements.
          </p>
        ) : (
          <>
            <div>
              <Select
                label="Item"
                value={productId}
                placeholder="Select item"
                options={productOptions}
                onChange={(event) => {
                  setProductId(event.target.value);
                  setErrors((current) => ({
                    ...current,
                    productId: undefined,
                    quantity: undefined,
                  }));
                }}
              />
              <StockFieldError message={errors.productId} />
            </div>

            <div>
              <Input
                label="Quantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value);
                  setErrors((current) => ({ ...current, quantity: undefined }));
                }}
                placeholder="0"
              />
              <StockFieldError message={errors.quantity} />
              {selectedProduct && (
                <p className="mt-1 text-xs text-zinc-500">
                  Available: {selectedProduct.currentStock.toLocaleString("en-UG")}
                </p>
              )}
            </div>

            <div>
              <Select
                label="Reason"
                value={reason}
                placeholder="Select reason"
                options={reasonOptions}
                onChange={(event) => {
                  setReason(event.target.value);
                  setErrors((current) => ({ ...current, reason: undefined }));
                }}
              />
              <StockFieldError message={errors.reason} />
            </div>

            <Textarea
              label="Notes (optional)"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Additional details"
            />
          </>
        )}
      </form>
    </StockDialog>
  );
}
