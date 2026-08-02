"use client";

import { StockDialog } from "@/components/stock/stock-dialog";
import { Button } from "@/components/shared/ui/button";
import type { StockProduct } from "@/types/stock";

interface StockDeleteDialogProps {
  product: StockProduct;
  onConfirm: () => void;
  onClose: () => void;
}

export function StockDeleteDialog({
  product,
  onConfirm,
  onClose,
}: StockDeleteDialogProps) {
  return (
    <StockDialog
      title="Delete Item?"
      description={`This will permanently remove "${product.name}" and all related stock movements.`}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-red-500 text-white hover:bg-red-400"
            onClick={onConfirm}
          >
            Delete Item
          </Button>
        </div>
      }
    >
      <p className="text-sm text-zinc-400">
        Current stock: {product.currentStock.toLocaleString("en-UG")} units.
        This action cannot be undone.
      </p>
    </StockDialog>
  );
}
