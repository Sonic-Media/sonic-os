"use client";

import { useState } from "react";
import { StockDialog, StockFieldError } from "@/components/stock/stock-dialog";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { useStock } from "@/context/stock-context";
import { parsePositiveInteger } from "@/lib/stock/validation";
import type { Branch } from "@/types";
import type { StockProduct } from "@/types/stock";

interface OpeningStockDialogProps {
  product: StockProduct;
  defaultBranch: Branch;
  onClose: () => void;
  onComplete?: () => void;
}

export function OpeningStockDialog({
  product,
  defaultBranch,
  onClose,
  onComplete,
}: OpeningStockDialogProps) {
  const { recordMovement } = useStock();
  const [quantity, setQuantity] = useState("0");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSkip() {
    onComplete?.();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    const parsedQuantity = parsePositiveInteger(quantity);
    if (parsedQuantity === null) {
      setErrors({ quantity: "Opening stock cannot be negative." });
      return;
    }

    if (parsedQuantity === 0) {
      handleSkip();
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await recordMovement({
        productId: product.id,
        movement: "in",
        quantity: parsedQuantity,
        reason: "Opening Balance",
        branch: defaultBranch,
        notes: "Initial stock on item creation",
      });

      if (!result.success) {
        setErrors(result.errors);
        return;
      }

      onComplete?.();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <StockDialog
      title="Opening Stock"
      description={`Set the opening balance for ${product.name}. This is recorded as a stock-in movement.`}
      onClose={isSubmitting ? () => undefined : handleSkip}
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={handleSkip}
            disabled={isSubmitting}
          >
            Skip
          </Button>
          <Button
            type="submit"
            form="opening-stock-form"
            loading={isSubmitting}
            loadingLabel="Saving..."
            disabled={isSubmitting}
          >
            Save Opening Stock
          </Button>
        </div>
      }
    >
      <form id="opening-stock-form" className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Input
            label="Opening Quantity"
            type="number"
            min="0"
            step="1"
            value={quantity}
            onChange={(event) => {
              setQuantity(event.target.value);
              setErrors((current) => ({ ...current, quantity: undefined }));
            }}
            hint="Enter 0 or skip if this item has no opening stock yet."
          />
          <StockFieldError
            message={errors.form ?? errors.productId ?? errors.quantity}
          />
        </div>

      </form>
    </StockDialog>
  );
}
